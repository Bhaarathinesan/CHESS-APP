import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsService } from './tournaments.service';
import { TournamentStateMachineService } from './tournament-state-machine.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TournamentFormat, TimeControl, TournamentStatus } from '@prisma/client';

describe('TournamentsService', () => {
  let service: TournamentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    tournament: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    tournamentPairing: {
      findMany: jest.fn(),
    },
  };

  const mockTournamentAdmin = {
    id: 'admin-id-1',
    username: 'admin1',
    displayName: 'Admin One',
    role: 'TOURNAMENT_ADMIN',
  };

  const mockPlayer = {
    id: 'player-id-1',
    username: 'player1',
    displayName: 'Player One',
    role: 'PLAYER',
  };

  const mockTournament = {
    id: 'tournament-id-1',
    name: 'Test Tournament',
    description: 'A test tournament',
    bannerUrl: null,
    creatorId: 'admin-id-1',
    format: TournamentFormat.SWISS,
    timeControl: TimeControl.BLITZ,
    initialTimeMinutes: 5,
    incrementSeconds: 3,
    isRated: true,
    status: TournamentStatus.CREATED,
    minPlayers: 4,
    maxPlayers: 16,
    currentPlayers: 0,
    roundsTotal: 5,
    roundsCompleted: 0,
    currentRound: 0,
    pairingMethod: 'automatic',
    tiebreakCriteria: 'buchholz',
    allowLateRegistration: false,
    spectatorDelaySeconds: 0,
    registrationDeadline: new Date('2024-12-31T10:00:00Z'),
    startTime: new Date('2024-12-31T12:00:00Z'),
    endTime: null,
    shareLink: 'abc123xyz',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...',
    prizeDescription: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: {
      id: 'admin-id-1',
      username: 'admin1',
      displayName: 'Admin One',
      avatarUrl: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        TournamentStateMachineService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TournamentsService>(TournamentsService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Set environment variable for QR code generation
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTournament', () => {
    const validCreateDto = {
      name: 'Test Tournament',
      description: 'A test tournament',
      format: TournamentFormat.SWISS,
      timeControl: TimeControl.BLITZ,
      initialTimeMinutes: 5,
      incrementSeconds: 3,
      isRated: true,
      minPlayers: 4,
      maxPlayers: 16,
      roundsTotal: 5,
      pairingMethod: 'automatic',
      tiebreakCriteria: 'buchholz',
      allowLateRegistration: false,
      spectatorDelaySeconds: 0,
      registrationDeadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    };

    it('should create a tournament successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);
      mockPrismaService.tournament.findUnique.mockResolvedValue(null); // No existing share link
      mockPrismaService.tournament.create.mockResolvedValue(mockTournament);

      const result = await service.createTournament(
        validCreateDto,
        'admin-id-1',
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Tournament');
      expect(result.shareLink).toBeDefined();
      expect(result.qrCodeUrl).toBeDefined();
      expect(mockPrismaService.tournament.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if creator does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createTournament(validCreateDto, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not Tournament_Admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockPlayer);

      await expect(
        service.createTournament(validCreateDto, 'player-id-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if minPlayers > maxPlayers', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidDto = {
        ...validCreateDto,
        minPlayers: 20,
        maxPlayers: 10,
      };

      await expect(
        service.createTournament(invalidDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if registration deadline is in the past', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidDto = {
        ...validCreateDto,
        registrationDeadline: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      };

      await expect(
        service.createTournament(invalidDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if start time is before registration deadline', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidDto = {
        ...validCreateDto,
        registrationDeadline: new Date(Date.now() + 172800000).toISOString(),
        startTime: new Date(Date.now() + 86400000).toISOString(),
      };

      await expect(
        service.createTournament(invalidDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if Swiss format without roundsTotal', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidDto = {
        ...validCreateDto,
        format: TournamentFormat.SWISS,
        roundsTotal: undefined,
      };

      await expect(
        service.createTournament(invalidDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid time control', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidDto = {
        ...validCreateDto,
        timeControl: TimeControl.BULLET,
        initialTimeMinutes: 10, // Too high for bullet
      };

      await expect(
        service.createTournament(invalidDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTournamentById', () => {
    it('should return tournament with details', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);

      const result = await service.getTournamentById('tournament-id-1', true);

      expect(result).toBeDefined();
      expect(result.id).toBe('tournament-id-1');
      expect(result.name).toBe('Test Tournament');
    });

    it('should throw NotFoundException if tournament does not exist', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.getTournamentById('invalid-id', false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTournamentByShareLink', () => {
    it('should return tournament by share link', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);

      const result = await service.getTournamentByShareLink('abc123xyz');

      expect(result).toBeDefined();
      expect(result.shareLink).toBe('abc123xyz');
    });

    it('should throw NotFoundException if share link is invalid', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.getTournamentByShareLink('invalid-link'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTournaments', () => {
    it('should return paginated tournaments', async () => {
      mockPrismaService.tournament.count.mockResolvedValue(1);
      mockPrismaService.tournament.findMany.mockResolvedValue([mockTournament]);

      const result = await service.getTournaments({ page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.tournaments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter tournaments by format', async () => {
      mockPrismaService.tournament.count.mockResolvedValue(1);
      mockPrismaService.tournament.findMany.mockResolvedValue([mockTournament]);

      const result = await service.getTournaments({
        format: TournamentFormat.SWISS,
      });

      expect(result.tournaments).toHaveLength(1);
      expect(mockPrismaService.tournament.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ format: TournamentFormat.SWISS }),
        }),
      );
    });

    it('should filter tournaments by status', async () => {
      mockPrismaService.tournament.count.mockResolvedValue(1);
      mockPrismaService.tournament.findMany.mockResolvedValue([mockTournament]);

      const result = await service.getTournaments({
        status: TournamentStatus.REGISTRATION_OPEN,
      });

      expect(result.tournaments).toHaveLength(1);
      expect(mockPrismaService.tournament.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TournamentStatus.REGISTRATION_OPEN,
          }),
        }),
      );
    });

    it('should search tournaments by name', async () => {
      mockPrismaService.tournament.count.mockResolvedValue(1);
      mockPrismaService.tournament.findMany.mockResolvedValue([mockTournament]);

      const result = await service.getTournaments({ search: 'Test' });

      expect(result.tournaments).toHaveLength(1);
      expect(mockPrismaService.tournament.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('updateTournament', () => {
    const updateDto = {
      name: 'Updated Tournament',
      description: 'Updated description',
    };

    it('should update tournament successfully', async () => {
      const superAdmin = { ...mockTournamentAdmin, role: 'SUPER_ADMIN' };
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.user.findUnique.mockResolvedValue(superAdmin);
      mockPrismaService.tournament.update.mockResolvedValue({
        ...mockTournament,
        ...updateDto,
      });

      const result = await service.updateTournament(
        'tournament-id-1',
        updateDto,
        'admin-id-1',
      );

      expect(result.name).toBe('Updated Tournament');
      expect(mockPrismaService.tournament.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tournament does not exist', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTournament('invalid-id', updateDto, 'admin-id-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not creator or super admin', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.user.findUnique.mockResolvedValue(mockPlayer);

      await expect(
        service.updateTournament('tournament-id-1', updateDto, 'player-id-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if tournament has already started', async () => {
      const startedTournament = {
        ...mockTournament,
        status: TournamentStatus.IN_PROGRESS,
      };
      mockPrismaService.tournament.findUnique.mockResolvedValue(
        startedTournament,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      await expect(
        service.updateTournament('tournament-id-1', updateDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if updated minPlayers > maxPlayers', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidUpdate = {
        minPlayers: 20,
        maxPlayers: 10,
      };

      await expect(
        service.updateTournament('tournament-id-1', invalidUpdate, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPairings', () => {
    const mockTournament = {
      id: 'tournament-id-1',
      format: TournamentFormat.SWISS,
      currentRound: 2,
      roundsTotal: 5,
      status: TournamentStatus.ROUND_IN_PROGRESS,
    };

    const mockPairings = [
      {
        id: 'pairing-1',
        tournamentId: 'tournament-id-1',
        roundNumber: 1,
        whitePlayerId: 'user-id-1',
        blackPlayerId: 'user-id-2',
        gameId: 'game-1',
        result: 'WHITE_WIN',
        boardNumber: 1,
        isBye: false,
        createdAt: new Date(),
        whitePlayer: {
          id: 'user-id-1',
          username: 'player1',
          displayName: 'Player One',
          avatarUrl: null,
        },
        blackPlayer: {
          id: 'user-id-2',
          username: 'player2',
          displayName: 'Player Two',
          avatarUrl: null,
        },
        game: {
          id: 'game-1',
          status: 'COMPLETED',
          result: 'WHITE_WIN',
          terminationReason: 'CHECKMATE',
        },
      },
      {
        id: 'pairing-2',
        tournamentId: 'tournament-id-1',
        roundNumber: 2,
        whitePlayerId: 'user-id-1',
        blackPlayerId: 'user-id-3',
        gameId: 'game-2',
        result: null,
        boardNumber: 1,
        isBye: false,
        createdAt: new Date(),
        whitePlayer: {
          id: 'user-id-1',
          username: 'player1',
          displayName: 'Player One',
          avatarUrl: null,
        },
        blackPlayer: {
          id: 'user-id-3',
          username: 'player3',
          displayName: 'Player Three',
          avatarUrl: null,
        },
        game: {
          id: 'game-2',
          status: 'ACTIVE',
          result: null,
          terminationReason: null,
        },
      },
    ];

    it('should return pairing table for Swiss tournament (Requirement 12.5)', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(mockPairings);

      const result = await service.getPairings('tournament-id-1');

      expect(result.displayType).toBe('table');
      expect(result.format).toBe(TournamentFormat.SWISS);
      if (result.displayType === 'table') {
        expect(result.rounds).toHaveLength(2);
        expect(result.rounds[0].roundNumber).toBe(1);
        expect(result.rounds[1].roundNumber).toBe(2);
      }
    });

    it('should return pairing table for Round Robin tournament (Requirement 12.5)', async () => {
      const roundRobinTournament = {
        ...mockTournament,
        format: TournamentFormat.ROUND_ROBIN,
      };
      mockPrismaService.tournament.findUnique.mockResolvedValue(roundRobinTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(mockPairings);

      const result = await service.getPairings('tournament-id-1');

      expect(result.displayType).toBe('table');
      expect(result.format).toBe(TournamentFormat.ROUND_ROBIN);
    });

    it('should return bracket for Single Elimination tournament (Requirement 12.6)', async () => {
      const eliminationTournament = {
        ...mockTournament,
        format: TournamentFormat.SINGLE_ELIMINATION,
      };
      mockPrismaService.tournament.findUnique.mockResolvedValue(eliminationTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(mockPairings);

      const result = await service.getPairings('tournament-id-1');

      expect(result.displayType).toBe('bracket');
      expect(result.format).toBe(TournamentFormat.SINGLE_ELIMINATION);
      if (result.displayType === 'bracket') {
        expect(result.bracket).toBeDefined();
        expect(result.bracket[0]).toHaveProperty('roundName');
        expect(result.bracket[0].matches[0]).toHaveProperty('winner');
      }
    });

    it('should return bracket for Double Elimination tournament (Requirement 12.6)', async () => {
      const doubleElimTournament = {
        ...mockTournament,
        format: TournamentFormat.DOUBLE_ELIMINATION,
      };
      mockPrismaService.tournament.findUnique.mockResolvedValue(doubleElimTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(mockPairings);

      const result = await service.getPairings('tournament-id-1');

      expect(result.displayType).toBe('bracket');
      expect(result.format).toBe(TournamentFormat.DOUBLE_ELIMINATION);
    });

    it('should filter pairings by round number', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([mockPairings[0]]);

      const result = await service.getPairings('tournament-id-1', 1);

      expect(prismaService.tournamentPairing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tournamentId: 'tournament-id-1',
            roundNumber: 1,
          }),
        }),
      );
      if (result.displayType === 'table') {
        expect(result.rounds).toHaveLength(1);
        expect(result.rounds[0].roundNumber).toBe(1);
      }
    });

    it('should include player details in pairings', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(mockPairings);

      const result = await service.getPairings('tournament-id-1');

      if (result.displayType === 'table') {
        const pairing = result.rounds[0].pairings[0];
        expect(pairing.whitePlayer).toHaveProperty('id');
        expect(pairing.whitePlayer).toHaveProperty('username');
        expect(pairing.whitePlayer).toHaveProperty('displayName');
        expect(pairing.whitePlayer).toHaveProperty('avatarUrl');
      }
    });

    it('should include game details in pairings', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(mockPairings);

      const result = await service.getPairings('tournament-id-1');

      if (result.displayType === 'table') {
        const pairing = result.rounds[0].pairings[0];
        expect(pairing.game).toHaveProperty('id');
        expect(pairing.game).toHaveProperty('status');
        expect(pairing.game).toHaveProperty('result');
      }
    });

    it('should handle bye pairings', async () => {
      const pairingsWithBye = [
        {
          ...mockPairings[0],
          blackPlayerId: null,
          blackPlayer: null,
          gameId: null,
          game: null,
          result: 'BYE',
          isBye: true,
        },
      ];
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(pairingsWithBye);

      const result = await service.getPairings('tournament-id-1');

      if (result.displayType === 'table') {
        const byePairing = result.rounds[0].pairings[0];
        expect(byePairing.isBye).toBe(true);
        expect(byePairing.blackPlayer).toBeNull();
      }
    });

    it('should determine winner correctly for WHITE_WIN', async () => {
      const eliminationTournament = {
        ...mockTournament,
        format: TournamentFormat.SINGLE_ELIMINATION,
      };
      mockPrismaService.tournament.findUnique.mockResolvedValue(eliminationTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([mockPairings[0]]);

      const result = await service.getPairings('tournament-id-1');

      if (result.displayType === 'bracket') {
        const match = result.bracket[0].matches[0];
        expect(match.winner).toBe('user-id-1');
      }
    });

    it('should determine winner correctly for BLACK_WIN', async () => {
      const blackWinPairing = {
        ...mockPairings[0],
        result: 'BLACK_WIN',
      };
      const eliminationTournament = {
        ...mockTournament,
        format: TournamentFormat.SINGLE_ELIMINATION,
      };
      mockPrismaService.tournament.findUnique.mockResolvedValue(eliminationTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([blackWinPairing]);

      const result = await service.getPairings('tournament-id-1');

      if (result.displayType === 'bracket') {
        const match = result.bracket[0].matches[0];
        expect(match.winner).toBe('user-id-2');
      }
    });

    it('should determine winner correctly for BYE', async () => {
      const byePairing = {
        ...mockPairings[0],
        result: 'BYE',
        isBye: true,
        blackPlayerId: null,
        blackPlayer: null,
      };
      const eliminationTournament = {
        ...mockTournament,
        format: TournamentFormat.SINGLE_ELIMINATION,
      };
      mockPrismaService.tournament.findUnique.mockResolvedValue(eliminationTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([byePairing]);

      const result = await service.getPairings('tournament-id-1');

      if (result.displayType === 'bracket') {
        const match = result.bracket[0].matches[0];
        expect(match.winner).toBe('user-id-1');
      }
    });

    it('should return null winner for ongoing games', async () => {
      const eliminationTournament = {
        ...mockTournament,
        format: TournamentFormat.SINGLE_ELIMINATION,
      };
      mockPrismaService.tournament.findUnique.mockResolvedValue(eliminationTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([mockPairings[1]]);

      const result = await service.getPairings('tournament-id-1');

      if (result.displayType === 'bracket') {
        const match = result.bracket[0].matches[0];
        expect(match.winner).toBeNull();
      }
    });

    it('should generate correct round names for elimination brackets', async () => {
      const eliminationPairings = [
        { ...mockPairings[0], roundNumber: 1 },
        { ...mockPairings[0], id: 'p2', roundNumber: 1, boardNumber: 2 },
        { ...mockPairings[0], id: 'p3', roundNumber: 2 },
        { ...mockPairings[0], id: 'p4', roundNumber: 3 },
      ];
      const eliminationTournament = {
        ...mockTournament,
        format: TournamentFormat.SINGLE_ELIMINATION,
      };
      mockPrismaService.tournament.findUnique.mockResolvedValue(eliminationTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(eliminationPairings);

      const result = await service.getPairings('tournament-id-1');

      if (result.displayType === 'bracket') {
        expect(result.bracket[0].roundName).toBe('Round of 4');
        expect(result.bracket[1].roundName).toBe('Semi-Finals');
        expect(result.bracket[2].roundName).toBe('Final');
      }
    });

    it('should order pairings by round and board number', async () => {
      const unorderedPairings = [
        { ...mockPairings[1], roundNumber: 2, boardNumber: 2 },
        { ...mockPairings[0], roundNumber: 1, boardNumber: 1 },
        { ...mockPairings[0], id: 'p3', roundNumber: 2, boardNumber: 1 },
      ];
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(unorderedPairings);

      await service.getPairings('tournament-id-1');

      expect(prismaService.tournamentPairing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { roundNumber: 'asc' },
            { boardNumber: 'asc' },
          ],
        }),
      );
    });

    it('should return empty rounds for tournament with no pairings', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);

      const result = await service.getPairings('tournament-id-1');

      if (result.displayType === 'table') {
        expect(result.rounds).toEqual([]);
      }
    });

    it('should throw NotFoundException for non-existent tournament', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.getPairings('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include tournament metadata in response', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(mockPairings);

      const result = await service.getPairings('tournament-id-1');

      expect(result.tournamentId).toBe('tournament-id-1');
      expect(result.format).toBe(TournamentFormat.SWISS);
      expect(result.currentRound).toBe(2);
      if (result.displayType === 'table') {
        expect(result.totalRounds).toBe(5);
      }
    });
  });
});
