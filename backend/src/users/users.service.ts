import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { TimeControl } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        country: true,
        city: true,
        collegeName: true,
        collegeDomain: true,
        role: true,
        themePreference: true,
        boardTheme: true,
        pieceSet: true,
        soundEnabled: true,
        soundVolume: true,
        notificationPreferences: true,
        isOnline: true,
        lastOnline: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ratings = await this.prisma.rating.findMany({
      where: { userId },
    });

    const statistics = await this.calculateBasicStatistics(userId);

    return { user, ratings, statistics };
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        country: true,
        city: true,
        collegeName: true,
        isOnline: true,
        lastOnline: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ratings = await this.prisma.rating.findMany({
      where: { userId },
    });

    const recentGames = await this.prisma.game.findMany({
      where: {
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: {
        whitePlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const achievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { earnedAt: 'desc' },
    });

    return { user, ratings, recentGames, achievements };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: updateProfileDto.displayName,
        bio: updateProfileDto.bio,
        country: updateProfileDto.country,
        city: updateProfileDto.city,
        avatarUrl: updateProfileDto.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        country: true,
        city: true,
        collegeName: true,
        collegeDomain: true,
        role: true,
        createdAt: true,
      },
    });

    return { user };
  }

  async updateSettings(userId: string, updateSettingsDto: UpdateSettingsDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        themePreference: updateSettingsDto.theme,
        boardTheme: updateSettingsDto.boardTheme,
        pieceSet: updateSettingsDto.pieceSet,
        soundEnabled: updateSettingsDto.soundEnabled,
        soundVolume: updateSettingsDto.soundVolume,
        notificationPreferences: updateSettingsDto.notificationPreferences,
      },
      select: {
        id: true,
        themePreference: true,
        boardTheme: true,
        pieceSet: true,
        soundEnabled: true,
        soundVolume: true,
        notificationPreferences: true,
      },
    });

    return { user };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    return { avatarUrl: user.avatarUrl };
  }

  private async calculateBasicStatistics(userId: string) {
    const ratings = await this.prisma.rating.findMany({
      where: { userId },
    });

    const totalGames = ratings.reduce((sum, r) => sum + r.gamesPlayed, 0);
    const totalWins = ratings.reduce((sum, r) => sum + r.wins, 0);
    const totalLosses = ratings.reduce((sum, r) => sum + r.losses, 0);
    const totalDraws = ratings.reduce((sum, r) => sum + r.draws, 0);

    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

    return {
      totalGames,
      wins: totalWins,
      losses: totalLosses,
      draws: totalDraws,
      winRate: Math.round(winRate * 100) / 100,
    };
  }

  async getDetailedStatistics(
    userId: string,
    timeControl?: TimeControl,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Build where clause for games
    const gameWhere: any = {
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      status: 'COMPLETED',
    };

    if (timeControl) {
      gameWhere.timeControl = timeControl;
    }

    if (startDate || endDate) {
      gameWhere.completedAt = {};
      if (startDate) gameWhere.completedAt.gte = startDate;
      if (endDate) gameWhere.completedAt.lte = endDate;
    }

    // Get all completed games
    const games = await this.prisma.game.findMany({
      where: gameWhere,
      include: {
        moves: true,
        whitePlayer: {
          select: { id: true, username: true, displayName: true },
        },
        blackPlayer: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Calculate win/loss/draw distribution
    let wins = 0;
    let losses = 0;
    let draws = 0;

    games.forEach((game) => {
      if (game.result === 'DRAW') {
        draws++;
      } else if (
        (game.result === 'WHITE_WIN' && game.whitePlayerId === userId) ||
        (game.result === 'BLACK_WIN' && game.blackPlayerId === userId)
      ) {
        wins++;
      } else {
        losses++;
      }
    });

    // Performance by time control
    const performanceByTimeControl = await this.calculatePerformanceByTimeControl(
      userId,
      startDate,
      endDate,
    );

    // Opening statistics
    const openingStats = await this.calculateOpeningStatistics(
      userId,
      timeControl,
      startDate,
      endDate,
    );

    // Time management statistics
    const timeManagement = this.calculateTimeManagement(games, userId);

    // Accuracy statistics (placeholder - would need move analysis)
    const accuracy = await this.calculateAccuracy(games, userId);

    // Streaks
    const streaks = this.calculateStreaks(games, userId);

    // Most faced opponents
    const opponents = await this.calculateOpponentStats(games, userId);

    // Performance by day of week
    const dayOfWeekPerformance = this.calculateDayOfWeekPerformance(games, userId);

    // Performance trend (last 30 days)
    const performanceTrend = await this.calculatePerformanceTrend(
      userId,
      timeControl,
    );

    // Rating history
    const ratingHistory = await this.getRatingHistory(
      userId,
      timeControl,
      startDate,
      endDate,
    );

    return {
      totalGames: games.length,
      wins,
      losses,
      draws,
      winRate: games.length > 0 ? (wins / games.length) * 100 : 0,
      performanceByTimeControl,
      openingStats,
      timeManagement,
      accuracy,
      streaks,
      opponents,
      dayOfWeekPerformance,
      performanceTrend,
      ratingHistory,
    };
  }

  private async calculatePerformanceByTimeControl(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const timeControls: TimeControl[] = ['BULLET', 'BLITZ', 'RAPID', 'CLASSICAL'];
    const performance: Record<string, any> = {};

    for (const tc of timeControls) {
      const gameWhere: any = {
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        status: 'COMPLETED',
        timeControl: tc,
      };

      if (startDate || endDate) {
        gameWhere.completedAt = {};
        if (startDate) gameWhere.completedAt.gte = startDate;
        if (endDate) gameWhere.completedAt.lte = endDate;
      }

      const games = await this.prisma.game.findMany({
        where: gameWhere,
      });

      let wins = 0;
      let losses = 0;
      let draws = 0;

      games.forEach((game) => {
        if (game.result === 'DRAW') {
          draws++;
        } else if (
          (game.result === 'WHITE_WIN' && game.whitePlayerId === userId) ||
          (game.result === 'BLACK_WIN' && game.blackPlayerId === userId)
        ) {
          wins++;
        } else {
          losses++;
        }
      });

      const rating = await this.prisma.rating.findUnique({
        where: {
          userId_timeControl: {
            userId,
            timeControl: tc,
          },
        },
      });

      performance[tc.toLowerCase()] = {
        gamesPlayed: games.length,
        wins,
        losses,
        draws,
        winRate: games.length > 0 ? (wins / games.length) * 100 : 0,
        currentRating: rating?.rating || 1200,
        peakRating: rating?.peakRating || 1200,
      };
    }

    return performance;
  }

  private async calculateOpeningStatistics(
    userId: string,
    timeControl?: TimeControl,
    startDate?: Date,
    endDate?: Date,
  ) {
    const gameWhere: any = {
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      status: 'COMPLETED',
      openingName: { not: null },
    };

    if (timeControl) {
      gameWhere.timeControl = timeControl;
    }

    if (startDate || endDate) {
      gameWhere.completedAt = {};
      if (startDate) gameWhere.completedAt.gte = startDate;
      if (endDate) gameWhere.completedAt.lte = endDate;
    }

    const games = await this.prisma.game.findMany({
      where: gameWhere,
      select: {
        openingName: true,
        result: true,
        whitePlayerId: true,
        blackPlayerId: true,
      },
    });

    const openingMap = new Map<string, { total: number; wins: number; draws: number; losses: number }>();

    games.forEach((game) => {
      const opening = game.openingName;
      if (!opening) return;

      if (!openingMap.has(opening)) {
        openingMap.set(opening, { total: 0, wins: 0, draws: 0, losses: 0 });
      }

      const stats = openingMap.get(opening)!;
      stats.total++;

      if (game.result === 'DRAW') {
        stats.draws++;
      } else if (
        (game.result === 'WHITE_WIN' && game.whitePlayerId === userId) ||
        (game.result === 'BLACK_WIN' && game.blackPlayerId === userId)
      ) {
        stats.wins++;
      } else {
        stats.losses++;
      }
    });

    const openingStats = Array.from(openingMap.entries())
      .map(([opening, stats]) => ({
        opening,
        gamesPlayed: stats.total,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        winRate: (stats.wins / stats.total) * 100,
      }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .slice(0, 10);

    return openingStats;
  }

  private calculateTimeManagement(games: any[], userId: string) {
    let totalMoves = 0;
    let totalTimeSpent = 0;

    games.forEach((game) => {
      const isWhite = game.whitePlayerId === userId;
      game.moves.forEach((move: any) => {
        if ((isWhite && move.color === 'white') || (!isWhite && move.color === 'black')) {
          totalMoves++;
          totalTimeSpent += move.timeTakenMs;
        }
      });
    });

    return {
      averageTimePerMove: totalMoves > 0 ? totalTimeSpent / totalMoves : 0,
      totalTimeSpent,
      totalMoves,
    };
  }

  private async calculateAccuracy(games: any[], userId: string) {
    // Placeholder for accuracy calculation
    // In a real implementation, this would analyze moves with Stockfish
    return {
      averageAccuracy: 0,
      bestGame: null,
      worstGame: null,
    };
  }

  private async calculateOpponentStats(games: any[], userId: string) {
    const opponentMap = new Map<string, { 
      opponent: any; 
      total: number; 
      wins: number; 
      draws: number; 
      losses: number;
    }>();

    games.forEach((game) => {
      const isWhite = game.whitePlayerId === userId;
      const opponent = isWhite ? game.blackPlayer : game.whitePlayer;
      const opponentId = opponent.id;

      if (!opponentMap.has(opponentId)) {
        opponentMap.set(opponentId, {
          opponent: {
            id: opponent.id,
            username: opponent.username,
            displayName: opponent.displayName,
          },
          total: 0,
          wins: 0,
          draws: 0,
          losses: 0,
        });
      }

      const stats = opponentMap.get(opponentId)!;
      stats.total++;

      if (game.result === 'DRAW') {
        stats.draws++;
      } else if (
        (game.result === 'WHITE_WIN' && isWhite) ||
        (game.result === 'BLACK_WIN' && !isWhite)
      ) {
        stats.wins++;
      } else {
        stats.losses++;
      }
    });

    return Array.from(opponentMap.values())
      .map((stats) => ({
        ...stats,
        winRate: (stats.wins / stats.total) * 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }

  private calculateDayOfWeekPerformance(games: any[], userId: string) {
    const dayStats = new Map<number, { total: number; wins: number; draws: number; losses: number }>();

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      dayStats.set(i, { total: 0, wins: 0, draws: 0, losses: 0 });
    }

    games.forEach((game) => {
      if (!game.completedAt) return;

      const dayOfWeek = new Date(game.completedAt).getDay();
      const stats = dayStats.get(dayOfWeek)!;
      stats.total++;

      if (game.result === 'DRAW') {
        stats.draws++;
      } else if (
        (game.result === 'WHITE_WIN' && game.whitePlayerId === userId) ||
        (game.result === 'BLACK_WIN' && game.blackPlayerId === userId)
      ) {
        stats.wins++;
      } else {
        stats.losses++;
      }
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return Array.from(dayStats.entries()).map(([day, stats]) => ({
      day: dayNames[day],
      gamesPlayed: stats.total,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
    }));
  }

  private async calculatePerformanceTrend(
    userId: string,
    timeControl?: TimeControl,
  ) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const gameWhere: any = {
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      status: 'COMPLETED',
      completedAt: { gte: thirtyDaysAgo },
    };

    if (timeControl) {
      gameWhere.timeControl = timeControl;
    }

    const games = await this.prisma.game.findMany({
      where: gameWhere,
      orderBy: { completedAt: 'asc' },
    });

    // Group games by date
    const dateMap = new Map<string, { wins: number; losses: number; draws: number }>();

    games.forEach((game) => {
      if (!game.completedAt) return;

      const dateKey = game.completedAt.toISOString().split('T')[0];
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { wins: 0, losses: 0, draws: 0 });
      }

      const stats = dateMap.get(dateKey)!;

      if (game.result === 'DRAW') {
        stats.draws++;
      } else if (
        (game.result === 'WHITE_WIN' && game.whitePlayerId === userId) ||
        (game.result === 'BLACK_WIN' && game.blackPlayerId === userId)
      ) {
        stats.wins++;
      } else {
        stats.losses++;
      }
    });

    return Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        total: stats.wins + stats.losses + stats.draws,
        winRate: stats.wins / (stats.wins + stats.losses + stats.draws) * 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateStreaks(games: any[], userId: string) {
    if (games.length === 0) {
      return {
        currentWinStreak: 0,
        longestWinStreak: 0,
        currentLossStreak: 0,
        longestLossStreak: 0,
      };
    }

    let currentWinStreak = 0;
    let longestWinStreak = 0;
    let currentLossStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    // Sort games by completion date (most recent first)
    const sortedGames = [...games].sort((a, b) => 
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    sortedGames.forEach((game, index) => {
      const isWin =
        (game.result === 'WHITE_WIN' && game.whitePlayerId === userId) ||
        (game.result === 'BLACK_WIN' && game.blackPlayerId === userId);
      const isLoss =
        (game.result === 'WHITE_WIN' && game.blackPlayerId === userId) ||
        (game.result === 'BLACK_WIN' && game.whitePlayerId === userId);

      if (isWin) {
        tempWinStreak++;
        tempLossStreak = 0;
        if (index === 0) currentWinStreak = tempWinStreak;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else if (isLoss) {
        tempLossStreak++;
        tempWinStreak = 0;
        if (index === 0) currentLossStreak = tempLossStreak;
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
      } else {
        // Draw breaks both streaks
        tempWinStreak = 0;
        tempLossStreak = 0;
      }
    });

    return {
      currentWinStreak,
      longestWinStreak,
      currentLossStreak,
      longestLossStreak,
    };
  }

  private async getRatingHistory(
    userId: string,
    timeControl?: TimeControl,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = { userId };

    if (timeControl) {
      where.timeControl = timeControl;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const history = await this.prisma.ratingHistory.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 100, // Limit to last 100 rating changes
    });

    return history.map((h) => ({
      date: h.createdAt,
      rating: h.ratingAfter,
      change: h.ratingChange,
      timeControl: h.timeControl,
    }));
  }

  /**
   * Search for users by name or username
   * Requirements: 31.11
   */
  async searchUsers(
    query: string,
    currentUserId?: string,
    limit: number = 20,
  ): Promise<any[]> {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
        isBanned: false,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        collegeName: true,
        isOnline: true,
        ratings: {
          where: { timeControl: 'BLITZ' },
          select: { rating: true },
        },
      },
      take: limit,
      orderBy: [
        { isOnline: 'desc' },
        { displayName: 'asc' },
      ],
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      collegeName: user.collegeName,
      isOnline: user.isOnline,
      rating: user.ratings[0]?.rating || null,
    }));
  }

  /**
   * Get suggested players based on rating and college
   * Requirements: 31.12
   */
  async getSuggestedPlayers(
    userId: string,
    limit: number = 10,
  ): Promise<any[]> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ratings: {
          where: { timeControl: 'BLITZ' },
        },
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const currentRating = currentUser.ratings[0]?.rating || 1200;
    const ratingRange = 200;

    // Get users already following
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    // Get blocked users
    const blocked = await this.prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedId: userId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = [
      ...blocked.map((b) => b.blockerId),
      ...blocked.map((b) => b.blockedId),
    ].filter((id) => id !== userId);

    // Find suggested players
    const suggestedPlayers = await this.prisma.user.findMany({
      where: {
        id: {
          notIn: [...followingIds, ...blockedIds, userId],
        },
        isBanned: false,
        OR: [
          // Same college
          { collegeDomain: currentUser.collegeDomain },
          // Similar rating
          {
            ratings: {
              some: {
                timeControl: 'BLITZ',
                rating: {
                  gte: currentRating - ratingRange,
                  lte: currentRating + ratingRange,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        collegeName: true,
        isOnline: true,
        ratings: {
          where: { timeControl: 'BLITZ' },
          select: { rating: true },
        },
      },
      take: limit,
      orderBy: [
        { isOnline: 'desc' },
      ],
    });

    return suggestedPlayers.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      collegeName: user.collegeName,
      isOnline: user.isOnline,
      rating: user.ratings[0]?.rating || null,
      reason:
        user.collegeName === currentUser.collegeName
          ? 'same_college'
          : 'similar_rating',
    }));
  }

  /**
   * Get user games with pagination and filters
   */
  async getUserGames(
    userId: string,
    page: number = 1,
    limit: number = 10,
    timeControl?: string,
    result?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      status: 'COMPLETED',
    };

    if (timeControl) {
      where.timeControl = timeControl;
    }

    if (result) {
      if (result === 'win') {
        where.OR = [
          { whitePlayerId: userId, result: 'WHITE_WIN' },
          { blackPlayerId: userId, result: 'BLACK_WIN' },
        ];
      } else if (result === 'loss') {
        where.OR = [
          { whitePlayerId: userId, result: 'BLACK_WIN' },
          { blackPlayerId: userId, result: 'WHITE_WIN' },
        ];
      } else if (result === 'draw') {
        where.result = 'DRAW';
      }
    }

    const [games, total] = await Promise.all([
      this.prisma.game.findMany({
        where,
        skip,
        take: limit,
        orderBy: { completedAt: 'desc' },
        include: {
          whitePlayer: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          blackPlayer: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.game.count({ where }),
    ]);

    return {
      games,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user tournament history
   */
  async getUserTournaments(userId: string) {
    const tournamentPlayers = await this.prisma.tournamentPlayer.findMany({
      where: { userId },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            format: true,
            status: true,
            currentPlayers: true,
            startTime: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return tournamentPlayers.map((tp) => ({
      id: tp.tournament.id,
      name: tp.tournament.name,
      format: tp.tournament.format,
      status: tp.tournament.status,
      currentPlayers: tp.tournament.currentPlayers,
      startTime: tp.tournament.startTime,
      rank: tp.rank,
      score: tp.score,
    }));
  }
}
