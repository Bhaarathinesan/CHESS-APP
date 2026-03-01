import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakingService } from './matchmaking.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { GamesService } from '../games/games.service';
import { BadRequestException } from '@nestjs/common';
import { TimeControl } from '@prisma/client';

describe('MatchmakingService - Rematch Functionality', () => {
  let service: MatchmakingService;
  let redisService: RedisService;
  let prismaService: PrismaService;
  let gamesService: GamesService;
  let mockRedisClient: any;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getClient: jest.fn(),
  };

  const mockPrismaService = {
    game: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    rating: {
      findUnique: jest.fn(),
    },
  };

  const mockGamesService = {
    createGame: jest.fn(),
  };

  beforeEach(async () => {
    // Create a fresh mock client for each test
    mockRedisClient = {
      keys: jest.fn().mockResolvedValue([]),
    };
    mockRedisService.getClient.mockReturnValue(mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: GamesService, useValue: mockGamesService },
      ],
    }).compile();

    service = module.get<MatchmakingService>(MatchmakingService);
    redisService = module.get<RedisService>(RedisService);
    prismaService = module.get<PrismaService>(PrismaService);
    gamesService = module.get<GamesService>(GamesService);

    jest.clearAllMocks();
  });

  describe('createRematchOffer', () => {
    const gameId = 'game-123';
    const senderId = 'user-1';
    const receiverId = 'user-2';

    const completedGame = {
      id: gameId,
      whitePlayerId: senderId,
      blackPlayerId: receiverId,
      status: 'COMPLETED',
      timeControl: TimeControl.BLITZ,
      initialTimeMinutes: 5,
      incrementSeconds: 3,
      isRated: true,
    };

    it('should create rematch offer successfully', async () => {
      mockPrismaService.game.findUnique.mockResolvedValue(completedGame);
      mockRedisClient.keys.mockResolvedValue([]);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.createRematchOffer(gameId, senderId);

      expect(result).toMatchObject({
        gameId,
        senderId,
        receiverId,
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true,
      });
      expect(result.id).toContain('rematch-');
      expect(result.expiresAt).toBeGreaterThan(result.createdAt);
      expect(mockRedisService.set).toHaveBeenCalledTimes(3); // rematch + sender + receiver keys
    });

    it('should throw error if game not found', async () => {
      mockPrismaService.game.findUnique.mockResolvedValue(null);

      await expect(
        service.createRematchOffer(gameId, senderId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createRematchOffer(gameId, senderId),
      ).rejects.toThrow('Game not found');
    });

    it('should throw error if game is not completed', async () => {
      mockPrismaService.game.findUnique.mockResolvedValue({
        ...completedGame,
        status: 'ACTIVE',
      });

      await expect(
        service.createRematchOffer(gameId, senderId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createRematchOffer(gameId, senderId),
      ).rejects.toThrow('Game is not completed');
    });

    it('should throw error if sender is not a player in the game', async () => {
      mockPrismaService.game.findUnique.mockResolvedValue(completedGame);

      await expect(
        service.createRematchOffer(gameId, 'user-3'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createRematchOffer(gameId, 'user-3'),
      ).rejects.toThrow('You are not a player in this game');
    });

    it('should throw error if rematch offer already exists', async () => {
      const existingRematch = {
        id: 'existing-rematch-id',
        gameId,
        senderId,
        receiverId,
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockPrismaService.game.findUnique.mockResolvedValue(completedGame);
      // Mock keys to return a key
      mockRedisClient.keys.mockResolvedValue(['user:rematch:sent:user-1:game-123']);
      // Mock get to return the rematch ID first, then the rematch offer
      mockRedisService.get
        .mockResolvedValueOnce('existing-rematch-id') // First call in getPendingRematch
        .mockResolvedValueOnce(JSON.stringify(existingRematch)); // Second call in getRematchOffer

      await expect(
        service.createRematchOffer(gameId, senderId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set 60-second TTL on rematch offer', async () => {
      mockPrismaService.game.findUnique.mockResolvedValue(completedGame);
      mockRedisClient.keys.mockResolvedValue([]);
      mockRedisService.set.mockResolvedValue('OK');

      await service.createRematchOffer(gameId, senderId);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining('rematch:'),
        expect.any(String),
        60,
      );
    });
  });

  describe('acceptRematchOffer', () => {
    const rematchId = 'rematch-123';
    const gameId = 'game-123';
    const senderId = 'user-1';
    const receiverId = 'user-2';

    const rematchOffer = {
      id: rematchId,
      gameId,
      senderId,
      receiverId,
      timeControl: TimeControl.BLITZ,
      initialTimeMinutes: 5,
      incrementSeconds: 3,
      isRated: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    };

    const originalGame = {
      whitePlayerId: senderId,
      blackPlayerId: receiverId,
    };

    const newGame = {
      id: 'new-game-123',
      whitePlayerId: receiverId, // Colors swapped
      blackPlayerId: senderId,
      timeControl: TimeControl.BLITZ,
      status: 'PENDING',
    };

    it('should accept rematch and create new game with swapped colors', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(rematchOffer));
      mockPrismaService.game.findUnique.mockResolvedValue(originalGame);
      mockGamesService.createGame.mockResolvedValue(newGame);
      mockRedisService.delete.mockResolvedValue(1);

      const result = await service.acceptRematchOffer(rematchId, receiverId);

      expect(result).toEqual(newGame);
      expect(mockGamesService.createGame).toHaveBeenCalledWith(
        {
          whitePlayerId: receiverId, // Swapped
          blackPlayerId: senderId, // Swapped
          timeControl: TimeControl.BLITZ,
          initialTimeMinutes: 5,
          incrementSeconds: 3,
          isRated: true,
        },
        senderId,
      );
      expect(mockRedisService.delete).toHaveBeenCalledTimes(3); // rematch + sender + receiver keys
    });

    it('should throw error if rematch offer not found', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.acceptRematchOffer(rematchId, receiverId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.acceptRematchOffer(rematchId, receiverId),
      ).rejects.toThrow('Rematch offer not found or expired');
    });

    it('should throw error if user is not the receiver', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(rematchOffer));

      await expect(
        service.acceptRematchOffer(rematchId, senderId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.acceptRematchOffer(rematchId, senderId),
      ).rejects.toThrow('You are not the receiver of this rematch offer');
    });

    it('should throw error if original game not found', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(rematchOffer));
      mockPrismaService.game.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptRematchOffer(rematchId, receiverId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.acceptRematchOffer(rematchId, receiverId),
      ).rejects.toThrow('Original game not found');
    });
  });

  describe('declineRematchOffer', () => {
    const rematchId = 'rematch-123';
    const receiverId = 'user-2';

    const rematchOffer = {
      id: rematchId,
      gameId: 'game-123',
      senderId: 'user-1',
      receiverId,
      timeControl: TimeControl.BLITZ,
      initialTimeMinutes: 5,
      incrementSeconds: 3,
      isRated: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    };

    it('should decline rematch offer successfully', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(rematchOffer));
      mockRedisService.delete.mockResolvedValue(1);

      await service.declineRematchOffer(rematchId, receiverId);

      expect(mockRedisService.delete).toHaveBeenCalledTimes(3);
    });

    it('should throw error if rematch offer not found', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.declineRematchOffer(rematchId, receiverId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.declineRematchOffer(rematchId, receiverId),
      ).rejects.toThrow('Rematch offer not found or expired');
    });

    it('should throw error if user is not the receiver', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(rematchOffer));

      await expect(
        service.declineRematchOffer(rematchId, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.declineRematchOffer(rematchId, 'user-1'),
      ).rejects.toThrow('You are not the receiver of this rematch offer');
    });
  });

  describe('getRematchOffer', () => {
    const rematchId = 'rematch-123';
    const rematchOffer = {
      id: rematchId,
      gameId: 'game-123',
      senderId: 'user-1',
      receiverId: 'user-2',
      timeControl: TimeControl.BLITZ,
      initialTimeMinutes: 5,
      incrementSeconds: 3,
      isRated: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    };

    it('should return rematch offer if exists', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(rematchOffer));

      const result = await service.getRematchOffer(rematchId);

      expect(result).toEqual(rematchOffer);
    });

    it('should return null if rematch offer not found', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getRematchOffer(rematchId);

      expect(result).toBeNull();
    });
  });

  describe('getReceivedRematchOffers', () => {
    const userId = 'user-2';

    it('should return received rematch offers', async () => {
      const rematchOffer = {
        id: 'rematch-123',
        gameId: 'game-123',
        senderId: 'user-1',
        receiverId: userId,
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisClient.keys.mockResolvedValue([
        'user:rematch:received:user-2:game-123',
      ]);
      mockRedisService.get
        .mockResolvedValueOnce('rematch-123')
        .mockResolvedValueOnce(JSON.stringify(rematchOffer));

      const result = await service.getReceivedRematchOffers(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(rematchOffer);
    });

    it('should return empty array if no rematch offers', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await service.getReceivedRematchOffers(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getSentRematchOffers', () => {
    const userId = 'user-1';

    it('should return sent rematch offers', async () => {
      const rematchOffer = {
        id: 'rematch-123',
        gameId: 'game-123',
        senderId: userId,
        receiverId: 'user-2',
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisClient.keys.mockResolvedValue([
        'user:rematch:sent:user-1:game-123',
      ]);
      mockRedisService.get
        .mockResolvedValueOnce('rematch-123')
        .mockResolvedValueOnce(JSON.stringify(rematchOffer));

      const result = await service.getSentRematchOffers(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(rematchOffer);
    });

    it('should return empty array if no rematch offers', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await service.getSentRematchOffers(userId);

      expect(result).toEqual([]);
    });
  });
});
