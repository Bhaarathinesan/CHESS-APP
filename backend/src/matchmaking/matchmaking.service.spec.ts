import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakingService, QueueEntry } from './matchmaking.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { GamesService } from '../games/games.service';
import { TimeControl } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('MatchmakingService', () => {
  let service: MatchmakingService;
  let redisService: RedisService;
  let prismaService: PrismaService;

  const mockRedisClient = {
    zadd: jest.fn(),
    zrange: jest.fn(),
    zrem: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(() => mockRedisClient),
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrismaService = {
    rating: {
      findUnique: jest.fn(),
    },
    game: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
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

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('joinQueue', () => {
    it('should add player to queue with rating and preferences', async () => {
      const userId = 'user-123';
      const timeControl = TimeControl.BLITZ;
      const rating = 1500;

      mockRedisService.get.mockResolvedValue(null); // Not in queue
      mockPrismaService.rating.findUnique.mockResolvedValue({ rating });
      mockPrismaService.game.findFirst.mockResolvedValue(null); // No active games
      mockRedisClient.zadd.mockResolvedValue(1);
      mockRedisClient.zrange.mockResolvedValue([
        JSON.stringify({
          userId,
          rating,
          timeControl,
          ratingRange: 200,
          joinedAt: Date.now(),
        }),
      ]);

      const result = await service.joinQueue(userId, timeControl, 200);

      expect(result).toHaveProperty('position');
      expect(result).toHaveProperty('waitTimeSeconds');
      expect(result).toHaveProperty('queueSize');
      expect(result.position).toBe(1);
      expect(mockRedisClient.zadd).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should throw error if user already in queue', async () => {
      const userId = 'user-123';
      const timeControl = TimeControl.BLITZ;

      mockRedisService.get.mockResolvedValue(TimeControl.RAPID);

      await expect(
        service.joinQueue(userId, timeControl, 200),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default rating 1200 for new players', async () => {
      const userId = 'new-user';
      const timeControl = TimeControl.BULLET;

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.rating.findUnique.mockResolvedValue(null);
      mockPrismaService.game.findFirst.mockResolvedValue(null); // No active games
      mockRedisClient.zadd.mockResolvedValue(1);
      mockRedisClient.zrange.mockResolvedValue([
        JSON.stringify({
          userId,
          rating: 1200,
          timeControl,
          ratingRange: 200,
          joinedAt: Date.now(),
        }),
      ]);

      await service.joinQueue(userId, timeControl);

      const zaddCall = mockRedisClient.zadd.mock.calls[0];
      const entry = JSON.parse(zaddCall[2]);
      expect(entry.rating).toBe(1200);
    });

    it('should throw error if user has active game (Requirements: 7.10)', async () => {
      const userId = 'user-123';
      const timeControl = TimeControl.BLITZ;

      mockRedisService.get.mockResolvedValue(null); // Not in queue
      mockPrismaService.game.findFirst.mockResolvedValue({ id: 'game-123' }); // Has active game

      await expect(
        service.joinQueue(userId, timeControl, 200),
      ).rejects.toThrow('Cannot join matchmaking while in an active game');
    });
  });

  describe('leaveQueue', () => {
    it('should remove player from queue', async () => {
      const userId = 'user-123';
      const timeControl = TimeControl.BLITZ;

      mockRedisService.get.mockResolvedValue(timeControl);
      mockRedisClient.zrange.mockResolvedValue([
        JSON.stringify({
          userId,
          rating: 1500,
          timeControl,
          ratingRange: 200,
          joinedAt: Date.now(),
        }),
      ]);
      mockRedisClient.zrem.mockResolvedValue(1);

      const result = await service.leaveQueue(userId);

      expect(result).toBe(true);
      expect(mockRedisClient.zrem).toHaveBeenCalled();
      expect(mockRedisService.delete).toHaveBeenCalled();
    });

    it('should return false if user not in queue', async () => {
      const userId = 'user-123';

      mockRedisService.get.mockResolvedValue(null);

      const result = await service.leaveQueue(userId);

      expect(result).toBe(false);
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue position and wait time', async () => {
      const userId = 'user-123';
      const timeControl = TimeControl.BLITZ;
      const joinedAt = Date.now() - 10000; // 10 seconds ago

      mockRedisClient.zrange.mockResolvedValue([
        JSON.stringify({
          userId: 'user-1',
          rating: 1400,
          timeControl,
          ratingRange: 200,
          joinedAt: joinedAt - 5000,
        }),
        JSON.stringify({
          userId,
          rating: 1500,
          timeControl,
          ratingRange: 200,
          joinedAt,
        }),
        JSON.stringify({
          userId: 'user-3',
          rating: 1600,
          timeControl,
          ratingRange: 200,
          joinedAt: joinedAt + 5000,
        }),
      ]);

      const result = await service.getQueueStatus(userId, timeControl);

      expect(result.position).toBe(2);
      expect(result.queueSize).toBe(3);
      expect(result.waitTimeSeconds).toBeGreaterThanOrEqual(10);
    });

    it('should throw error if user not in queue', async () => {
      const userId = 'user-123';
      const timeControl = TimeControl.BLITZ;

      mockRedisClient.zrange.mockResolvedValue([]);

      await expect(
        service.getQueueStatus(userId, timeControl),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getQueueEntries', () => {
    it('should return all entries in queue', async () => {
      const timeControl = TimeControl.RAPID;
      const entries = [
        {
          userId: 'user-1',
          rating: 1400,
          timeControl,
          ratingRange: 200,
          joinedAt: Date.now(),
        },
        {
          userId: 'user-2',
          rating: 1500,
          timeControl,
          ratingRange: 200,
          joinedAt: Date.now(),
        },
      ];

      mockRedisClient.zrange.mockResolvedValue(
        entries.map((e) => JSON.stringify(e)),
      );

      const result = await service.getQueueEntries(timeControl);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-1');
      expect(result[1].userId).toBe('user-2');
    });
  });

  describe('getUserQueue', () => {
    it('should return time control if user in queue', async () => {
      const userId = 'user-123';
      const timeControl = TimeControl.BLITZ;

      mockRedisService.get.mockResolvedValue(timeControl);

      const result = await service.getUserQueue(userId);

      expect(result).toBe(timeControl);
    });

    it('should return null if user not in queue', async () => {
      const userId = 'user-123';

      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getUserQueue(userId);

      expect(result).toBeNull();
    });
  });

  describe('clearAllQueues', () => {
    it('should clear all queue and user keys', async () => {
      mockRedisClient.keys
        .mockResolvedValueOnce(['matchmaking:queue:BLITZ'])
        .mockResolvedValueOnce(['matchmaking:user:user-123']);
      mockRedisClient.del.mockResolvedValue(1);

      await service.clearAllQueues();

      expect(mockRedisClient.keys).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('acceptChallenge - Active Game Prevention', () => {
    it('should throw error if receiver has active game (Requirements: 7.10)', async () => {
      const challengeId = 'challenge-123';
      const userId = 'receiver-123';
      const challenge = {
        id: challengeId,
        senderId: 'sender-123',
        receiverId: userId,
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 3,
        incrementSeconds: 2,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(challenge));
      mockPrismaService.game.findFirst.mockResolvedValue({ id: 'active-game' }); // Has active game

      await expect(
        service.acceptChallenge(challengeId, userId),
      ).rejects.toThrow('Cannot accept challenge while in an active game');
    });

    it('should throw error if sender has active game (Requirements: 7.10)', async () => {
      const challengeId = 'challenge-123';
      const userId = 'receiver-123';
      const senderId = 'sender-123';
      const challenge = {
        id: challengeId,
        senderId,
        receiverId: userId,
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 3,
        incrementSeconds: 2,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(challenge));
      mockPrismaService.game.findFirst
        .mockResolvedValueOnce(null) // Receiver has no active game
        .mockResolvedValueOnce({ id: 'active-game' }); // Sender has active game

      await expect(
        service.acceptChallenge(challengeId, userId),
      ).rejects.toThrow('Challenge sender is currently in an active game');
    });
  });

  describe('acceptRematchOffer - Active Game Prevention', () => {
    it('should throw error if receiver has active game (Requirements: 7.10)', async () => {
      const rematchId = 'rematch-123';
      const userId = 'receiver-123';
      const rematchOffer = {
        id: rematchId,
        gameId: 'game-123',
        senderId: 'sender-123',
        receiverId: userId,
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 3,
        incrementSeconds: 2,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(rematchOffer));
      mockPrismaService.game.findFirst.mockResolvedValue({ id: 'active-game' }); // Has active game

      await expect(
        service.acceptRematchOffer(rematchId, userId),
      ).rejects.toThrow('Cannot accept rematch while in an active game');
    });

    it('should throw error if sender has active game (Requirements: 7.10)', async () => {
      const rematchId = 'rematch-123';
      const userId = 'receiver-123';
      const senderId = 'sender-123';
      const rematchOffer = {
        id: rematchId,
        gameId: 'game-123',
        senderId,
        receiverId: userId,
        timeControl: TimeControl.BLITZ,
        initialTimeMinutes: 3,
        incrementSeconds: 2,
        isRated: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(rematchOffer));
      mockPrismaService.game.findFirst
        .mockResolvedValueOnce(null) // Receiver has no active game
        .mockResolvedValueOnce({ id: 'active-game' }); // Sender has active game

      await expect(
        service.acceptRematchOffer(rematchId, userId),
      ).rejects.toThrow('Rematch sender is currently in an active game');
    });
  });
});
