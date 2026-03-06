import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeControl } from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        count: jest.fn(),
      },
      game: {
        count: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      tournamentPlayer: {
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prismaService = module.get(PrismaService);
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics with all required sections', async () => {
      // Setup mocks - need to mock in the exact order they're called
      // getUserMetrics calls user.count 5 times, then getUsageMetrics calls it once more
      prismaService.user.count
        .mockResolvedValueOnce(1000) // total users
        .mockResolvedValueOnce(150) // DAU
        .mockResolvedValueOnce(400) // WAU
        .mockResolvedValueOnce(700) // MAU
        .mockResolvedValueOnce(50) // new registrations
        .mockResolvedValueOnce(1000); // for tournament participation

      // getGameMetrics calls
      prismaService.game.count.mockResolvedValueOnce(5000); // total games
      prismaService.game.findMany.mockResolvedValueOnce([
        {
          startedAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:15:00Z'),
        },
      ]); // for average duration
      prismaService.game.groupBy.mockResolvedValueOnce([
        { timeControl: TimeControl.BLITZ, _count: { timeControl: 2500 } },
      ]); // for popular time controls

      // getUsageMetrics calls
      prismaService.game.findMany.mockResolvedValueOnce([
        { createdAt: new Date('2024-01-01T14:00:00Z') },
        { createdAt: new Date('2024-01-01T19:00:00Z') },
      ]); // for peak usage hours
      prismaService.tournamentPlayer.groupBy.mockResolvedValueOnce(
        Array(300).fill({ userId: 'unique-id' }),
      ); // for tournament participation

      const result = await service.getDashboardMetrics();

      expect(result).toHaveProperty('userMetrics');
      expect(result).toHaveProperty('gameMetrics');
      expect(result).toHaveProperty('usageMetrics');
      expect(result).toHaveProperty('serverMetrics');
      expect(result.userMetrics.totalUsers).toBe(1000);
      expect(result.gameMetrics.totalGames).toBe(5000);
    });

    it('should handle empty database gracefully', async () => {
      prismaService.user.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      prismaService.game.count.mockResolvedValueOnce(0);
      prismaService.game.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaService.game.groupBy.mockResolvedValueOnce([]);
      prismaService.tournamentPlayer.groupBy.mockResolvedValueOnce([]);

      const result = await service.getDashboardMetrics();

      expect(result.userMetrics.totalUsers).toBe(0);
      expect(result.gameMetrics.totalGames).toBe(0);
      expect(result.gameMetrics.averageDuration).toBe(0);
    });
  });

  describe('getTournaments', () => {
    beforeEach(() => {
      prismaService.tournament = {
        count: jest.fn(),
        findMany: jest.fn(),
      };
    });

    it('should return paginated tournaments with filters', async () => {
      const mockTournaments = [
        {
          id: 'tournament-1',
          name: 'Test Tournament',
          description: 'Test description',
          format: 'SWISS',
          timeControl: 'BLITZ',
          status: 'REGISTRATION_OPEN',
          minPlayers: 4,
          maxPlayers: 100,
          isRated: true,
          startTime: new Date(),
          registrationDeadline: new Date(),
          createdAt: new Date(),
          creator: {
            id: 'user-1',
            username: 'testuser',
            displayName: 'Test User',
            avatarUrl: null,
          },
          _count: {
            players: 10,
          },
        },
      ];

      prismaService.tournament.count.mockResolvedValue(1);
      prismaService.tournament.findMany.mockResolvedValue(mockTournaments);

      const result = await service.getTournaments({
        page: 1,
        limit: 20,
        status: 'REGISTRATION_OPEN',
      });

      expect(result.tournaments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.tournaments[0].currentPlayers).toBe(10);
    });

    it('should handle search filter', async () => {
      prismaService.tournament.count.mockResolvedValue(0);
      prismaService.tournament.findMany.mockResolvedValue([]);

      await service.getTournaments({
        search: 'test',
        page: 1,
        limit: 20,
      });

      expect(prismaService.tournament.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
        },
      });
    });

    it('should handle date range filters', async () => {
      prismaService.tournament.count.mockResolvedValue(0);
      prismaService.tournament.findMany.mockResolvedValue([]);

      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      await service.getTournaments({
        startDateFrom: startDate,
        startDateTo: endDate,
        page: 1,
        limit: 20,
      });

      expect(prismaService.tournament.count).toHaveBeenCalledWith({
        where: {
          startTime: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      });
    });
  });

  describe('cancelTournamentAsAdmin', () => {
    beforeEach(() => {
      prismaService.tournament = {
        findUnique: jest.fn(),
        update: jest.fn(),
      };
      prismaService.notification = {
        create: jest.fn(),
      };
    });

    it('should cancel tournament and notify players', async () => {
      const mockTournament = {
        id: 'tournament-1',
        name: 'Test Tournament',
        status: 'REGISTRATION_OPEN',
        players: [
          {
            userId: 'user-1',
            user: {
              id: 'user-1',
              email: 'user1@test.com',
              displayName: 'User 1',
            },
          },
          {
            userId: 'user-2',
            user: {
              id: 'user-2',
              email: 'user2@test.com',
              displayName: 'User 2',
            },
          },
        ],
      };

      prismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      prismaService.tournament.update.mockResolvedValue({});
      prismaService.notification.create.mockResolvedValue({});

      await service.cancelTournamentAsAdmin('tournament-1', 'Test reason');

      expect(prismaService.tournament.update).toHaveBeenCalledWith({
        where: { id: 'tournament-1' },
        data: {
          status: 'CANCELLED',
          endTime: expect.any(Date),
        },
      });

      expect(prismaService.notification.create).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if tournament not found', async () => {
      prismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelTournamentAsAdmin('invalid-id', 'Test reason'),
      ).rejects.toThrow('Tournament not found');
    });

    it('should throw BadRequestException if tournament already completed', async () => {
      const mockTournament = {
        id: 'tournament-1',
        status: 'COMPLETED',
        players: [],
      };

      prismaService.tournament.findUnique.mockResolvedValue(mockTournament);

      await expect(
        service.cancelTournamentAsAdmin('tournament-1', 'Test reason'),
      ).rejects.toThrow('Cannot cancel tournament with status: COMPLETED');
    });

    it('should throw BadRequestException if tournament already cancelled', async () => {
      const mockTournament = {
        id: 'tournament-1',
        status: 'CANCELLED',
        players: [],
      };

      prismaService.tournament.findUnique.mockResolvedValue(mockTournament);

      await expect(
        service.cancelTournamentAsAdmin('tournament-1', 'Test reason'),
      ).rejects.toThrow('Cannot cancel tournament with status: CANCELLED');
    });
  });

  describe('updateTournamentAsAdmin', () => {
    beforeEach(() => {
      prismaService.tournament = {
        findUnique: jest.fn(),
        update: jest.fn(),
      };
    });

    it('should update tournament with provided data', async () => {
      const mockTournament = {
        id: 'tournament-1',
        name: 'Old Name',
        status: 'CREATED',
      };

      prismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      prismaService.tournament.update.mockResolvedValue({});

      await service.updateTournamentAsAdmin('tournament-1', {
        name: 'New Name',
        description: 'New description',
        minPlayers: 8,
      });

      expect(prismaService.tournament.update).toHaveBeenCalledWith({
        where: { id: 'tournament-1' },
        data: {
          name: 'New Name',
          description: 'New description',
          minPlayers: 8,
        },
      });
    });

    it('should throw NotFoundException if tournament not found', async () => {
      prismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTournamentAsAdmin('invalid-id', { name: 'New Name' }),
      ).rejects.toThrow('Tournament not found');
    });

    it('should handle date fields correctly', async () => {
      const mockTournament = {
        id: 'tournament-1',
        status: 'CREATED',
      };

      prismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      prismaService.tournament.update.mockResolvedValue({});

      const startTime = '2024-12-31T10:00:00Z';
      const registrationDeadline = '2024-12-30T10:00:00Z';

      await service.updateTournamentAsAdmin('tournament-1', {
        startTime,
        registrationDeadline,
      });

      expect(prismaService.tournament.update).toHaveBeenCalledWith({
        where: { id: 'tournament-1' },
        data: {
          startTime: new Date(startTime),
          registrationDeadline: new Date(registrationDeadline),
        },
      });
    });

    it('should only update provided fields', async () => {
      const mockTournament = {
        id: 'tournament-1',
        name: 'Original Name',
        status: 'CREATED',
      };

      prismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      prismaService.tournament.update.mockResolvedValue({});

      await service.updateTournamentAsAdmin('tournament-1', {
        isRated: false,
      });

      expect(prismaService.tournament.update).toHaveBeenCalledWith({
        where: { id: 'tournament-1' },
        data: {
          isRated: false,
        },
      });
    });
  });
});
