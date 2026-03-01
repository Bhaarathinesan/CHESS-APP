import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeControl, GameResult } from '@prisma/client';

interface RatingCalculationInput {
  playerRating: number;
  opponentRating: number;
  kFactor: number;
  result: number; // 1 for win, 0.5 for draw, 0 for loss
}

interface RatingUpdateInput {
  userId: string;
  opponentId: string;
  timeControl: TimeControl;
  result: GameResult;
  gameId: string;
}

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate expected score using standard ELO formula
   * Formula: 1 / (1 + 10^((opponent_rating - player_rating) / 400))
   * Validates: Requirements 8.11
   */
  calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  /**
   * Calculate rating change using ELO formula
   * Formula: K * (actual_score - expected_score)
   * Validates: Requirements 8.11
   */
  calculateEloChange(input: RatingCalculationInput): number {
    const { playerRating, opponentRating, kFactor, result } = input;
    const expectedScore = this.calculateExpectedScore(playerRating, opponentRating);
    const ratingChange = Math.round(kFactor * (result - expectedScore));
    return ratingChange;
  }

  /**
   * Determine K-factor based on player experience and rating
   * - K=40 for players with < 30 games
   * - K=20 for players with >= 30 games and rating < 2400
   * - K=10 for players with rating >= 2400
   * Validates: Requirements 8.2, 8.3, 8.4
   */
  getKFactor(gamesPlayed: number, rating: number): number {
    if (gamesPlayed < 30) {
      return 40;
    } else if (rating >= 2400) {
      return 10;
    } else {
      return 20;
    }
  }

  /**
   * Get or create rating record for a user and time control
   * New players start at 1200 rating (Requirement 8.1)
   */
  async getOrCreateRating(userId: string, timeControl: TimeControl) {
    let rating = await this.prisma.rating.findUnique({
      where: {
        userId_timeControl: {
          userId,
          timeControl,
        },
      },
    });

    if (!rating) {
      rating = await this.prisma.rating.create({
        data: {
          userId,
          timeControl,
          rating: 1200,
          peakRating: 1200,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          isProvisional: true,
          kFactor: 40,
        },
      });
      this.logger.log(`Created new rating record for user ${userId}, time control ${timeControl}`);
    }

    return rating;
  }

  /**
   * Update ratings for both players after a rated game completes
   * Validates: Requirements 8.5, 8.6, 8.7
   */
  async updateRatingsAfterGame(input: RatingUpdateInput): Promise<void> {
    const { userId, opponentId, timeControl, result, gameId } = input;

    // Get game to determine player colors
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { whitePlayerId: true, blackPlayerId: true },
    });

    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Get or create rating records for both players
    const [playerRating, opponentRating] = await Promise.all([
      this.getOrCreateRating(userId, timeControl),
      this.getOrCreateRating(opponentId, timeControl),
    ]);

    // Determine actual scores based on game result and player colors
    let playerScore: number;
    let opponentScore: number;

    if (result === GameResult.WHITE_WIN) {
      if (game.whitePlayerId === userId) {
        playerScore = 1;
        opponentScore = 0;
      } else {
        playerScore = 0;
        opponentScore = 1;
      }
    } else if (result === GameResult.BLACK_WIN) {
      if (game.whitePlayerId === userId) {
        playerScore = 0;
        opponentScore = 1;
      } else {
        playerScore = 1;
        opponentScore = 0;
      }
    } else {
      // Draw
      playerScore = 0.5;
      opponentScore = 0.5;
    }

    // Calculate K-factors
    const playerKFactor = this.getKFactor(playerRating.gamesPlayed, playerRating.rating);
    const opponentKFactor = this.getKFactor(opponentRating.gamesPlayed, opponentRating.rating);

    // Calculate rating changes
    const playerRatingChange = this.calculateEloChange({
      playerRating: playerRating.rating,
      opponentRating: opponentRating.rating,
      kFactor: playerKFactor,
      result: playerScore,
    });

    const opponentRatingChange = this.calculateEloChange({
      playerRating: opponentRating.rating,
      opponentRating: playerRating.rating,
      kFactor: opponentKFactor,
      result: opponentScore,
    });

    // Calculate new ratings (minimum 100)
    const playerNewRating = Math.max(100, playerRating.rating + playerRatingChange);
    const opponentNewRating = Math.max(100, opponentRating.rating + opponentRatingChange);

    // Update game statistics
    const playerNewGamesPlayed = playerRating.gamesPlayed + 1;
    const opponentNewGamesPlayed = opponentRating.gamesPlayed + 1;

    const playerNewWins = playerRating.wins + (playerScore === 1 ? 1 : 0);
    const playerNewLosses = playerRating.losses + (playerScore === 0 ? 1 : 0);
    const playerNewDraws = playerRating.draws + (playerScore === 0.5 ? 1 : 0);

    const opponentNewWins = opponentRating.wins + (opponentScore === 1 ? 1 : 0);
    const opponentNewLosses = opponentRating.losses + (opponentScore === 0 ? 1 : 0);
    const opponentNewDraws = opponentRating.draws + (opponentScore === 0.5 ? 1 : 0);

    // Determine if ratings are still provisional (< 20 games)
    const playerIsProvisional = playerNewGamesPlayed < 20;
    const opponentIsProvisional = opponentNewGamesPlayed < 20;

    // Calculate new K-factors for next games
    const playerNewKFactor = this.getKFactor(playerNewGamesPlayed, playerNewRating);
    const opponentNewKFactor = this.getKFactor(opponentNewGamesPlayed, opponentNewRating);

    // Update peak ratings
    const playerNewPeakRating = Math.max(playerRating.peakRating, playerNewRating);
    const opponentNewPeakRating = Math.max(opponentRating.peakRating, opponentNewRating);

    // Determine rating before/after for white and black players
    const whiteRatingBefore = game.whitePlayerId === userId ? playerRating.rating : opponentRating.rating;
    const blackRatingBefore = game.whitePlayerId === userId ? opponentRating.rating : playerRating.rating;
    const whiteRatingAfter = game.whitePlayerId === userId ? playerNewRating : opponentNewRating;
    const blackRatingAfter = game.whitePlayerId === userId ? opponentNewRating : playerNewRating;

    // Perform all updates in a transaction
    await this.prisma.$transaction([
      // Update player rating
      this.prisma.rating.update({
        where: {
          userId_timeControl: {
            userId,
            timeControl,
          },
        },
        data: {
          rating: playerNewRating,
          peakRating: playerNewPeakRating,
          gamesPlayed: playerNewGamesPlayed,
          wins: playerNewWins,
          losses: playerNewLosses,
          draws: playerNewDraws,
          isProvisional: playerIsProvisional,
          kFactor: playerNewKFactor,
        },
      }),
      // Update opponent rating
      this.prisma.rating.update({
        where: {
          userId_timeControl: {
            userId: opponentId,
            timeControl,
          },
        },
        data: {
          rating: opponentNewRating,
          peakRating: opponentNewPeakRating,
          gamesPlayed: opponentNewGamesPlayed,
          wins: opponentNewWins,
          losses: opponentNewLosses,
          draws: opponentNewDraws,
          isProvisional: opponentIsProvisional,
          kFactor: opponentNewKFactor,
        },
      }),
      // Record player rating history
      this.prisma.ratingHistory.create({
        data: {
          userId,
          timeControl,
          ratingBefore: playerRating.rating,
          ratingAfter: playerNewRating,
          ratingChange: playerRatingChange,
          gameId,
        },
      }),
      // Record opponent rating history
      this.prisma.ratingHistory.create({
        data: {
          userId: opponentId,
          timeControl,
          ratingBefore: opponentRating.rating,
          ratingAfter: opponentNewRating,
          ratingChange: opponentRatingChange,
          gameId,
        },
      }),
      // Update game with rating information
      this.prisma.game.update({
        where: { id: gameId },
        data: {
          whiteRatingBefore,
          blackRatingBefore,
          whiteRatingAfter,
          blackRatingAfter,
        },
      }),
    ]);

    this.logger.log(
      `Updated ratings for game ${gameId}: ` +
      `Player ${userId}: ${playerRating.rating} -> ${playerNewRating} (${playerRatingChange >= 0 ? '+' : ''}${playerRatingChange}), ` +
      `Opponent ${opponentId}: ${opponentRating.rating} -> ${opponentNewRating} (${opponentRatingChange >= 0 ? '+' : ''}${opponentRatingChange})`
    );
  }

  /**
   * Get rating history for a user and time control
   */
  async getRatingHistory(userId: string, timeControl: TimeControl, limit = 50) {
    return this.prisma.ratingHistory.findMany({
      where: {
        userId,
        timeControl,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        game: {
          select: {
            id: true,
            whitePlayerId: true,
            blackPlayerId: true,
            result: true,
            completedAt: true,
          },
        },
      },
    });
  }

  /**
   * Get current ratings for a user across all time controls
   */
  async getUserRatings(userId: string) {
    return this.prisma.rating.findMany({
      where: { userId },
      orderBy: { timeControl: 'asc' },
    });
  }

  /**
   * Get leaderboard for a specific time control
   */
  async getLeaderboard(timeControl: TimeControl, limit = 100) {
    return this.prisma.rating.findMany({
      where: { timeControl },
      orderBy: { rating: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            country: true,
          },
        },
      },
    });
  }
}
