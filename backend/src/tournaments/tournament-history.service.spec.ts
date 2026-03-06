import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsService } from './tournaments.service';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentStateMachineService } from './tournament-state-machine.service';

describe('TournamentsService - Tournament History', () => {
  let service: TournamentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    tournamentPlayer: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockStateMachineService = {
    canTransition: jest.fn(),
    transition: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TournamentStateMachineService,
          useValue: mockStateMachineService,
        },
      ],
    }).compile();

    service = module.get<TournamentsService>(TournamentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTournamentHistory', () => {
    const userId = 'user-123';
    const mockParticipations = [
      {
        id: 'tp-1',
        userId,
        tournamentId: 'tournament-1',
        score: 5.5,
        wins: 5,
        losses: 1,
        draws: 1,
        rank: 1,
        joinedAt: new Date('2024-01-15'),
        tournament: {
          id: 'tournament-1',
          name: 'Spring Championship',
          format: 'SWISS',
          timeControl: 'BLITZ',
          startTime: new Date('2024-01-10'),
          endTime: new Date('2024-01-15'),
          status: 'COMPLETED',
          currentPlayers: 32,
          isRated: true,
        },
      },
      {
        id: 'tp-2',
        userId,
        tournamentId: 'tournament-2',
        score: 3.0,
        wins: 3,
        losses: 2,
        draws: 0,
        rank: 5,
        joinedAt: new Date('2024-01-20'),
        tournament: {
          id: 'tournament-2',
          name: 'Winter Open',
          format: 'ROUND_ROBIN',
          timeControl: 'RAPID',
          startTime: new Date('2024-01-18'),
          endTime: null,
          status: 'IN_PROGRESS',
          currentPlayers: 16,
          isRated: true,
        },
      },
      {
        id: 'tp-3',
        userId,
        tournamentId: 'tournament-3',
        score: 4.0,
        wins: 4,
        losses: 0,
        draws: 0,
        rank: 2,
        joinedAt: new Date('2024-01-05'),
        tournament: {
          id: 'tournament-3',
          name: 'New Year Blitz',
          format: 'SINGLE_ELIMINATION',
          timeControl: 'BULLET',
          startTime: new Date('2024-01-01'),
          endTime: new Date('2024-01-05'),
          status: 'COMPLETED',
          currentPlayers: 64,
          isRated: false,
        },
      },
    ];

    it('should return tournament history for a player', async () => {
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue(
        mockParticipations,
      );
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(3);

      const result = await service.getTournamentHistory(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.totalTournaments).toBe(3);
      expect(result.tournaments).toHaveLength(3);
      expect(prisma.tournamentPlayer.findMany).toHaveBeenCalledWith({
        where: { userId },
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
        orderBy: { joinedAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should calculate statistics correctly', async () => {
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue(
        mockParticipations,
      );
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(3);

      const result = await service.getTournamentHistory(userId);

      expect(result.completedTournaments).toBe(2);
      expect(result.activeTournaments).toBe(1);
      expect(result.topPlacements).toBe(2); // Ranks 1 and 2
    });

    it('should format tournament data correctly', async () => {
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        mockParticipations[0],
      ]);
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(1);

      const result = await service.getTournamentHistory(userId);

      const tournament = result.tournaments[0];
      expect(tournament.tournamentId).toBe('tournament-1');
      expect(tournament.tournamentName).toBe('Spring Championship');
      expect(tournament.format).toBe('SWISS');
      expect(tournament.timeControl).toBe('BLITZ');
      expect(tournament.placement).toBe(1);
      expect(tournament.totalPlayers).toBe(32);
      expect(tournament.score).toBe(5.5);
      expect(tournament.wins).toBe(5);
      expect(tournament.losses).toBe(1);
      expect(tournament.draws).toBe(1);
      expect(tournament.isRated).toBe(true);
    });

    it('should filter by tournament status', async () => {
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        mockParticipations[0],
        mockParticipations[2],
      ]);
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(2);

      await service.getTournamentHistory(userId, { status: 'COMPLETED' });

      expect(prisma.tournamentPlayer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            tournament: { status: 'COMPLETED' },
          },
        }),
      );
    });

    it('should support pagination with limit and offset', async () => {
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        mockParticipations[1],
      ]);
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(3);

      await service.getTournamentHistory(userId, { limit: 1, offset: 1 });

      expect(prisma.tournamentPlayer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1,
          skip: 1,
        }),
      );
    });

    it('should use default pagination values', async () => {
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(0);

      await service.getTournamentHistory(userId);

      expect(prisma.tournamentPlayer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it('should handle empty tournament history', async () => {
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(0);

      const result = await service.getTournamentHistory(userId);

      expect(result.totalTournaments).toBe(0);
      expect(result.completedTournaments).toBe(0);
      expect(result.activeTournaments).toBe(0);
      expect(result.topPlacements).toBe(0);
      expect(result.tournaments).toHaveLength(0);
    });

    it('should handle tournaments with null placement', async () => {
      const participationWithoutRank = {
        ...mockParticipations[1],
        rank: null,
      };
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        participationWithoutRank,
      ]);
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(1);

      const result = await service.getTournamentHistory(userId);

      expect(result.tournaments[0].placement).toBeNull();
      expect(result.topPlacements).toBe(0);
    });

    it('should count only top 3 placements', async () => {
      const participations = [
        { ...mockParticipations[0], rank: 1 },
        { ...mockParticipations[1], rank: 2 },
        { ...mockParticipations[2], rank: 3 },
        {
          ...mockParticipations[0],
          id: 'tp-4',
          rank: 4,
          tournament: { ...mockParticipations[0].tournament, status: 'COMPLETED' },
        },
      ];
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue(
        participations,
      );
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(4);

      const result = await service.getTournamentHistory(userId);

      expect(result.topPlacements).toBe(3);
    });

    it('should convert decimal score to number', async () => {
      const participationWithDecimal = {
        ...mockParticipations[0],
        score: { toNumber: () => 5.5 } as any,
      };
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        participationWithDecimal,
      ]);
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(1);

      const result = await service.getTournamentHistory(userId);

      expect(typeof result.tournaments[0].score).toBe('number');
      expect(result.tournaments[0].score).toBe(5.5);
    });

    it('should order tournaments by joinedAt descending', async () => {
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue(
        mockParticipations,
      );
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(3);

      await service.getTournamentHistory(userId);

      expect(prisma.tournamentPlayer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { joinedAt: 'desc' },
        }),
      );
    });

    it('should count all active tournament statuses', async () => {
      const activeStatuses = [
        'IN_PROGRESS',
        'ROUND_IN_PROGRESS',
        'ROUND_COMPLETED',
        'REGISTRATION_OPEN',
        'REGISTRATION_CLOSED',
      ];

      const participations = activeStatuses.map((status, index) => ({
        ...mockParticipations[0],
        id: `tp-${index}`,
        tournament: {
          ...mockParticipations[0].tournament,
          status,
        },
      }));

      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue(
        participations,
      );
      mockPrismaService.tournamentPlayer.count.mockResolvedValue(
        participations.length,
      );

      const result = await service.getTournamentHistory(userId);

      expect(result.activeTournaments).toBe(5);
    });
  });
});
