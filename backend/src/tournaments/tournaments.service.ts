import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentStateMachineService } from './tournament-state-machine.service';
import { BanService } from '../admin/ban.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentQueryDto } from './dto/tournament-query.dto';
import {
  TournamentResponseDto,
  TournamentListResponseDto,
} from './dto/tournament-response.dto';
import { TournamentFormat, TournamentStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

// Generate URL-safe unique IDs for share links
function generateNanoid(length: number = 10): string {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: TournamentStateMachineService,
    private readonly banService: BanService,
  ) {}

  /**
   * Create a new tournament
   * Requirements: 9.1-9.6, 9.16
   * @param createTournamentDto Tournament creation data
   * @param creatorId User ID of the tournament creator
   * @returns Created tournament with share link and QR code
   */
  async createTournament(
    createTournamentDto: CreateTournamentDto,
    creatorId: string,
  ): Promise<TournamentResponseDto> {
    const {
      name,
      description,
      bannerUrl,
      format,
      timeControl,
      initialTimeMinutes,
      incrementSeconds,
      isRated = true,
      minPlayers,
      maxPlayers,
      roundsTotal,
      pairingMethod = 'automatic',
      tiebreakCriteria = 'buchholz',
      allowLateRegistration = false,
      spectatorDelaySeconds = 0,
      registrationDeadline,
      startTime,
      prizeDescription,
    } = createTournamentDto;

    // Validate creator exists and has Tournament_Admin role
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (
      creator.role !== 'TOURNAMENT_ADMIN' &&
      creator.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Only Tournament Admins can create tournaments',
      );
    }

    // Validate player limits
    if (minPlayers > maxPlayers) {
      throw new BadRequestException(
        'Minimum players cannot exceed maximum players',
      );
    }

    // Validate dates
    const regDeadline = new Date(registrationDeadline);
    const tournamentStart = new Date(startTime);
    const now = new Date();

    if (regDeadline <= now) {
      throw new BadRequestException(
        'Registration deadline must be in the future',
      );
    }

    if (tournamentStart <= regDeadline) {
      throw new BadRequestException(
        'Tournament start time must be after registration deadline',
      );
    }

    // Validate rounds for Swiss System
    if (format === TournamentFormat.SWISS && !roundsTotal) {
      throw new BadRequestException(
        'Swiss System tournaments require roundsTotal to be specified',
      );
    }

    // Validate time control settings
    this.validateTimeControl(timeControl, initialTimeMinutes, incrementSeconds);

    // Generate unique share link
    const shareLink = await this.generateUniqueShareLink();

    // Generate QR code URL (placeholder - would integrate with QR code service)
    const qrCodeUrl = this.generateQrCodeUrl(shareLink);

    // Create tournament
    const tournament = await this.prisma.tournament.create({
      data: {
        name,
        description,
        bannerUrl,
        creatorId,
        format,
        timeControl,
        initialTimeMinutes,
        incrementSeconds,
        isRated,
        status: TournamentStatus.CREATED,
        minPlayers,
        maxPlayers,
        roundsTotal,
        pairingMethod,
        tiebreakCriteria,
        allowLateRegistration,
        spectatorDelaySeconds,
        registrationDeadline: regDeadline,
        startTime: tournamentStart,
        shareLink,
        qrCodeUrl,
        prizeDescription,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.mapTournamentToResponse(tournament);
  }

  /**
   * Get tournament by ID with full details
   * Requirements: 9.1
   * @param tournamentId Tournament ID
   * @param includeDetails Whether to include players and pairings
   * @returns Tournament with optional details
   */
  async getTournamentById(
    tournamentId: string,
    includeDetails: boolean = false,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        players: includeDetails
          ? {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
              orderBy: [{ score: 'desc' }, { buchholzScore: 'desc' }],
            }
          : false,
        pairings: includeDetails
          ? {
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
              orderBy: [{ roundNumber: 'desc' }, { boardNumber: 'asc' }],
            }
          : false,
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID ${tournamentId} not found`,
      );
    }

    return this.mapTournamentToResponse(tournament);
  }

  /**
   * Get tournament by share link
   * Requirements: 9.16
   * @param shareLink Unique share link
   * @returns Tournament details
   */
  async getTournamentByShareLink(
    shareLink: string,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { shareLink },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: [{ score: 'desc' }, { buchholzScore: 'desc' }],
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return this.mapTournamentToResponse(tournament);
  }

  /**
   * Get tournaments with filtering and pagination
   * Requirements: 9.1
   * @param query Query parameters for filtering
   * @returns Paginated tournament list
   */
  async getTournaments(
    query: TournamentQueryDto,
  ): Promise<TournamentListResponseDto> {
    const {
      page = 1,
      limit = 20,
      format,
      timeControl,
      status,
      creatorId,
      startDateFrom,
      startDateTo,
      search,
    } = query;

    // Build where clause
    const where: any = {};

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

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await this.prisma.tournament.count({ where });

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
      },
      orderBy: {
        startTime: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      tournaments: tournaments.map((t) => this.mapTournamentToResponse(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update tournament details
   * Requirements: 9.1
   * @param tournamentId Tournament ID
   * @param updateTournamentDto Update data
   * @param userId User ID making the update
   * @returns Updated tournament
   */
  async updateTournament(
    tournamentId: string,
    updateTournamentDto: UpdateTournamentDto,
    userId: string,
  ): Promise<TournamentResponseDto> {
    // Get tournament
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID ${tournamentId} not found`,
      );
    }

    // Check authorization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (
      tournament.creatorId !== userId &&
      user?.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Only the tournament creator or Super Admin can update this tournament',
      );
    }

    // Prevent changes after tournament starts
    if (
      tournament.status !== TournamentStatus.CREATED &&
      tournament.status !== TournamentStatus.REGISTRATION_OPEN
    ) {
      throw new BadRequestException(
        'Cannot update tournament after it has started',
      );
    }

    // Validate player limits if provided
    if (
      updateTournamentDto.minPlayers &&
      updateTournamentDto.maxPlayers &&
      updateTournamentDto.minPlayers > updateTournamentDto.maxPlayers
    ) {
      throw new BadRequestException(
        'Minimum players cannot exceed maximum players',
      );
    }

    // Validate dates if provided
    if (updateTournamentDto.registrationDeadline) {
      const regDeadline = new Date(updateTournamentDto.registrationDeadline);
      const tournamentStart = updateTournamentDto.startTime
        ? new Date(updateTournamentDto.startTime)
        : tournament.startTime;

      if (tournamentStart <= regDeadline) {
        throw new BadRequestException(
          'Tournament start time must be after registration deadline',
        );
      }
    }

    // Update tournament
    const updatedTournament = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        ...updateTournamentDto,
        registrationDeadline: updateTournamentDto.registrationDeadline
          ? new Date(updateTournamentDto.registrationDeadline)
          : undefined,
        startTime: updateTournamentDto.startTime
          ? new Date(updateTournamentDto.startTime)
          : undefined,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.mapTournamentToResponse(updatedTournament);
  }

  /**
   * Generate a unique share link for tournament
   * Requirements: 9.16
   * @returns Unique share link
   */
  private async generateUniqueShareLink(): Promise<string> {
    let shareLink: string;
    let isUnique = false;

    // Try up to 10 times to generate a unique link
    for (let i = 0; i < 10; i++) {
      shareLink = generateNanoid();
      const existing = await this.prisma.tournament.findUnique({
        where: { shareLink },
      });

      if (!existing) {
        isUnique = true;
        break;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique share link');
    }

    return shareLink;
  }

  /**
   * Generate QR code URL for tournament share link
   * Requirements: 9.16
   * @param shareLink Tournament share link
   * @returns QR code URL
   */
  private generateQrCodeUrl(shareLink: string): string {
    // In production, this would integrate with a QR code generation service
    // For now, using a public QR code API
    const tournamentUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tournaments/${shareLink}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tournamentUrl)}`;
  }

  /**
   * Validate time control settings
   */
  private validateTimeControl(
    timeControl: string,
    initialTimeMinutes: number,
    incrementSeconds: number,
  ): void {
    const validTimeControls: Record<
      string,
      { minTime: number; maxTime: number }
    > = {
      BULLET: { minTime: 1, maxTime: 3 },
      BLITZ: { minTime: 3, maxTime: 10 },
      RAPID: { minTime: 10, maxTime: 30 },
      CLASSICAL: { minTime: 30, maxTime: 180 },
    };

    const range = validTimeControls[timeControl];
    if (!range) {
      throw new BadRequestException(`Invalid time control: ${timeControl}`);
    }

    if (
      initialTimeMinutes < range.minTime ||
      initialTimeMinutes > range.maxTime
    ) {
      throw new BadRequestException(
        `Invalid time for ${timeControl}: must be between ${range.minTime} and ${range.maxTime} minutes`,
      );
    }

    if (incrementSeconds < 0 || incrementSeconds > 60) {
      throw new BadRequestException(
        'Increment must be between 0 and 60 seconds',
      );
    }
  }

  /**
   * Map database tournament to response DTO
   */
  private mapTournamentToResponse(tournament: any): TournamentResponseDto {
    return {
      id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      bannerUrl: tournament.bannerUrl,
      creatorId: tournament.creatorId,
      creator: tournament.creator,
      format: tournament.format,
      timeControl: tournament.timeControl,
      initialTimeMinutes: tournament.initialTimeMinutes,
      incrementSeconds: tournament.incrementSeconds,
      isRated: tournament.isRated,
      status: tournament.status,
      minPlayers: tournament.minPlayers,
      maxPlayers: tournament.maxPlayers,
      currentPlayers: tournament.currentPlayers,
      roundsTotal: tournament.roundsTotal,
      roundsCompleted: tournament.roundsCompleted,
      currentRound: tournament.currentRound,
      pairingMethod: tournament.pairingMethod,
      tiebreakCriteria: tournament.tiebreakCriteria,
      allowLateRegistration: tournament.allowLateRegistration,
      spectatorDelaySeconds: tournament.spectatorDelaySeconds,
      registrationDeadline: tournament.registrationDeadline,
      startTime: tournament.startTime,
      endTime: tournament.endTime,
      shareLink: tournament.shareLink,
      qrCodeUrl: tournament.qrCodeUrl,
      prizeDescription: tournament.prizeDescription,
      createdAt: tournament.createdAt,
      updatedAt: tournament.updatedAt,
      players: tournament.players?.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        user: p.user,
        score: Number(p.score),
        wins: p.wins,
        losses: p.losses,
        draws: p.draws,
        buchholzScore: Number(p.buchholzScore),
        sonneborBerger: Number(p.sonneborBerger),
        rank: p.rank,
        isActive: p.isActive,
        hasBye: p.hasBye,
        joinedAt: p.joinedAt,
      })),
      pairings: tournament.pairings?.map((p: any) => ({
        id: p.id,
        tournamentId: p.tournamentId,
        roundNumber: p.roundNumber,
        whitePlayerId: p.whitePlayerId,
        blackPlayerId: p.blackPlayerId,
        whitePlayer: p.whitePlayer,
        blackPlayer: p.blackPlayer,
        gameId: p.gameId,
        result: p.result,
        boardNumber: p.boardNumber,
        isBye: p.isBye,
        createdAt: p.createdAt,
      })),
    };
  }

  /**
   * Join a tournament
   * Requirements: 10.2, 10.12
   * @param tournamentId Tournament ID
   * @param userId User ID joining the tournament
   * @returns Updated tournament with player added
   */
  async joinTournament(
    tournamentId: string,
    userId: string,
  ): Promise<TournamentResponseDto> {
    // Check if user is banned (Requirements: 24.16)
    const isBanned = await this.banService.isUserBanned(userId);
    if (isBanned) {
      throw new BadRequestException('Cannot join tournament while banned');
    }

    // Get tournament
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID ${tournamentId} not found`,
      );
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if player can join based on tournament status
    if (
      !this.stateMachine.canJoin(
        tournament.status,
        tournament.allowLateRegistration,
      )
    ) {
      throw new BadRequestException(
        `Cannot join tournament with status ${tournament.status}`,
      );
    }

    // Check registration deadline
    const now = new Date();
    if (
      tournament.status === TournamentStatus.REGISTRATION_OPEN &&
      now > tournament.registrationDeadline
    ) {
      throw new BadRequestException('Registration deadline has passed');
    }

    // Check if already joined
    const existingPlayer = tournament.players.find(
      (p) => p.userId === userId,
    );
    if (existingPlayer) {
      throw new ConflictException('Already registered for this tournament');
    }

    // Check max players limit
    if (tournament.currentPlayers >= tournament.maxPlayers) {
      throw new BadRequestException('Tournament is full');
    }

    // Add player to tournament
    await this.prisma.$transaction([
      this.prisma.tournamentPlayer.create({
        data: {
          tournamentId,
          userId,
        },
      }),
      this.prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          currentPlayers: {
            increment: 1,
          },
        },
      }),
    ]);

    // Return updated tournament
    return this.getTournamentById(tournamentId, true);
  }

  /**
   * Leave a tournament
   * Requirements: 10.2
   * @param tournamentId Tournament ID
   * @param userId User ID leaving the tournament
   * @returns Updated tournament with player removed
   */
  async leaveTournament(
    tournamentId: string,
    userId: string,
  ): Promise<TournamentResponseDto> {
    // Get tournament
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID ${tournamentId} not found`,
      );
    }

    // Check if player can leave based on tournament status
    if (!this.stateMachine.canLeave(tournament.status)) {
      throw new BadRequestException(
        `Cannot leave tournament with status ${tournament.status}. Tournament has already started.`,
      );
    }

    // Check if player is registered
    const player = await this.prisma.tournamentPlayer.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId,
          userId,
        },
      },
    });

    if (!player) {
      throw new NotFoundException('Not registered for this tournament');
    }

    // Remove player from tournament
    await this.prisma.$transaction([
      this.prisma.tournamentPlayer.delete({
        where: {
          id: player.id,
        },
      }),
      this.prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          currentPlayers: {
            decrement: 1,
          },
        },
      }),
    ]);

    // Return updated tournament
    return this.getTournamentById(tournamentId, true);
  }

  /**
   * Start a tournament
   * Requirements: 10.4, 10.13
   * @param tournamentId Tournament ID
   * @param userId User ID starting the tournament (must be admin)
   * @returns Updated tournament with IN_PROGRESS status
   */
  async startTournament(
    tournamentId: string,
    userId: string,
  ): Promise<TournamentResponseDto> {
    // Get tournament
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID ${tournamentId} not found`,
      );
    }

    // Check authorization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (
      tournament.creatorId !== userId &&
      user?.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Only the tournament creator or Super Admin can start this tournament',
      );
    }

    // Check if tournament can be started
    if (!this.stateMachine.canBeStarted(tournament.status)) {
      throw new BadRequestException(
        `Cannot start tournament with status ${tournament.status}`,
      );
    }

    // Check minimum players requirement
    if (tournament.currentPlayers < tournament.minPlayers) {
      throw new BadRequestException(
        `Cannot start tournament. Minimum ${tournament.minPlayers} players required, but only ${tournament.currentPlayers} registered.`,
      );
    }

    // Validate status transition
    this.stateMachine.validateTransition(
      tournament.status,
      TournamentStatus.IN_PROGRESS,
    );

    // Update tournament status
    const updatedTournament = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: TournamentStatus.IN_PROGRESS,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // TODO: Trigger first round pairing generation (will be implemented in pairing task)
    // TODO: Notify all registered players (will be implemented when notification service is available)

    return this.mapTournamentToResponse(updatedTournament);
  }

  /**
   * Auto-cancel tournament if minimum players not reached by start time
   * Requirements: 10.13
   * @param tournamentId Tournament ID
   * @returns Updated tournament with CANCELLED status or null if not cancelled
   */
  async autoCancelIfMinimumNotReached(
    tournamentId: string,
  ): Promise<TournamentResponseDto | null> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: true,
      },
    });

    if (!tournament) {
      return null;
    }

    const now = new Date();

    // Only auto-cancel if:
    // 1. Tournament hasn't started yet
    // 2. Start time has passed
    // 3. Minimum players not reached
    if (
      (tournament.status === TournamentStatus.REGISTRATION_OPEN ||
        tournament.status === TournamentStatus.REGISTRATION_CLOSED) &&
      now >= tournament.startTime &&
      tournament.currentPlayers < tournament.minPlayers
    ) {
      const updatedTournament = await this.prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: TournamentStatus.CANCELLED,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      // TODO: Notify all registered players about cancellation

      return this.mapTournamentToResponse(updatedTournament);
    }

    return null;
  }

  /**
   * Cancel a tournament
   * Requirements: 10.8, 10.9
   * @param tournamentId Tournament ID
   * @param userId User ID cancelling the tournament (must be admin)
   * @returns Updated tournament with CANCELLED status
   */
  async cancelTournament(
    tournamentId: string,
    userId: string,
  ): Promise<TournamentResponseDto> {
    // Get tournament with players
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
      throw new NotFoundException(
        `Tournament with ID ${tournamentId} not found`,
      );
    }

    // Check authorization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (
      tournament.creatorId !== userId &&
      user?.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Only the tournament creator or Super Admin can cancel this tournament',
      );
    }

    // Check if tournament can be cancelled
    if (!this.stateMachine.canBeCancelled(tournament.status)) {
      throw new BadRequestException(
        `Cannot cancel tournament with status ${tournament.status}. Tournament has already started.`,
      );
    }

    // Validate status transition
    this.stateMachine.validateTransition(
      tournament.status,
      TournamentStatus.CANCELLED,
    );

    // Update tournament status
    const updatedTournament = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: TournamentStatus.CANCELLED,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // TODO: Notify all registered players within 5 minutes (Requirement 10.9)
    // This will be implemented when notification service is available
    // For now, we'll log the player IDs that need to be notified
    const playerIds = tournament.players.map((p) => p.userId);
    console.log(
      `Tournament ${tournamentId} cancelled. Need to notify ${playerIds.length} players:`,
      playerIds,
    );

    return this.mapTournamentToResponse(updatedTournament);
  }

  /**
   * Pause an ongoing tournament round
   * Requirements: 10.10
   * @param tournamentId Tournament ID
   * @param userId User ID pausing the tournament (must be admin)
   * @returns Updated tournament with IN_PROGRESS status (paused)
   */
  async pauseTournament(
    tournamentId: string,
    userId: string,
  ): Promise<TournamentResponseDto> {
    // Get tournament
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID ${tournamentId} not found`,
      );
    }

    // Check authorization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (
      tournament.creatorId !== userId &&
      user?.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Only the tournament creator or Super Admin can pause this tournament',
      );
    }

    // Check if tournament is in a round
    if (tournament.status !== TournamentStatus.ROUND_IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot pause tournament with status ${tournament.status}. Only rounds in progress can be paused.`,
      );
    }

    // Validate status transition
    this.stateMachine.validateTransition(
      tournament.status,
      TournamentStatus.IN_PROGRESS,
    );

    // Update tournament status to IN_PROGRESS (paused state)
    const updatedTournament = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: TournamentStatus.IN_PROGRESS,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // TODO: Notify all players about pause
    // TODO: Pause all ongoing games in the current round (if game pause feature exists)

    return this.mapTournamentToResponse(updatedTournament);
  }

  /**
   * Resume a paused tournament round
   * Requirements: 10.11
   * @param tournamentId Tournament ID
   * @param userId User ID resuming the tournament (must be admin)
   * @returns Updated tournament with ROUND_IN_PROGRESS status
   */
  async resumeTournament(
    tournamentId: string,
    userId: string,
  ): Promise<TournamentResponseDto> {
    // Get tournament
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID ${tournamentId} not found`,
      );
    }

    // Check authorization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (
      tournament.creatorId !== userId &&
      user?.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Only the tournament creator or Super Admin can resume this tournament',
      );
    }

    // Check if tournament is paused (IN_PROGRESS with current round > 0)
    if (
      tournament.status !== TournamentStatus.IN_PROGRESS ||
      tournament.currentRound === 0
    ) {
      throw new BadRequestException(
        `Cannot resume tournament with status ${tournament.status}. Only paused rounds can be resumed.`,
      );
    }

    // Validate status transition
    this.stateMachine.validateTransition(
      tournament.status,
      TournamentStatus.ROUND_IN_PROGRESS,
    );

    // Update tournament status to ROUND_IN_PROGRESS
    const updatedTournament = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: TournamentStatus.ROUND_IN_PROGRESS,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // TODO: Notify all players about resume
    // TODO: Resume all paused games in the current round (if game pause feature exists)

    return this.mapTournamentToResponse(updatedTournament);
  }

  /**
   * Get tournament pairings
   * Requirements: 12.5, 12.6
   * @param tournamentId Tournament ID
   * @param roundNumber Optional round number to filter by
   * @returns Pairings formatted based on tournament format
   */
  async getPairings(tournamentId: string, roundNumber?: number) {
    // Get tournament to check format
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        format: true,
        currentRound: true,
        roundsTotal: true,
        status: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID ${tournamentId} not found`,
      );
    }

    // Build query for pairings
    const where: any = { tournamentId };
    if (roundNumber !== undefined) {
      where.roundNumber = roundNumber;
    }

    // Fetch pairings with player and game details
    const pairings = await this.prisma.tournamentPairing.findMany({
      where,
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
        game: {
          select: {
            id: true,
            status: true,
            result: true,
            terminationReason: true,
          },
        },
      },
      orderBy: [
        { roundNumber: 'asc' },
        { boardNumber: 'asc' },
      ],
    });

    // Format response based on tournament format
    if (
      tournament.format === 'SINGLE_ELIMINATION' ||
      tournament.format === 'DOUBLE_ELIMINATION'
    ) {
      // Return bracket structure for elimination tournaments
      return this.formatEliminationBracket(pairings, tournament);
    } else {
      // Return pairing table for Swiss/Round Robin/Arena
      return this.formatPairingTable(pairings, tournament);
    }
  }

  /**
   * Format pairings as a table for Swiss, Round Robin, and Arena tournaments
   * Requirements: 12.5
   */
  private formatPairingTable(pairings: any[], tournament: any) {
    // Group pairings by round
    const pairingsByRound = pairings.reduce((acc, pairing) => {
      if (!acc[pairing.roundNumber]) {
        acc[pairing.roundNumber] = [];
      }
      acc[pairing.roundNumber].push({
        id: pairing.id,
        boardNumber: pairing.boardNumber,
        whitePlayer: pairing.whitePlayer,
        blackPlayer: pairing.blackPlayer,
        result: pairing.result,
        isBye: pairing.isBye,
        game: pairing.game,
      });
      return acc;
    }, {});

    // Convert to array format
    const rounds = Object.keys(pairingsByRound)
      .map(Number)
      .sort((a, b) => a - b)
      .map((roundNumber) => ({
        roundNumber,
        pairings: pairingsByRound[roundNumber],
      }));

    return {
      tournamentId: tournament.id,
      format: tournament.format,
      currentRound: tournament.currentRound,
      totalRounds: tournament.roundsTotal,
      displayType: 'table',
      rounds,
    };
  }

  /**
   * Format pairings as a bracket for elimination tournaments
   * Requirements: 12.6
   */
  private formatEliminationBracket(pairings: any[], tournament: any) {
    // Group pairings by round for bracket visualization
    const rounds = pairings.reduce((acc, pairing) => {
      if (!acc[pairing.roundNumber]) {
        acc[pairing.roundNumber] = [];
      }
      acc[pairing.roundNumber].push({
        id: pairing.id,
        boardNumber: pairing.boardNumber,
        whitePlayer: pairing.whitePlayer,
        blackPlayer: pairing.blackPlayer,
        result: pairing.result,
        isBye: pairing.isBye,
        game: pairing.game,
        winner: this.determineWinner(pairing),
      });
      return acc;
    }, {});

    // Convert to bracket structure
    const bracketRounds = Object.keys(rounds)
      .map(Number)
      .sort((a, b) => a - b)
      .map((roundNumber) => {
        // Calculate round name based on remaining players
        const roundName = this.getEliminationRoundName(
          roundNumber,
          tournament.format,
          rounds,
        );
        return {
          roundNumber,
          roundName,
          matches: rounds[roundNumber],
        };
      });

    return {
      tournamentId: tournament.id,
      format: tournament.format,
      currentRound: tournament.currentRound,
      displayType: 'bracket',
      bracket: bracketRounds,
    };
  }

  /**
   * Determine the winner of a pairing
   */
  private determineWinner(pairing: any): string | null {
    if (!pairing.result) return null;

    if (pairing.result === 'WHITE_WIN') {
      return pairing.whitePlayerId;
    } else if (pairing.result === 'BLACK_WIN') {
      return pairing.blackPlayerId;
    } else if (pairing.result === 'BYE') {
      return pairing.whitePlayerId;
    }
    return null; // Draw or no result yet
  }

  /**
   * Get human-readable round name for elimination tournaments
   */
  private getEliminationRoundName(
    roundNumber: number,
    format: string,
    rounds: any,
  ): string {
    const totalRounds = Object.keys(rounds).length;
    const roundsFromEnd = totalRounds - roundNumber;

    if (roundsFromEnd === 0) {
      return 'Final';
    } else if (roundsFromEnd === 1) {
      return 'Semi-Finals';
    } else if (roundsFromEnd === 2) {
      return 'Quarter-Finals';
    } else {
      // Calculate number of players in this round
      const matchesInRound = rounds[roundNumber].length;
      const playersInRound = matchesInRound * 2;
      return `Round of ${playersInRound}`;
    }
  }

  /**
   * Get tournament history for a player
   * Requirements: 12.11
   * Returns all tournaments a player has participated in with their performance stats
   */
  async getTournamentHistory(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const { status, limit = 50, offset = 0 } = options || {};

    // Build where clause
    const whereClause: any = {
      userId,
    };

    if (status) {
      whereClause.tournament = {
        status,
      };
    }

    // Get tournament participations
    const participations = await this.prisma.tournamentPlayer.findMany({
      where: whereClause,
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            format: true,
            timeControl: true,
            startTime: true,
            endTime: true,
            status: true,
            currentPlayers: true,
            isRated: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count
    const totalCount = await this.prisma.tournamentPlayer.count({
      where: whereClause,
    });

    // Transform to response format
    const tournaments = participations.map((participation) => ({
      tournamentId: participation.tournament.id,
      tournamentName: participation.tournament.name,
      format: participation.tournament.format,
      timeControl: participation.tournament.timeControl,
      startTime: participation.tournament.startTime,
      endTime: participation.tournament.endTime,
      status: participation.tournament.status,
      placement: participation.rank,
      totalPlayers: participation.tournament.currentPlayers,
      score: Number(participation.score),
      wins: participation.wins,
      losses: participation.losses,
      draws: participation.draws,
      isRated: participation.tournament.isRated,
    }));

    // Calculate statistics
    const completedTournaments = tournaments.filter(
      (t) => t.status === 'COMPLETED',
    ).length;
    const activeTournaments = tournaments.filter(
      (t) =>
        t.status === 'IN_PROGRESS' ||
        t.status === 'ROUND_IN_PROGRESS' ||
        t.status === 'ROUND_COMPLETED' ||
        t.status === 'REGISTRATION_OPEN' ||
        t.status === 'REGISTRATION_CLOSED',
    ).length;
    const topPlacements = tournaments.filter(
      (t) => t.placement !== null && t.placement <= 3,
    ).length;

    return {
      userId,
      totalTournaments: totalCount,
      completedTournaments,
      activeTournaments,
      topPlacements,
      tournaments,
    };
  }
}
