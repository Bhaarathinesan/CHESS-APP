import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardResponseDto,
  UserMetrics,
  GameMetrics,
  UsageMetrics,
  ServerMetrics,
} from './dto/dashboard-response.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  UserListResponseDto,
  UserListItemDto,
} from './dto/user-list-response.dto';
import * as bcrypt from 'bcrypt';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import { AntiCheatFlagStatus, BanType, TimeControl } from '@prisma/client';
import { BanService } from './ban.service';
import { RatingRollbackService } from './rating-rollback.service';
import { LoggingService } from './logging.service';
import { IssueBanDto } from './dto/issue-ban.dto';
import { RollbackRatingsDto } from './dto/rollback-ratings.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly antiCheatService: AntiCheatService,
    private readonly banService: BanService,
    private readonly ratingRollbackService: RatingRollbackService,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Get comprehensive admin dashboard metrics
   * Requirements: 25.1, 25.2, 25.3, 25.4, 25.18
   */
  async getDashboardMetrics(): Promise<DashboardResponseDto> {
    const [userMetrics, gameMetrics, usageMetrics, serverMetrics] =
      await Promise.all([
        this.getUserMetrics(),
        this.getGameMetrics(),
        this.getUsageMetrics(),
        this.getServerMetrics(),
      ]);

    return {
      userMetrics,
      gameMetrics,
      usageMetrics,
      serverMetrics,
    };
  }

  /**
   * Calculate user metrics: total users, DAU, WAU, MAU, new registrations
   * Requirements: 25.1
   */
  private async getUserMetrics(): Promise<UserMetrics> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      newRegistrations,
    ] = await Promise.all([
      // Total users
      this.prisma.user.count(),

      // Daily Active Users (DAU) - users online in last 24 hours
      this.prisma.user.count({
        where: {
          lastOnline: {
            gte: oneDayAgo,
          },
        },
      }),

      // Weekly Active Users (WAU) - users online in last 7 days
      this.prisma.user.count({
        where: {
          lastOnline: {
            gte: oneWeekAgo,
          },
        },
      }),

      // Monthly Active Users (MAU) - users online in last 30 days
      this.prisma.user.count({
        where: {
          lastOnline: {
            gte: oneMonthAgo,
          },
        },
      }),

      // New registrations in last 30 days
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: oneMonthAgo,
          },
        },
      }),
    ]);

    return {
      totalUsers,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      newRegistrations,
    };
  }

  /**
   * Calculate game metrics: total games, average duration, popular time controls
   * Requirements: 25.2
   */
  private async getGameMetrics(): Promise<GameMetrics> {
    // Total completed games
    const totalGames = await this.prisma.game.count({
      where: {
        status: 'COMPLETED',
      },
    });

    // Calculate average game duration
    const gamesWithDuration = await this.prisma.game.findMany({
      where: {
        status: 'COMPLETED',
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    let averageDuration = 0;
    if (gamesWithDuration.length > 0) {
      const totalDuration = gamesWithDuration.reduce((sum, game) => {
        if (
          game.completedAt &&
          game.startedAt &&
          typeof game.completedAt.getTime === 'function' &&
          typeof game.startedAt.getTime === 'function'
        ) {
          const duration =
            game.completedAt.getTime() - game.startedAt.getTime();
          return sum + duration;
        }
        return sum;
      }, 0);
      averageDuration = Math.round(totalDuration / gamesWithDuration.length / 1000); // Convert to seconds
    }

    // Get popular time controls
    const timeControlCounts = await this.prisma.game.groupBy({
      by: ['timeControl'],
      where: {
        status: 'COMPLETED',
      },
      _count: {
        timeControl: true,
      },
      orderBy: {
        _count: {
          timeControl: 'desc',
        },
      },
    });

    const popularTimeControls = timeControlCounts.map((tc) => ({
      timeControl: tc.timeControl,
      count: tc._count.timeControl,
      percentage:
        totalGames > 0
          ? Math.round((tc._count.timeControl / totalGames) * 100 * 10) / 10
          : 0,
    }));

    return {
      totalGames,
      averageDuration,
      popularTimeControls,
    };
  }

  /**
   * Calculate usage metrics: peak usage hours, tournament participation
   * Requirements: 25.3, 25.4
   */
  private async getUsageMetrics(): Promise<UsageMetrics> {
    // Get games created in last 30 days with hour information
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentGames = await this.prisma.game.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by hour
    const hourCounts = new Array(24).fill(0);
    recentGames.forEach((game) => {
      if (game.createdAt && typeof game.createdAt.getHours === 'function') {
        const hour = game.createdAt.getHours();
        hourCounts[hour]++;
      }
    });

    // Get top 5 peak hours
    const peakUsageHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate tournament participation rate
    const [totalUsers, tournamentPlayers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.tournamentPlayer.groupBy({
        by: ['userId'],
      }),
    ]);

    const tournamentParticipationRate =
      totalUsers > 0
        ? Math.round((tournamentPlayers.length / totalUsers) * 100 * 10) / 10
        : 0;

    return {
      peakUsageHours,
      tournamentParticipationRate,
    };
  }

  /**
   * Get server performance metrics
   * Requirements: 25.18
   */
  private async getServerMetrics(): Promise<ServerMetrics> {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;

    return {
      uptime: Math.round(process.uptime()),
      memoryUsage: {
        used: Math.round(usedMemory / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: Math.round((usedMemory / totalMemory) * 100 * 10) / 10,
      },
      cpuUsage: Math.round(process.cpuUsage().user / 1000000), // Convert to seconds
    };
  }


  /**
   * Get paginated list of users with search and filters
   * Requirements: 25.5, 25.18
   */
  async getUsers(query: UserQueryDto): Promise<UserListResponseDto> {
    const { search, role, collegeDomain, page = 1, limit = 20 } = query;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (collegeDomain) {
      where.collegeDomain = collegeDomain;
    }

    // Get total count
    const total = await this.prisma.user.count({ where });

    // Get paginated users
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        collegeName: true,
        collegeDomain: true,
        role: true,
        emailVerified: true,
        isOnline: true,
        lastOnline: true,
        isBanned: true,
        banReason: true,
        banExpires: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      users: users as UserListItemDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update user profile, role, or ban status
   * Requirements: 25.6, 25.7, 25.8, 25.18
   */
  async updateUser(userId: string, updateData: UpdateUserDto): Promise<void> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prepare update data
    const data: any = {};

    if (updateData.displayName !== undefined) {
      data.displayName = updateData.displayName;
    }

    if (updateData.email !== undefined) {
      // Check if email is already taken
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Email already in use');
      }

      data.email = updateData.email;
    }

    if (updateData.role !== undefined) {
      data.role = updateData.role;
    }

    if (updateData.isBanned !== undefined) {
      data.isBanned = updateData.isBanned;

      // If unbanning, clear ban reason and expiry
      if (!updateData.isBanned) {
        data.banReason = null;
        data.banExpires = null;
      }
    }

    if (updateData.banReason !== undefined) {
      data.banReason = updateData.banReason;
    }

    if (updateData.banExpires !== undefined) {
      data.banExpires = new Date(updateData.banExpires);
    }

    if (updateData.bio !== undefined) {
      data.bio = updateData.bio;
    }

    if (updateData.country !== undefined) {
      data.country = updateData.country;
    }

    if (updateData.city !== undefined) {
      data.city = updateData.city;
    }

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Reset user password
   * Requirements: 25.6, 25.18
   */
  async resetUserPassword(userId: string): Promise<string> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate random password
    const newPassword = this.generateRandomPassword();

    // Hash password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return newPassword;
  }

  /**
   * Generate random password
   */
  private generateRandomPassword(): string {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    return password;
  }

  /**
   * Get list of approved college domains
   * Requirements: 25.16, 25.18
   */
  async getCollegeDomains(): Promise<any> {
    const domains = await this.prisma.collegeDomain.findMany({
      orderBy: {
        domain: 'asc',
      },
    });

    // Get user counts for each domain
    const domainsWithCounts = await Promise.all(
      domains.map(async (domain) => {
        const userCount = await this.prisma.user.count({
          where: { collegeDomain: domain.domain },
        });
        return {
          id: domain.id,
          domain: domain.domain,
          collegeName: domain.collegeName,
          isActive: domain.isActive,
          userCount,
          createdAt: domain.createdAt,
          updatedAt: domain.updatedAt,
        };
      }),
    );

    return {
      domains: domainsWithCounts,
      total: domains.length,
    };
  }

  /**
   * Add a new approved college domain
   * Requirements: 25.16, 25.18
   */
  async addCollegeDomain(
    domain: string,
    collegeName: string,
  ): Promise<void> {
    // Normalize domain to lowercase
    const normalizedDomain = domain.toLowerCase().trim();

    // Check if domain already exists
    const existing = await this.prisma.collegeDomain.findUnique({
      where: { domain: normalizedDomain },
    });

    if (existing) {
      throw new BadRequestException('Domain already exists');
    }

    // Create new domain
    await this.prisma.collegeDomain.create({
      data: {
        domain: normalizedDomain,
        collegeName: collegeName.trim(),
        isActive: true,
      },
    });
  }

  /**
   * Remove an approved college domain
   * Requirements: 25.16, 25.18
   */
  async removeCollegeDomain(domainId: string): Promise<void> {
    // Check if domain exists
    const domain = await this.prisma.collegeDomain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // Check if any users are using this domain
    const userCount = await this.prisma.user.count({
      where: { collegeDomain: domain.domain },
    });

    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot remove domain: ${userCount} user(s) are registered with this domain`,
      );
    }

    // Delete domain
    await this.prisma.collegeDomain.delete({
      where: { id: domainId },
    });
  }

  /**
   * Toggle college domain active status
   * Requirements: 25.16, 25.18
   */
  async toggleCollegeDomainStatus(domainId: string): Promise<void> {
    // Check if domain exists
    const domain = await this.prisma.collegeDomain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // Toggle active status
    await this.prisma.collegeDomain.update({
      where: { id: domainId },
      data: { isActive: !domain.isActive },
    });
  }

  /**
   * Check if a college domain is approved
   * Requirements: 25.16
   */
  async isCollegeDomainApproved(domain: string): Promise<boolean> {
    const normalizedDomain = domain.toLowerCase().trim();
    const collegeDomain = await this.prisma.collegeDomain.findUnique({
      where: { domain: normalizedDomain },
    });

    return collegeDomain !== null && collegeDomain.isActive;
  }

  /**
   * Get all tournaments with admin filters and pagination
   * Requirements: 25.9, 25.18
   */
  async getTournaments(query: any): Promise<any> {
    const {
      search,
      format,
      timeControl,
      status,
      creatorId,
      startDateFrom,
      startDateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (format) {
      where.format = format;
    }

    if (timeControl) {
      where.timeControl = timeControl;
    }

    if (status) {
      where.status = status;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (startDateFrom || startDateTo) {
      where.startTime = {};
      if (startDateFrom) {
        where.startTime.gte = new Date(startDateFrom);
      }
      if (startDateTo) {
        where.startTime.lte = new Date(startDateTo);
      }
    }

    // Get total count
    const total = await this.prisma.tournament.count({ where });

    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get paginated tournaments
    const tournaments = await this.prisma.tournament.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            players: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      tournaments: tournaments.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        format: t.format,
        timeControl: t.timeControl,
        status: t.status,
        currentPlayers: t._count.players,
        minPlayers: t.minPlayers,
        maxPlayers: t.maxPlayers,
        isRated: t.isRated,
        startTime: t.startTime,
        registrationDeadline: t.registrationDeadline,
        creator: t.creator,
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Cancel any tournament as admin
   * Requirements: 25.10, 25.18
   */
  async cancelTournamentAsAdmin(
    tournamentId: string,
    reason: string,
  ): Promise<void> {
    // Check if tournament exists
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Check if tournament can be cancelled
    if (tournament.status === 'COMPLETED' || tournament.status === 'CANCELLED') {
      throw new BadRequestException(
        `Cannot cancel tournament with status: ${tournament.status}`,
      );
    }

    // Update tournament status
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'CANCELLED',
        endTime: new Date(),
      },
    });

    // Create notifications for all registered players
    const notificationPromises = tournament.players.map((player) =>
      this.prisma.notification.create({
        data: {
          userId: player.userId,
          type: 'tournament_cancelled',
          title: 'Tournament Cancelled',
          message: `The tournament "${tournament.name}" has been cancelled by an administrator. Reason: ${reason}`,
          data: {
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            reason,
          },
        },
      }),
    );

    await Promise.all(notificationPromises);
  }

  /**
   * Update any tournament as admin
   * Requirements: 25.10, 25.18
   */
  async updateTournamentAsAdmin(
    tournamentId: string,
    updateData: any,
  ): Promise<void> {
    // Check if tournament exists
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Prepare update data
    const data: any = {};

    if (updateData.name !== undefined) {
      data.name = updateData.name;
    }

    if (updateData.description !== undefined) {
      data.description = updateData.description;
    }

    if (updateData.format !== undefined) {
      data.format = updateData.format;
    }

    if (updateData.timeControl !== undefined) {
      data.timeControl = updateData.timeControl;
    }

    if (updateData.initialTimeMinutes !== undefined) {
      data.initialTimeMinutes = updateData.initialTimeMinutes;
    }

    if (updateData.incrementSeconds !== undefined) {
      data.incrementSeconds = updateData.incrementSeconds;
    }

    if (updateData.isRated !== undefined) {
      data.isRated = updateData.isRated;
    }

    if (updateData.status !== undefined) {
      data.status = updateData.status;
    }

    if (updateData.minPlayers !== undefined) {
      data.minPlayers = updateData.minPlayers;
    }

    if (updateData.maxPlayers !== undefined) {
      data.maxPlayers = updateData.maxPlayers;
    }

    if (updateData.roundsTotal !== undefined) {
      data.roundsTotal = updateData.roundsTotal;
    }

    if (updateData.allowLateRegistration !== undefined) {
      data.allowLateRegistration = updateData.allowLateRegistration;
    }

    if (updateData.spectatorDelaySeconds !== undefined) {
      data.spectatorDelaySeconds = updateData.spectatorDelaySeconds;
    }

    if (updateData.registrationDeadline !== undefined) {
      data.registrationDeadline = new Date(updateData.registrationDeadline);
    }

    if (updateData.startTime !== undefined) {
      data.startTime = new Date(updateData.startTime);
    }

    if (updateData.prizeDescription !== undefined) {
      data.prizeDescription = updateData.prizeDescription;
    }

    // Update tournament
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data,
    });
  }

  /**
   * Get reports with filters for admin review
   * Requirements: 25.12, 25.18
   */
  async getReports(query: any): Promise<any> {
    const {
      status,
      reportType,
      reportedUserId,
      page = 1,
      limit = 50,
    } = query;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    if (reportType) {
      where.reportType = reportType;
    }

    if (reportedUserId) {
      where.reportedUserId = reportedUserId;
    }

    // Get total count
    const total = await this.prisma.report.count({ where });

    // Get paginated reports
    const reports = await this.prisma.report.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatarUrl: true,
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
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      reports,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get a single report by ID with full details
   * Requirements: 25.12, 25.18
   */
  async getReportById(reportId: string): Promise<any> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatarUrl: true,
            isBanned: true,
            banReason: true,
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
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // If this is a game report, include game details
    let gameDetails = null;
    if (report.gameId) {
      gameDetails = await this.prisma.game.findUnique({
        where: { id: report.gameId },
        select: {
          id: true,
          whitePlayerId: true,
          blackPlayerId: true,
          timeControl: true,
          status: true,
          result: true,
          terminationReason: true,
          pgn: true,
          createdAt: true,
          completedAt: true,
          whitePlayer: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          blackPlayer: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });
    }

    return {
      ...report,
      gameDetails,
    };
  }

  /**
   * Update report status
   * Requirements: 25.12, 25.18
   */
  async updateReportStatus(
    reportId: string,
    status: string,
    reviewerId: string,
    adminNotes?: string,
  ): Promise<any> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: status.toUpperCase() as any,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        adminNotes: adminNotes?.trim(),
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
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
    });
  }

  /**
   * Get chat logs for a specific game (for moderation)
   * Requirements: 25.13, 25.18
   */
  async getChatLogs(gameId: string): Promise<any> {
    // Verify game exists
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        whitePlayerId: true,
        blackPlayerId: true,
        status: true,
        createdAt: true,
        completedAt: true,
        whitePlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Get all chat messages for this game
    const messages = await this.prisma.chatMessage.findMany({
      where: { gameId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reports: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      game,
      messages,
      totalMessages: messages.length,
    };
  }

  /**
   * Get all anti-cheat flags with pagination
   * Requirements: 24.15, 25.18
   */
  async getAntiCheatFlags(limit = 50, offset = 0) {
    return this.antiCheatService.getPendingFlags(limit, offset);
  }

  /**
   * Get anti-cheat flags for a specific user
   * Requirements: 24.15, 25.18
   */
  async getUserAntiCheatFlags(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.antiCheatService.getFlagsForUser(userId);
  }

  /**
   * Get anti-cheat statistics for a specific user
   * Requirements: 24.15, 25.18
   */
  async getUserAntiCheatStatistics(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.antiCheatService.getUserFlagStatistics(userId);
  }

  /**
   * Update anti-cheat flag status
   * Requirements: 24.15, 25.18
   */
  async updateAntiCheatFlag(
    flagId: string,
    status: AntiCheatFlagStatus,
    reviewedBy: string,
    adminNotes?: string,
  ) {
    return this.antiCheatService.updateFlagStatus(
      flagId,
      status,
      reviewedBy,
      adminNotes,
    );
  }


  /**
   * Issue a ban to a user
   * Requirements: 24.16
   */
  async issueBan(
    userId: string,
    dto: IssueBanDto,
    issuedBy: string,
  ): Promise<any> {
    switch (dto.banType) {
      case BanType.WARNING:
        return this.banService.issueWarning(userId, dto.reason, issuedBy);

      case BanType.TEMPORARY:
        if (!dto.expiresAt) {
          throw new BadRequestException(
            'Expiration date required for temporary ban',
          );
        }
        return this.banService.issueTemporaryBan(
          userId,
          dto.reason,
          new Date(dto.expiresAt),
          issuedBy,
        );

      case BanType.PERMANENT:
        return this.banService.issuePermanentBan(userId, dto.reason, issuedBy);

      default:
        throw new BadRequestException('Invalid ban type');
    }
  }

  /**
   * Revoke a ban
   * Requirements: 24.16
   */
  async revokeBan(
    banId: string,
    revokedBy: string,
    revokeReason: string,
  ): Promise<any> {
    return this.banService.revokeBan(banId, revokedBy, revokeReason);
  }

  /**
   * Get all bans for a user
   * Requirements: 24.16
   */
  async getUserBans(userId: string): Promise<any> {
    return this.banService.getUserBans(userId);
  }

  /**
   * Rollback rating changes from affected games
   * Requirements: 24.17
   */
  async rollbackRatings(
    userId: string,
    dto: RollbackRatingsDto,
  ): Promise<any> {
    if (dto.gameIds && dto.gameIds.length > 0) {
      return this.ratingRollbackService.rollbackRatingsFromGames(
        userId,
        dto.gameIds,
      );
    } else if (dto.fromDate && dto.toDate) {
      return this.ratingRollbackService.rollbackRatingsFromDateRange(
        userId,
        new Date(dto.fromDate),
        new Date(dto.toDate),
      );
    } else if (dto.opponentId) {
      return this.ratingRollbackService.rollbackRatingsAgainstOpponent(
        userId,
        dto.opponentId,
      );
    } else {
      throw new BadRequestException(
        'Must provide gameIds, date range, or opponentId',
      );
    }
  }

  /**
   * Preview rating rollback without applying changes
   * Requirements: 24.17
   */
  async previewRollback(userId: string, dto: RollbackRatingsDto): Promise<any> {
    if (dto.gameIds && dto.gameIds.length > 0) {
      return this.ratingRollbackService.previewRollback(userId, dto.gameIds);
    } else {
      throw new BadRequestException('Must provide gameIds for preview');
    }
  }

  /**
   * Manually adjust a user's rating
   * Requirements: 25.14, 25.18
   */
  async adjustRating(
    userId: string,
    timeControl: TimeControl,
    newRating: number,
    reason: string,
    adjustedBy: string,
  ): Promise<any> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get current rating
    const currentRating = await this.prisma.rating.findUnique({
      where: {
        userId_timeControl: {
          userId,
          timeControl,
        },
      },
    });

    if (!currentRating) {
      throw new NotFoundException(
        `Rating not found for time control: ${timeControl}`,
      );
    }

    const oldRating = currentRating.rating;
    const ratingChange = newRating - oldRating;

    // Update rating
    const updatedRating = await this.prisma.rating.update({
      where: {
        userId_timeControl: {
          userId,
          timeControl,
        },
      },
      data: {
        rating: newRating,
        peakRating:
          newRating > currentRating.peakRating
            ? newRating
            : currentRating.peakRating,
      },
    });

    // Create rating history entry
    await this.prisma.ratingHistory.create({
      data: {
        userId,
        timeControl,
        ratingBefore: oldRating,
        ratingAfter: newRating,
        ratingChange,
        gameId: null, // Manual adjustment, no game associated
      },
    });

    // Log the adjustment
    await this.loggingService.createLog({
      level: 'INFO' as any,
      message: `Rating manually adjusted for user ${user.username}`,
      context: 'RATING_ADJUSTMENT',
      metadata: {
        performedBy: adjustedBy,
        targetUserId: userId,
        timeControl,
        oldRating,
        newRating,
        ratingChange,
        reason,
        username: user.username,
        displayName: user.displayName,
      },
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
      timeControl,
      oldRating,
      newRating,
      ratingChange,
      reason,
      adjustedBy,
      adjustedAt: new Date(),
    };
  }
}
