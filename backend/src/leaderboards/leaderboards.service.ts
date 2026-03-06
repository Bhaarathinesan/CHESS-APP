import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TimeControl } from '@prisma/client';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  rating: number;
  gamesPlayed: number;
  ratingTrend: 'up' | 'down' | 'stable';
  collegeName?: string;
  collegeDomain?: string;
}

@Injectable()
export class LeaderboardsService {
  private readonly logger = new Logger(LeaderboardsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly MIN_GAMES = 20;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get global leaderboard for a specific time control
   */
  async getGlobalLeaderboard(
    timeControl: TimeControl,
    page: number = 1,
    limit: number = 100,
  ): Promise<{ leaderboard: LeaderboardEntry[]; total: number }> {
    const cacheKey = `leaderboard:global:${timeControl}:${page}:${limit}`;
    
    // Try to get from cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }

    // Calculate from database
    const skip = (page - 1) * limit;
    
    const [ratings, total] = await Promise.all([
      this.prisma.rating.findMany({
        where: {
          timeControl,
          gamesPlayed: { gte: this.MIN_GAMES },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              collegeName: true,
              collegeDomain: true,
            },
          },
        },
        orderBy: {
          rating: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.rating.count({
        where: {
          timeControl,
          gamesPlayed: { gte: this.MIN_GAMES },
        },
      }),
    ]);

    // Get rating trends
    const leaderboard = await Promise.all(
      ratings.map(async (rating, index) => {
        const trend = await this.getRatingTrend(rating.userId, timeControl);
        return {
          rank: skip + index + 1,
          userId: rating.user.id,
          username: rating.user.username,
          displayName: rating.user.displayName,
          avatarUrl: rating.user.avatarUrl,
          rating: rating.rating,
          gamesPlayed: rating.gamesPlayed,
          ratingTrend: trend,
          collegeName: rating.user.collegeName,
          collegeDomain: rating.user.collegeDomain,
        };
      }),
    );

    const result = { leaderboard, total };

    // Cache the result
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    return result;
  }

  /**
   * Get college-specific leaderboard
   */
  async getCollegeLeaderboard(
    timeControl: TimeControl,
    collegeDomain: string,
    page: number = 1,
    limit: number = 100,
  ): Promise<{ leaderboard: LeaderboardEntry[]; total: number }> {
    const cacheKey = `leaderboard:college:${timeControl}:${collegeDomain}:${page}:${limit}`;
    
    // Try to get from cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }

    // Calculate from database
    const skip = (page - 1) * limit;
    
    const [ratings, total] = await Promise.all([
      this.prisma.rating.findMany({
        where: {
          timeControl,
          gamesPlayed: { gte: this.MIN_GAMES },
          user: {
            collegeDomain,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              collegeName: true,
              collegeDomain: true,
            },
          },
        },
        orderBy: {
          rating: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.rating.count({
        where: {
          timeControl,
          gamesPlayed: { gte: this.MIN_GAMES },
          user: {
            collegeDomain,
          },
        },
      }),
    ]);

    // Get rating trends
    const leaderboard = await Promise.all(
      ratings.map(async (rating, index) => {
        const trend = await this.getRatingTrend(rating.userId, timeControl);
        return {
          rank: skip + index + 1,
          userId: rating.user.id,
          username: rating.user.username,
          displayName: rating.user.displayName,
          avatarUrl: rating.user.avatarUrl,
          rating: rating.rating,
          gamesPlayed: rating.gamesPlayed,
          ratingTrend: trend,
          collegeName: rating.user.collegeName,
          collegeDomain: rating.user.collegeDomain,
        };
      }),
    );

    const result = { leaderboard, total };

    // Cache the result
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    return result;
  }

  /**
   * Get weekly leaderboard (top performers in the last 7 days)
   */
  async getWeeklyLeaderboard(
    timeControl: TimeControl,
    limit: number = 100,
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:weekly:${timeControl}:${limit}`;
    
    // Try to get from cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get rating changes in the last week
    const ratingChanges = await this.prisma.ratingHistory.groupBy({
      by: ['userId'],
      where: {
        timeControl,
        createdAt: { gte: oneWeekAgo },
      },
      _sum: {
        ratingChange: true,
      },
      orderBy: {
        _sum: {
          ratingChange: 'desc',
        },
      },
      take: limit,
    });

    // Get user details and current ratings
    const leaderboard = await Promise.all(
      ratingChanges.map(async (change, index) => {
        const [user, rating] = await Promise.all([
          this.prisma.user.findUnique({
            where: { id: change.userId },
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              collegeName: true,
              collegeDomain: true,
            },
          }),
          this.prisma.rating.findUnique({
            where: {
              userId_timeControl: {
                userId: change.userId,
                timeControl,
              },
            },
          }),
        ]);

        if (!user || !rating) return null;

        return {
          rank: index + 1,
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          rating: rating.rating,
          gamesPlayed: rating.gamesPlayed,
          ratingTrend: 'up' as const,
          collegeName: user.collegeName,
          collegeDomain: user.collegeDomain,
        };
      }),
    );

    const result = leaderboard.filter((entry) => entry !== null) as LeaderboardEntry[];

    // Cache the result
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    return result;
  }

  /**
   * Update leaderboard cache after a game completes
   */
  async updateLeaderboardCache(
    userId: string,
    timeControl: TimeControl,
  ): Promise<void> {
    this.logger.debug(`Updating leaderboard cache for user ${userId}, time control ${timeControl}`);

    // Invalidate relevant caches
    const patterns = [
      `leaderboard:global:${timeControl}:*`,
      `leaderboard:weekly:${timeControl}:*`,
    ];

    // Get user's college domain to invalidate college leaderboard
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { collegeDomain: true },
    });

    if (user) {
      patterns.push(`leaderboard:college:${timeControl}:${user.collegeDomain}:*`);
    }

    // Delete cache keys matching patterns
    for (const pattern of patterns) {
      await this.redis.deletePattern(pattern);
    }

    this.logger.debug(`Leaderboard cache updated for user ${userId}`);
  }

  /**
   * Get rating trend for a user (up, down, or stable)
   */
  private async getRatingTrend(
    userId: string,
    timeControl: TimeControl,
  ): Promise<'up' | 'down' | 'stable'> {
    // Get last 5 rating changes
    const recentChanges = await this.prisma.ratingHistory.findMany({
      where: {
        userId,
        timeControl,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      select: {
        ratingChange: true,
      },
    });

    if (recentChanges.length === 0) return 'stable';

    const totalChange = recentChanges.reduce(
      (sum, change) => sum + change.ratingChange,
      0,
    );

    if (totalChange > 10) return 'up';
    if (totalChange < -10) return 'down';
    return 'stable';
  }

  /**
   * Search for a player on the leaderboard
   */
  async searchPlayer(
    username: string,
    timeControl: TimeControl,
  ): Promise<LeaderboardEntry | null> {
    const rating = await this.prisma.rating.findFirst({
      where: {
        timeControl,
        gamesPlayed: { gte: this.MIN_GAMES },
        user: {
          username: {
            contains: username,
            mode: 'insensitive',
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            collegeName: true,
            collegeDomain: true,
          },
        },
      },
    });

    if (!rating) return null;

    // Calculate rank
    const rank = await this.prisma.rating.count({
      where: {
        timeControl,
        gamesPlayed: { gte: this.MIN_GAMES },
        rating: { gt: rating.rating },
      },
    });

    const trend = await this.getRatingTrend(rating.userId, timeControl);

    return {
      rank: rank + 1,
      userId: rating.user.id,
      username: rating.user.username,
      displayName: rating.user.displayName,
      avatarUrl: rating.user.avatarUrl,
      rating: rating.rating,
      gamesPlayed: rating.gamesPlayed,
      ratingTrend: trend,
      collegeName: rating.user.collegeName,
      collegeDomain: rating.user.collegeDomain,
    };
  }
}
