import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardsService } from './leaderboards.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TimeControl } from '@prisma/client';

describe('LeaderboardsService', () => {
  let service: LeaderboardsService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrismaService = {
    rating: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    ratingHistory: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    deletePattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<LeaderboardsService>(LeaderboardsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGlobalLeaderboard', () => {
    it('should return cached leaderboard if available', async () => {
      const cachedData = {
        leaderboard: [
          {
            rank: 1,
            userId: 'user1',
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: null,
            rating: 1800,
            gamesPlayed: 50,
            ratingTrend: 'up',
          },
        ],
        total: 1,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getGlobalLeaderboard(TimeControl.BLITZ, 1, 100);

      expect(result).toEqual(cachedData);
      expect(redis.get).toHaveBeenCalledWith('leaderboard:global:BLITZ:1:100');
      expect(prisma.rating.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.rating.findMany.mockResolvedValue([
        {
          userId: 'user1',
          rating: 1800,
          gamesPlayed: 50,
          user: {
            id: 'user1',
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: null,
            collegeName: 'Test College',
            collegeDomain: 'test.edu',
          },
        },
      ]);
      mockPrismaService.rating.count.mockResolvedValue(1);
      mockPrismaService.ratingHistory.findMany.mockResolvedValue([
        { ratingChange: 20 },
        { ratingChange: 15 },
      ]);

      const result = await service.getGlobalLeaderboard(TimeControl.BLITZ, 1, 100);

      expect(result.leaderboard).toHaveLength(1);
      expect(result.leaderboard[0].rank).toBe(1);
      expect(result.leaderboard[0].rating).toBe(1800);
      expect(result.leaderboard[0].ratingTrend).toBe('up');
      expect(result.total).toBe(1);
      expect(redis.set).toHaveBeenCalled();
    });

    it('should only include players with minimum 20 games', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.rating.findMany.mockResolvedValue([]);
      mockPrismaService.rating.count.mockResolvedValue(0);

      await service.getGlobalLeaderboard(TimeControl.BLITZ, 1, 100);

      expect(prisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gamesPlayed: { gte: 20 },
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.rating.findMany.mockResolvedValue([]);
      mockPrismaService.rating.count.mockResolvedValue(0);

      await service.getGlobalLeaderboard(TimeControl.BLITZ, 2, 50);

      expect(prisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 50,
        }),
      );
    });
  });

  describe('getCollegeLeaderboard', () => {
    it('should filter by college domain', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.rating.findMany.mockResolvedValue([]);
      mockPrismaService.rating.count.mockResolvedValue(0);

      await service.getCollegeLeaderboard(TimeControl.BLITZ, 'test.edu', 1, 100);

      expect(prisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: {
              collegeDomain: 'test.edu',
            },
          }),
        }),
      );
    });

    it('should return cached college leaderboard if available', async () => {
      const cachedData = {
        leaderboard: [
          {
            rank: 1,
            userId: 'user1',
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: null,
            rating: 1800,
            gamesPlayed: 50,
            ratingTrend: 'up',
            collegeName: 'Test College',
            collegeDomain: 'test.edu',
          },
        ],
        total: 1,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getCollegeLeaderboard(
        TimeControl.BLITZ,
        'test.edu',
        1,
        100,
      );

      expect(result).toEqual(cachedData);
      expect(redis.get).toHaveBeenCalledWith(
        'leaderboard:college:BLITZ:test.edu:1:100',
      );
    });
  });

  describe('getWeeklyLeaderboard', () => {
    it('should return top performers from last 7 days', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.ratingHistory.groupBy.mockResolvedValue([
        {
          userId: 'user1',
          _sum: { ratingChange: 100 },
        },
      ]);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user1',
        username: 'player1',
        displayName: 'Player One',
        avatarUrl: null,
        collegeName: 'Test College',
        collegeDomain: 'test.edu',
      });
      mockPrismaService.rating.findUnique.mockResolvedValue({
        rating: 1800,
        gamesPlayed: 50,
      });

      const result = await service.getWeeklyLeaderboard(TimeControl.BLITZ, 100);

      expect(result).toHaveLength(1);
      expect(result[0].rank).toBe(1);
      expect(result[0].ratingTrend).toBe('up');
      expect(prisma.ratingHistory.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        }),
      );
    });

    it('should cache weekly leaderboard results', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.ratingHistory.groupBy.mockResolvedValue([]);

      await service.getWeeklyLeaderboard(TimeControl.BLITZ, 100);

      expect(redis.set).toHaveBeenCalledWith(
        'leaderboard:weekly:BLITZ:100',
        expect.any(String),
        300,
      );
    });
  });

  describe('updateLeaderboardCache', () => {
    it('should invalidate relevant cache patterns', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        collegeDomain: 'test.edu',
      });

      await service.updateLeaderboardCache('user1', TimeControl.BLITZ);

      expect(redis.deletePattern).toHaveBeenCalledWith('leaderboard:global:BLITZ:*');
      expect(redis.deletePattern).toHaveBeenCalledWith('leaderboard:weekly:BLITZ:*');
      expect(redis.deletePattern).toHaveBeenCalledWith(
        'leaderboard:college:BLITZ:test.edu:*',
      );
    });

    it('should handle user not found gracefully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await service.updateLeaderboardCache('user1', TimeControl.BLITZ);

      expect(redis.deletePattern).toHaveBeenCalledTimes(2); // Only global and weekly
    });
  });

  describe('searchPlayer', () => {
    it('should find player and calculate rank', async () => {
      mockPrismaService.rating.findFirst.mockResolvedValue({
        userId: 'user1',
        rating: 1800,
        gamesPlayed: 50,
        user: {
          id: 'user1',
          username: 'player1',
          displayName: 'Player One',
          avatarUrl: null,
          collegeName: 'Test College',
          collegeDomain: 'test.edu',
        },
      });
      mockPrismaService.rating.count.mockResolvedValue(5); // 5 players above
      mockPrismaService.ratingHistory.findMany.mockResolvedValue([
        { ratingChange: 10 },
        { ratingChange: 5 },
      ]);

      const result = await service.searchPlayer('player1', TimeControl.BLITZ);

      expect(result).not.toBeNull();
      expect(result?.rank).toBe(6); // 5 above + 1
      expect(result?.username).toBe('player1');
      expect(result?.ratingTrend).toBe('up');
    });

    it('should return null if player not found', async () => {
      mockPrismaService.rating.findFirst.mockResolvedValue(null);

      const result = await service.searchPlayer('nonexistent', TimeControl.BLITZ);

      expect(result).toBeNull();
    });

    it('should search case-insensitively', async () => {
      mockPrismaService.rating.findFirst.mockResolvedValue(null);

      await service.searchPlayer('PLAYER1', TimeControl.BLITZ);

      expect(prisma.rating.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: {
              username: {
                contains: 'PLAYER1',
                mode: 'insensitive',
              },
            },
          }),
        }),
      );
    });
  });

  describe('getRatingTrend', () => {
    it('should return "up" for positive trend', async () => {
      mockPrismaService.ratingHistory.findMany.mockResolvedValue([
        { ratingChange: 20 },
        { ratingChange: 15 },
        { ratingChange: 10 },
      ]);

      const trend = await (service as any).getRatingTrend('user1', TimeControl.BLITZ);

      expect(trend).toBe('up');
    });

    it('should return "down" for negative trend', async () => {
      mockPrismaService.ratingHistory.findMany.mockResolvedValue([
        { ratingChange: -20 },
        { ratingChange: -15 },
        { ratingChange: -10 },
      ]);

      const trend = await (service as any).getRatingTrend('user1', TimeControl.BLITZ);

      expect(trend).toBe('down');
    });

    it('should return "stable" for small changes', async () => {
      mockPrismaService.ratingHistory.findMany.mockResolvedValue([
        { ratingChange: 2 },
        { ratingChange: -3 },
        { ratingChange: 1 },
      ]);

      const trend = await (service as any).getRatingTrend('user1', TimeControl.BLITZ);

      expect(trend).toBe('stable');
    });

    it('should return "stable" for no history', async () => {
      mockPrismaService.ratingHistory.findMany.mockResolvedValue([]);

      const trend = await (service as any).getRatingTrend('user1', TimeControl.BLITZ);

      expect(trend).toBe('stable');
    });
  });
});
