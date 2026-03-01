import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakingService } from './matchmaking.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { GamesService } from '../games/games.service';
import { BadRequestException } from '@nestjs/common';
import { TimeControl } from '@prisma/client';

describe('Challenge System', () => {
  let service: MatchmakingService;
  let redisService: RedisService;
  let prismaService: PrismaService;
  let gamesService: GamesService;

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    getClient: jest.fn(() => ({
      zadd: jest.fn(),
      zrem: jest.fn(),
      zrange: jest.fn(() => []),
      keys: jest.fn(() => []),
      del: jest.fn(),
    })),
  };

  const mockPrismaService = {
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

  describe('createChallenge', () => {
    it('should create a challenge successfully', async () => {
      const senderId = 'sender-id';
      const receiverId = 'receiver-id';
      const timeControl = TimeControl.BLITZ;

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: receiverId,
        username: 'receiver',
        isBanned: false,
      });

      mockRedisService.get.mockResolvedValue(null); // No existing challenge

      const challenge = await service.createChallenge(
        senderId,
        receiverId,
        timeControl,
        5,
        3,
        true,
      );

      expect(challenge).toBeDefined();
      expect(challenge.senderId).toBe(senderId);
      expect(challenge.receiverId).toBe(receiverId);
      expect(challenge.timeControl).toBe(timeControl);
      expect(challenge.initialTimeMinutes).toBe(5);
      expect(challenge.incrementSeconds).toBe(3);
      expect(challenge.isRated).toBe(true);
      expect(mockRedisService.set).toHaveBeenCalledTimes(3); // challenge + sender + receiver keys
    });

    it('should throw error when challenging yourself', async () => {
      const userId = 'user-id';

      await expect(
        service.createChallenge(userId, userId, TimeControl.BLITZ, 5, 3, true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when receiver not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createChallenge('sender', 'receiver', TimeControl.BLITZ, 5, 3, true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when receiver is banned', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'receiver',
        username: 'receiver',
        isBanned: true,
      });

      await expect(
        service.createChallenge('sender', 'receiver', TimeControl.BLITZ, 5, 3, true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when pending challenge already exists', async () => {
      const senderId = 'sender-id';
      const receiverId = 'receiver-id';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: receiverId,
        username: 'receiver',
        isBanned: false,
      });

      // Mock existing challenge
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.includes('sent:')) {
          return Promise.resolve('existing-challenge-id');
        }
        if (key.includes('challenge:')) {
          return Promise.resolve(
            JSON.stringify({
              id: 'existing-challenge-id',
              senderId,
              receiverId,
              timeControl: TimeControl.BLITZ,
              initialTimeMinutes: 5,
              incrementSeconds: 3,
              isRated: true,
              createdAt: Date.now(),
              expiresAt: Date.now() + 60000,
            }),
          );
        }
        return Promise.resolve(null);
      });

      await expect(
        service.createChallenge(senderId, receiverId, TimeControl.BLITZ, 5, 3, true),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptChallenge', () => {
    it('should accept challenge and create game', async () => {
      const challengeId = 'challenge-id';
      const senderId = 'sender-id';
      const receiverId = 'receiver-id';
      const gameId = 'game-id';

      const challenge = {
        id: challengeId,
        senderId,
        receiverId,
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(challenge));
      mockGamesService.createGame.mockResolvedValue({ id: gameId });

      const game = await service.acceptChallenge(challengeId, receiverId);

      expect(game).toBeDefined();
      expect(game.id).toBe(gameId);
      expect(mockGamesService.createGame).toHaveBeenCalled();
      expect(mockRedisService.delete).toHaveBeenCalledTimes(3); // Delete challenge keys
    });

    it('should throw error when challenge not found', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.acceptChallenge('invalid-id', 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when user is not the receiver', async () => {
      const challenge = {
        id: 'challenge-id',
        senderId: 'sender-id',
        receiverId: 'receiver-id',
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(challenge));

      await expect(
        service.acceptChallenge('challenge-id', 'wrong-user-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('declineChallenge', () => {
    it('should decline challenge successfully', async () => {
      const challengeId = 'challenge-id';
      const senderId = 'sender-id';
      const receiverId = 'receiver-id';

      const challenge = {
        id: challengeId,
        senderId,
        receiverId,
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(challenge));

      await service.declineChallenge(challengeId, receiverId);

      expect(mockRedisService.delete).toHaveBeenCalledTimes(3); // Delete challenge keys
    });

    it('should throw error when challenge not found', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.declineChallenge('invalid-id', 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when user is not the receiver', async () => {
      const challenge = {
        id: 'challenge-id',
        senderId: 'sender-id',
        receiverId: 'receiver-id',
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(challenge));

      await expect(
        service.declineChallenge('challenge-id', 'wrong-user-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getReceivedChallenges', () => {
    it('should return received challenges', async () => {
      const userId = 'user-id';
      const challenge = {
        id: 'challenge-id',
        senderId: 'sender-id',
        receiverId: userId,
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisService.get.mockImplementation((key: string) => {
        if (key.includes('received:')) {
          return Promise.resolve('challenge-id');
        }
        if (key.includes('challenge:')) {
          return Promise.resolve(JSON.stringify(challenge));
        }
        return Promise.resolve(null);
      });

      const challenges = await service.getReceivedChallenges(userId);

      expect(challenges).toHaveLength(1);
      expect(challenges[0].id).toBe('challenge-id');
    });

    it('should return empty array when no challenges', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const challenges = await service.getReceivedChallenges('user-id');

      expect(challenges).toHaveLength(0);
    });
  });

  describe('getSentChallenges', () => {
    it('should return sent challenges', async () => {
      const userId = 'user-id';
      const challenge = {
        id: 'challenge-id',
        senderId: userId,
        receiverId: 'receiver-id',
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisService.get.mockImplementation((key: string) => {
        if (key.includes('sent:')) {
          return Promise.resolve('challenge-id');
        }
        if (key.includes('challenge:')) {
          return Promise.resolve(JSON.stringify(challenge));
        }
        return Promise.resolve(null);
      });

      const challenges = await service.getSentChallenges(userId);

      expect(challenges).toHaveLength(1);
      expect(challenges[0].id).toBe('challenge-id');
    });

    it('should return empty array when no challenges', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const challenges = await service.getSentChallenges('user-id');

      expect(challenges).toHaveLength(0);
    });
  });

  describe('Challenge expiration', () => {
    it('should expire challenge after 60 seconds', async () => {
      const senderId = 'sender-id';
      const receiverId = 'receiver-id';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: receiverId,
        username: 'receiver',
        isBanned: false,
      });

      mockRedisService.get.mockResolvedValue(null);

      const challenge = await service.createChallenge(
        senderId,
        receiverId,
        TimeControl.BLITZ,
        5,
        3,
        true,
      );

      // Verify TTL is set to 60 seconds
      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining('challenge:'),
        expect.any(String),
        60,
      );

      // Verify expiration time is approximately 60 seconds from now
      const expirationDiff = challenge.expiresAt - challenge.createdAt;
      expect(expirationDiff).toBeGreaterThanOrEqual(59000);
      expect(expirationDiff).toBeLessThanOrEqual(61000);
    });
  });
});
