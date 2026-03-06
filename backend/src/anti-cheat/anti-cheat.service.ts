import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AntiCheatFlagType, AntiCheatFlagStatus } from '@prisma/client';

interface MoveTimeData {
  moveNumber: number;
  timeTakenMs: number;
  isComplex: boolean;
}

interface FocusLossEvent {
  timestamp: Date;
  duration: number;
}

interface MoveAccuracyData {
  moveNumber: number;
  centipawnLoss: number;
  accuracy: number;
}

@Injectable()
export class AntiCheatService {
  private readonly logger = new Logger(AntiCheatService.name);
  
  // Thresholds for detection
  private readonly FAST_MOVE_THRESHOLD_MS = 100;
  private readonly COMPLEX_POSITION_PIECE_COUNT = 20; // Positions with < 20 pieces are complex
  private readonly SUSPICIOUS_FAST_MOVE_COUNT = 5; // Flag if 5+ fast moves in complex positions
  private readonly HIGH_ACCURACY_THRESHOLD = 95; // Suspiciously high accuracy %
  private readonly LOW_CENTIPAWN_LOSS_THRESHOLD = 10; // Average centipawn loss < 10 is suspicious
  private readonly FOCUS_LOSS_THRESHOLD_COUNT = 3; // Flag if 3+ focus losses during game

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track move times and flag suspiciously fast moves in complex positions
   * Requirement 24.10: Track move time for each player to detect suspiciously fast moves
   */
  async trackMoveTime(
    gameId: string,
    userId: string,
    moveNumber: number,
    timeTakenMs: number,
    fenAfter: string,
  ): Promise<void> {
    try {
      // Determine if position is complex (fewer pieces = more complex endgame)
      const pieceCount = this.countPieces(fenAfter);
      const isComplex = pieceCount < this.COMPLEX_POSITION_PIECE_COUNT;

      // Check if move was suspiciously fast in a complex position
      if (isComplex && timeTakenMs < this.FAST_MOVE_THRESHOLD_MS) {
        // Count recent fast moves for this user in this game
        const recentFastMoves = await this.countRecentFastMoves(gameId, userId);
        
        if (recentFastMoves >= this.SUSPICIOUS_FAST_MOVE_COUNT - 1) {
          // Flag the user
          await this.createFlag({
            userId,
            gameId,
            flagType: AntiCheatFlagType.FAST_MOVES,
            severity: this.calculateFastMoveSeverity(recentFastMoves + 1),
            details: {
              moveNumber,
              timeTakenMs,
              pieceCount,
              fastMoveCount: recentFastMoves + 1,
              threshold: this.FAST_MOVE_THRESHOLD_MS,
            },
          });

          this.logger.warn(
            `Fast move detected: User ${userId}, Game ${gameId}, Move ${moveNumber}, Time ${timeTakenMs}ms`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error tracking move time: ${error.message}`, error.stack);
    }
  }

  /**
   * Detect browser tab focus loss during games
   * Requirement 24.11: Detect when a player's browser tab loses focus during games
   */
  async trackFocusLoss(
    gameId: string,
    userId: string,
    focusLostAt: Date,
    focusRegainedAt: Date,
  ): Promise<void> {
    try {
      const duration = focusRegainedAt.getTime() - focusLostAt.getTime();

      // Count total focus losses for this user in this game
      const focusLossCount = await this.countFocusLosses(gameId, userId);

      if (focusLossCount >= this.FOCUS_LOSS_THRESHOLD_COUNT - 1) {
        await this.createFlag({
          userId,
          gameId,
          flagType: AntiCheatFlagType.TAB_FOCUS_LOSS,
          severity: this.calculateFocusLossSeverity(focusLossCount + 1),
          details: {
            focusLostAt,
            focusRegainedAt,
            durationMs: duration,
            totalFocusLosses: focusLossCount + 1,
            threshold: this.FOCUS_LOSS_THRESHOLD_COUNT,
          },
        });

        this.logger.warn(
          `Focus loss detected: User ${userId}, Game ${gameId}, Duration ${duration}ms, Count ${focusLossCount + 1}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error tracking focus loss: ${error.message}`, error.stack);
    }
  }

  /**
   * Detect chess analysis browser extensions
   * Requirement 24.12: Detect browser extensions that might assist with chess analysis
   */
  async detectBrowserExtension(
    gameId: string,
    userId: string,
    extensionData: {
      extensionName?: string;
      extensionId?: string;
      detectionMethod: string;
    },
  ): Promise<void> {
    try {
      await this.createFlag({
        userId,
        gameId,
        flagType: AntiCheatFlagType.BROWSER_EXTENSION,
        severity: 3, // High severity
        details: {
          ...extensionData,
          detectedAt: new Date(),
        },
      });

      this.logger.warn(
        `Browser extension detected: User ${userId}, Game ${gameId}, Extension ${extensionData.extensionName || extensionData.extensionId}`,
      );
    } catch (error) {
      this.logger.error(`Error detecting browser extension: ${error.message}`, error.stack);
    }
  }

  /**
   * Perform statistical analysis on move patterns
   * Requirement 24.13: Perform statistical analysis on player moves to detect engine usage patterns
   */
  async analyzeMovePatternsForGame(gameId: string): Promise<void> {
    try {
      // Get game with moves
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        include: {
          moves: {
            orderBy: { moveNumber: 'asc' },
          },
          whitePlayer: true,
          blackPlayer: true,
        },
      });

      if (!game || !game.moves || game.moves.length === 0) {
        return;
      }

      // Analyze white player's moves
      const whiteMoves = game.moves.filter((m) => m.color === 'white');
      await this.analyzePlayerMoves(gameId, game.whitePlayerId, whiteMoves);

      // Analyze black player's moves
      const blackMoves = game.moves.filter((m) => m.color === 'black');
      await this.analyzePlayerMoves(gameId, game.blackPlayerId, blackMoves);
    } catch (error) {
      this.logger.error(`Error analyzing move patterns: ${error.message}`, error.stack);
    }
  }

  /**
   * Analyze individual player's moves for statistical anomalies
   */
  private async analyzePlayerMoves(
    gameId: string,
    userId: string,
    moves: any[],
  ): Promise<void> {
    if (moves.length < 10) {
      // Not enough moves for statistical analysis
      return;
    }

    // Calculate average move time
    const avgMoveTime =
      moves.reduce((sum, m) => sum + m.timeTakenMs, 0) / moves.length;

    // Count suspiciously fast moves
    const fastMoveCount = moves.filter(
      (m) => m.timeTakenMs < this.FAST_MOVE_THRESHOLD_MS,
    ).length;
    const fastMovePercentage = (fastMoveCount / moves.length) * 100;

    // Check for consistent fast moves (engine-like behavior)
    if (fastMovePercentage > 30 && avgMoveTime < 500) {
      await this.createFlag({
        userId,
        gameId,
        flagType: AntiCheatFlagType.STATISTICAL_ANOMALY,
        severity: 2,
        details: {
          anomalyType: 'consistent_fast_moves',
          avgMoveTime,
          fastMoveCount,
          fastMovePercentage,
          totalMoves: moves.length,
        },
      });

      this.logger.warn(
        `Statistical anomaly detected: User ${userId}, Game ${gameId}, Fast move % ${fastMovePercentage.toFixed(1)}`,
      );
    }

    // Check for suspiciously consistent move times (bot-like behavior)
    const moveTimeVariance = this.calculateVariance(
      moves.map((m) => m.timeTakenMs),
    );
    const moveTimeStdDev = Math.sqrt(moveTimeVariance);
    const coefficientOfVariation = moveTimeStdDev / avgMoveTime;

    // Low coefficient of variation indicates very consistent timing (suspicious)
    if (coefficientOfVariation < 0.3 && moves.length > 20) {
      await this.createFlag({
        userId,
        gameId,
        flagType: AntiCheatFlagType.STATISTICAL_ANOMALY,
        severity: 2,
        details: {
          anomalyType: 'consistent_timing',
          avgMoveTime,
          stdDev: moveTimeStdDev,
          coefficientOfVariation,
          totalMoves: moves.length,
        },
      });

      this.logger.warn(
        `Statistical anomaly detected: User ${userId}, Game ${gameId}, Consistent timing CV ${coefficientOfVariation.toFixed(2)}`,
      );
    }
  }

  /**
   * Get all flags for a user
   */
  async getFlagsForUser(userId: string, status?: AntiCheatFlagStatus) {
    return this.prisma.antiCheatFlag.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        game: {
          select: {
            id: true,
            whitePlayerId: true,
            blackPlayerId: true,
            result: true,
            createdAt: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all pending flags for admin review
   */
  async getPendingFlags(limit = 50, offset = 0) {
    return this.prisma.antiCheatFlag.findMany({
      where: { status: AntiCheatFlagStatus.PENDING },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
        game: {
          select: {
            id: true,
            whitePlayerId: true,
            blackPlayerId: true,
            result: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get flag statistics for a user
   */
  async getUserFlagStatistics(userId: string) {
    const flags = await this.prisma.antiCheatFlag.findMany({
      where: { userId },
    });

    const byType = flags.reduce((acc, flag) => {
      acc[flag.flagType] = (acc[flag.flagType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = flags.reduce((acc, flag) => {
      acc[flag.status] = (acc[flag.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalFlags: flags.length,
      byType,
      byStatus,
      avgSeverity:
        flags.length > 0
          ? flags.reduce((sum, f) => sum + f.severity, 0) / flags.length
          : 0,
      firstFlagDate: flags.length > 0 ? flags[flags.length - 1].createdAt : null,
      lastFlagDate: flags.length > 0 ? flags[0].createdAt : null,
    };
  }

  /**
   * Update flag status (for admin review)
   */
  async updateFlagStatus(
    flagId: string,
    status: AntiCheatFlagStatus,
    reviewedBy: string,
    adminNotes?: string,
  ) {
    return this.prisma.antiCheatFlag.update({
      where: { id: flagId },
      data: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        adminNotes,
      },
    });
  }

  // Helper methods

  private async createFlag(data: {
    userId: string;
    gameId: string;
    flagType: AntiCheatFlagType;
    severity: number;
    details: any;
  }) {
    return this.prisma.antiCheatFlag.create({
      data: {
        userId: data.userId,
        gameId: data.gameId,
        flagType: data.flagType,
        severity: data.severity,
        details: data.details,
        status: AntiCheatFlagStatus.PENDING,
      },
    });
  }

  private countPieces(fen: string): number {
    const position = fen.split(' ')[0];
    let count = 0;
    for (const char of position) {
      if (char.match(/[pnbrqkPNBRQK]/)) {
        count++;
      }
    }
    return count;
  }

  private async countRecentFastMoves(
    gameId: string,
    userId: string,
  ): Promise<number> {
    const moves = await this.prisma.gameMove.findMany({
      where: {
        gameId,
        timeTakenMs: { lt: this.FAST_MOVE_THRESHOLD_MS },
      },
      include: {
        game: {
          select: {
            whitePlayerId: true,
            blackPlayerId: true,
          },
        },
      },
    });

    // Filter moves by the specific player
    return moves.filter((move) => {
      const isWhite = move.game.whitePlayerId === userId;
      return (isWhite && move.color === 'white') || (!isWhite && move.color === 'black');
    }).length;
  }

  private async countFocusLosses(
    gameId: string,
    userId: string,
  ): Promise<number> {
    const flags = await this.prisma.antiCheatFlag.findMany({
      where: {
        gameId,
        userId,
        flagType: AntiCheatFlagType.TAB_FOCUS_LOSS,
      },
    });
    return flags.length;
  }

  private calculateFastMoveSeverity(fastMoveCount: number): number {
    if (fastMoveCount >= 10) return 3; // High
    if (fastMoveCount >= 7) return 2; // Medium
    return 1; // Low
  }

  private calculateFocusLossSeverity(focusLossCount: number): number {
    if (focusLossCount >= 5) return 2; // Medium
    return 1; // Low
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}
