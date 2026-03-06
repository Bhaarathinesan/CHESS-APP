import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeControl } from '@prisma/client';

export interface RollbackRatingsDto {
  userId: string;
  gameIds?: string[];
  fromDate?: Date;
  toDate?: Date;
}

@Injectable()
export class RatingRollbackService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rollback rating changes from specific games
   * Requirements: 24.17
   */
  async rollbackRatingsFromGames(
    userId: string,
    gameIds: string[],
  ): Promise<any> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!gameIds || gameIds.length === 0) {
      throw new BadRequestException('No game IDs provided');
    }

    // Get rating history entries for these games
    const ratingHistoryEntries = await this.prisma.ratingHistory.findMany({
      where: {
        userId,
        gameId: {
          in: gameIds,
        },
      },
      include: {
        game: {
          select: {
            id: true,
            timeControl: true,
            whitePlayerId: true,
            blackPlayerId: true,
            result: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (ratingHistoryEntries.length === 0) {
      throw new BadRequestException('No rating changes found for these games');
    }

    // Group by time control
    const rollbacksByTimeControl: Record<string, any[]> = {};
    for (const entry of ratingHistoryEntries) {
      const tc = entry.timeControl;
      if (!rollbacksByTimeControl[tc]) {
        rollbacksByTimeControl[tc] = [];
      }
      rollbacksByTimeControl[tc].push(entry);
    }

    const results = [];

    // Process each time control
    for (const [timeControl, entries] of Object.entries(
      rollbacksByTimeControl,
    )) {
      // Calculate total rating change to reverse
      const totalRatingChange = entries.reduce(
        (sum, entry) => sum + entry.ratingChange,
        0,
      );

      // Get current rating
      const currentRating = await this.prisma.rating.findUnique({
        where: {
          userId_timeControl: {
            userId,
            timeControl: timeControl as TimeControl,
          },
        },
      });

      if (!currentRating) {
        continue;
      }

      // Calculate new rating (reverse the changes)
      const newRating = Math.max(100, currentRating.rating - totalRatingChange);

      // Update rating
      await this.prisma.rating.update({
        where: {
          userId_timeControl: {
            userId,
            timeControl: timeControl as TimeControl,
          },
        },
        data: {
          rating: newRating,
        },
      });

      // Create rollback history entry
      await this.prisma.ratingHistory.create({
        data: {
          userId,
          timeControl: timeControl as TimeControl,
          ratingBefore: currentRating.rating,
          ratingAfter: newRating,
          ratingChange: -totalRatingChange,
          gameId: null, // No game associated with rollback
        },
      });

      results.push({
        timeControl,
        gamesAffected: entries.length,
        ratingBefore: currentRating.rating,
        ratingAfter: newRating,
        ratingChange: -totalRatingChange,
      });
    }

    return {
      userId,
      rollbacks: results,
      totalGamesAffected: ratingHistoryEntries.length,
    };
  }

  /**
   * Rollback all rating changes for a user within a date range
   * Requirements: 24.17
   */
  async rollbackRatingsFromDateRange(
    userId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<any> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate date range
    if (fromDate >= toDate) {
      throw new BadRequestException('Invalid date range');
    }

    // Get all games in date range
    const games = await this.prisma.game.findMany({
      where: {
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        completedAt: {
          gte: fromDate,
          lte: toDate,
        },
        isRated: true,
      },
      select: {
        id: true,
      },
    });

    const gameIds = games.map((g) => g.id);

    if (gameIds.length === 0) {
      throw new BadRequestException('No rated games found in date range');
    }

    // Use the game-based rollback
    return this.rollbackRatingsFromGames(userId, gameIds);
  }

  /**
   * Rollback all rating changes for a user against a specific opponent
   * Requirements: 24.17
   */
  async rollbackRatingsAgainstOpponent(
    userId: string,
    opponentId: string,
  ): Promise<any> {
    // Check if users exist
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const opponent = await this.prisma.user.findUnique({
      where: { id: opponentId },
    });

    if (!user || !opponent) {
      throw new NotFoundException('User or opponent not found');
    }

    // Get all games between these users
    const games = await this.prisma.game.findMany({
      where: {
        OR: [
          { whitePlayerId: userId, blackPlayerId: opponentId },
          { whitePlayerId: opponentId, blackPlayerId: userId },
        ],
        isRated: true,
      },
      select: {
        id: true,
      },
    });

    const gameIds = games.map((g) => g.id);

    if (gameIds.length === 0) {
      throw new BadRequestException('No rated games found against this opponent');
    }

    // Use the game-based rollback
    return this.rollbackRatingsFromGames(userId, gameIds);
  }

  /**
   * Get preview of rating rollback without applying changes
   * Requirements: 24.17
   */
  async previewRollback(userId: string, gameIds: string[]): Promise<any> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!gameIds || gameIds.length === 0) {
      throw new BadRequestException('No game IDs provided');
    }

    // Get rating history entries for these games
    const ratingHistoryEntries = await this.prisma.ratingHistory.findMany({
      where: {
        userId,
        gameId: {
          in: gameIds,
        },
      },
      include: {
        game: {
          select: {
            id: true,
            timeControl: true,
            result: true,
            completedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (ratingHistoryEntries.length === 0) {
      return {
        userId,
        preview: [],
        totalGamesAffected: 0,
      };
    }

    // Group by time control
    const previewByTimeControl: Record<string, any> = {};
    for (const entry of ratingHistoryEntries) {
      const tc = entry.timeControl;
      if (!previewByTimeControl[tc]) {
        previewByTimeControl[tc] = {
          timeControl: tc,
          gamesAffected: 0,
          totalRatingChange: 0,
          games: [],
        };
      }
      previewByTimeControl[tc].gamesAffected++;
      previewByTimeControl[tc].totalRatingChange += entry.ratingChange;
      previewByTimeControl[tc].games.push({
        gameId: entry.gameId,
        ratingChange: entry.ratingChange,
        completedAt: entry.game?.completedAt,
      });
    }

    // Get current ratings
    const preview = [];
    for (const [timeControl, data] of Object.entries(previewByTimeControl)) {
      const currentRating = await this.prisma.rating.findUnique({
        where: {
          userId_timeControl: {
            userId,
            timeControl: timeControl as TimeControl,
          },
        },
      });

      if (currentRating) {
        preview.push({
          ...data,
          currentRating: currentRating.rating,
          newRating: Math.max(100, currentRating.rating - data.totalRatingChange),
          ratingChange: -data.totalRatingChange,
        });
      }
    }

    return {
      userId,
      preview,
      totalGamesAffected: ratingHistoryEntries.length,
    };
  }
}
