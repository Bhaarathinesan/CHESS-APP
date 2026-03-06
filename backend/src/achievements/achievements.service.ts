import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeControl } from '@prisma/client';
import { NotificationsGateway } from '../gateways/notifications.gateway';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Award an achievement to a user if they don't already have it
   * Returns true if achievement was newly awarded, false if already had it
   */
  async awardAchievement(
    userId: string,
    achievementCode: string,
  ): Promise<boolean> {
    try {
      // Find the achievement
      const achievement = await this.prisma.achievement.findUnique({
        where: { code: achievementCode },
      });

      if (!achievement) {
        this.logger.warn(
          `Achievement with code ${achievementCode} not found`,
        );
        return false;
      }

      // Check if user already has this achievement
      const existing = await this.prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
      });

      if (existing) {
        return false; // Already has achievement
      }

      // Award the achievement
      await this.prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
        },
      });

      this.logger.log(
        `Awarded achievement ${achievementCode} to user ${userId}`,
      );

      // Create notification for the achievement (Requirement 17.20)
      await this.createAchievementNotification(userId, achievement);

      return true;
    } catch (error) {
      this.logger.error(
        `Error awarding achievement ${achievementCode} to user ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Create a notification when an achievement is earned
   * Requirement 17.20
   */
  private async createAchievementNotification(
    userId: string,
    achievement: any,
  ): Promise<void> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: `You earned the "${achievement.name}" achievement: ${achievement.description}`,
          data: {
            achievementId: achievement.id,
            achievementCode: achievement.code,
            achievementName: achievement.name,
            achievementDescription: achievement.description,
            points: achievement.points,
            iconUrl: achievement.iconUrl,
          },
          isRead: false,
        },
      });

      this.logger.log(
        `Created achievement notification for user ${userId}: ${achievement.name}`,
      );

      // Send real-time notification via WebSocket (Requirement 17.20)
      if (this.notificationsGateway && this.notificationsGateway.server) {
        this.notificationsGateway.server
          .to(`user:${userId}`)
          .emit('achievement_unlocked', {
            id: notification.id,
            achievement: {
              id: achievement.id,
              code: achievement.code,
              name: achievement.name,
              description: achievement.description,
              points: achievement.points,
              iconUrl: achievement.iconUrl,
              category: achievement.category,
            },
            earnedAt: notification.createdAt,
          });

        this.logger.log(
          `Sent real-time achievement notification to user ${userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to create achievement notification for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Check and award gameplay achievements after a game completes
   */
  async checkGameplayAchievements(
    userId: string,
    gameId: string,
  ): Promise<string[]> {
    const awarded: string[] = [];

    try {
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        include: {
          moves: true,
        },
      });

      if (!game) {
        return awarded;
      }

      const isWinner =
        (game.whitePlayerId === userId && game.result === 'WHITE_WIN') ||
        (game.blackPlayerId === userId && game.result === 'BLACK_WIN');

      // First Victory (Requirement 17.1)
      if (isWinner) {
        const winCount = await this.prisma.game.count({
          where: {
            OR: [
              { whitePlayerId: userId, result: 'WHITE_WIN' },
              { blackPlayerId: userId, result: 'BLACK_WIN' },
            ],
            status: 'COMPLETED',
          },
        });

        if (winCount === 1) {
          if (await this.awardAchievement(userId, 'first_victory')) {
            awarded.push('first_victory');
          }
        }
      }

      // Checkmate Master (Requirement 17.2) - 100 checkmate wins
      if (isWinner && game.terminationReason === 'checkmate') {
        const checkmateWins = await this.prisma.game.count({
          where: {
            OR: [
              {
                whitePlayerId: userId,
                result: 'WHITE_WIN',
                terminationReason: 'checkmate',
              },
              {
                blackPlayerId: userId,
                result: 'BLACK_WIN',
                terminationReason: 'checkmate',
              },
            ],
            status: 'COMPLETED',
          },
        });

        if (checkmateWins >= 100) {
          if (await this.awardAchievement(userId, 'checkmate_master')) {
            awarded.push('checkmate_master');
          }
        }
      }

      // Speed Demon (Requirement 17.3) - Win a Bullet game
      if (isWinner && game.timeControl === TimeControl.BULLET) {
        if (await this.awardAchievement(userId, 'speed_demon')) {
          awarded.push('speed_demon');
        }
      }

      // Marathon Runner (Requirement 17.4) - Game over 100 moves
      if (game.moveCount > 100) {
        if (await this.awardAchievement(userId, 'marathon_runner')) {
          awarded.push('marathon_runner');
        }
      }

      // Scholar's Mate (Requirement 17.7) - Win by Scholar's Mate (4 moves)
      if (
        isWinner &&
        game.terminationReason === 'checkmate' &&
        game.moveCount <= 4
      ) {
        if (await this.awardAchievement(userId, 'scholars_mate')) {
          awarded.push('scholars_mate');
        }
      }

      // Stalemate Artist (Requirement 17.8)
      if (
        game.result === 'DRAW' &&
        game.terminationReason === 'stalemate'
      ) {
        if (await this.awardAchievement(userId, 'stalemate_artist')) {
          awarded.push('stalemate_artist');
        }
      }

      // Comeback King (Requirement 17.6) - Win after being down a Queen (9 points)
      // This requires analyzing the game moves for material advantage
      // For now, we'll implement a simplified version
      if (isWinner && game.moves && game.moves.length > 20) {
        // Check if there were captures that indicate being down material
        const userColor =
          game.whitePlayerId === userId ? 'white' : 'black';
        const capturesByOpponent = game.moves.filter(
          (move) => move.isCapture && move.color !== userColor,
        ).length;

        if (capturesByOpponent >= 3) {
          // Simplified: if opponent captured 3+ pieces
          if (await this.awardAchievement(userId, 'comeback_king')) {
            awarded.push('comeback_king');
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking gameplay achievements for user ${userId}:`,
        error,
      );
    }

    return awarded;
  }

  /**
   * Check and award rating achievements after rating update
   */
  async checkRatingAchievements(
    userId: string,
    timeControl: TimeControl,
    newRating: number,
    oldRating: number,
    opponentRating?: number,
  ): Promise<string[]> {
    const awarded: string[] = [];

    try {
      // Giant Killer (Requirement 17.13) - Beat opponent 200+ points higher
      if (opponentRating && opponentRating - oldRating >= 200) {
        if (await this.awardAchievement(userId, 'giant_killer')) {
          awarded.push('giant_killer');
        }
      }

      // Rating milestone achievements (Requirements 17.14-17.18)
      const milestones = [
        { rating: 1400, code: 'rising_star' },
        { rating: 1600, code: 'club_player' },
        { rating: 1800, code: 'expert' },
        { rating: 2000, code: 'master' },
        { rating: 2200, code: 'grandmaster' },
      ];

      for (const milestone of milestones) {
        if (newRating >= milestone.rating && oldRating < milestone.rating) {
          if (await this.awardAchievement(userId, milestone.code)) {
            awarded.push(milestone.code);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking rating achievements for user ${userId}:`,
        error,
      );
    }

    return awarded;
  }

  /**
   * Check and award tournament achievements
   */
  async checkTournamentAchievements(
    userId: string,
    tournamentId: string,
  ): Promise<string[]> {
    const awarded: string[] = [];

    try {
      // Tournament Debut (Requirement 17.9)
      const tournamentCount = await this.prisma.tournamentPlayer.count({
        where: { userId },
      });

      if (tournamentCount === 1) {
        if (await this.awardAchievement(userId, 'tournament_debut')) {
          awarded.push('tournament_debut');
        }
      }

      // Get tournament player data
      const tournamentPlayer = await this.prisma.tournamentPlayer.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId,
          },
        },
        include: {
          tournament: {
            include: {
              players: {
                orderBy: {
                  score: 'desc',
                },
              },
            },
          },
        },
      });

      if (!tournamentPlayer || !tournamentPlayer.tournament) {
        return awarded;
      }

      const tournament = tournamentPlayer.tournament;

      // Only award placement achievements for completed tournaments
      if (tournament.status === 'COMPLETED') {
        const playerRank =
          tournament.players.findIndex((p) => p.userId === userId) + 1;

        // Champion (Requirement 17.11) - Win tournament
        if (playerRank === 1) {
          if (await this.awardAchievement(userId, 'champion')) {
            awarded.push('champion');
          }

          // Clean Sweep (Requirement 17.5) - Win without losing
          if (tournamentPlayer.losses === 0) {
            if (await this.awardAchievement(userId, 'clean_sweep')) {
              awarded.push('clean_sweep');
            }
          }
        }

        // Podium Finish (Requirement 17.10) - Top 3
        if (playerRank <= 3) {
          if (await this.awardAchievement(userId, 'podium_finish')) {
            awarded.push('podium_finish');
          }
        }
      }

      // Iron Player (Requirement 17.12) - 50 tournament games
      const tournamentGames = await this.prisma.game.count({
        where: {
          OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
          tournamentId: { not: null },
          status: 'COMPLETED',
        },
      });

      if (tournamentGames >= 50) {
        if (await this.awardAchievement(userId, 'iron_player')) {
          awarded.push('iron_player');
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking tournament achievements for user ${userId}:`,
        error,
      );
    }

    return awarded;
  }

  /**
   * Check and award social achievements
   */
  async checkSocialAchievements(userId: string): Promise<string[]> {
    const awarded: string[] = [];

    try {
      // Social Butterfly (Requirement 17.19) - Follow 10 players
      const followCount = await this.prisma.follow.count({
        where: { followerId: userId },
      });

      if (followCount >= 10) {
        if (await this.awardAchievement(userId, 'social_butterfly')) {
          awarded.push('social_butterfly');
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking social achievements for user ${userId}:`,
        error,
      );
    }

    return awarded;
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userId: string) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: {
        earnedAt: 'desc',
      },
    });
  }

  /**
   * Get all available achievements
   */
  async getAllAchievements() {
    return this.prisma.achievement.findMany({
      orderBy: [{ category: 'asc' }, { points: 'asc' }],
    });
  }

  /**
   * Get achievement progress for a user
   */
  async getAchievementProgress(userId: string) {
    const [
      totalAchievements,
      userAchievements,
      totalGames,
      wins,
      checkmateWins,
      tournamentCount,
      tournamentGames,
      followCount,
      ratings,
    ] = await Promise.all([
      this.prisma.achievement.count(),
      this.prisma.userAchievement.count({ where: { userId } }),
      this.prisma.game.count({
        where: {
          OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
          status: 'COMPLETED',
        },
      }),
      this.prisma.game.count({
        where: {
          OR: [
            { whitePlayerId: userId, result: 'WHITE_WIN' },
            { blackPlayerId: userId, result: 'BLACK_WIN' },
          ],
          status: 'COMPLETED',
        },
      }),
      this.prisma.game.count({
        where: {
          OR: [
            {
              whitePlayerId: userId,
              result: 'WHITE_WIN',
              terminationReason: 'checkmate',
            },
            {
              blackPlayerId: userId,
              result: 'BLACK_WIN',
              terminationReason: 'checkmate',
            },
          ],
          status: 'COMPLETED',
        },
      }),
      this.prisma.tournamentPlayer.count({ where: { userId } }),
      this.prisma.game.count({
        where: {
          OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
          tournamentId: { not: null },
          status: 'COMPLETED',
        },
      }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.prisma.rating.findMany({ where: { userId } }),
    ]);

    const highestRating = Math.max(
      ...ratings.map((r) => r.rating),
      0,
    );

    return {
      totalAchievements,
      earnedAchievements: userAchievements,
      progress: {
        totalGames,
        wins,
        checkmateWins,
        tournamentCount,
        tournamentGames,
        followCount,
        highestRating,
      },
    };
  }
}
