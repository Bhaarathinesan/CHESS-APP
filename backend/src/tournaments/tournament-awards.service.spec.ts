import { Test, TestingModule } from '@nestjs/testing';
import { TournamentAwardsService } from './tournament-awards.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TournamentAwardsService', () => {
  let service: TournamentAwardsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    tournament: {
      findUnique: jest.fn(),
    },
    tournamentAward: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentAwardsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TournamentAwardsService>(TournamentAwardsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('awardPrizes', () => {
    const tournamentId = 'tournament-123';
    const mockTournament = {
      id: tournamentId,
      name: 'Test Tournament',
      status: 'COMPLETED',
      players: [
        {
          userId: 'user-1',
          rank: 1,
          score: 5.5,
          user: {
            id: 'user-1',
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: 'avatar1.jpg',
          },
        },
        {
          userId: 'user-2',
          rank: 2,
          score: 5.0,
          user: {
            id: 'user-2',
            username: 'player2',
            displayName: 'Player Two',
            avatarUrl: 'avatar2.jpg',
          },
        },
        {
          userId: 'user-3',
          rank: 3,
          score: 4.5,
          user: {
            id: 'user-3',
            username: 'player3',
            displayName: 'Player Three',
            avatarUrl: 'avatar3.jpg',
          },
        },
      ],
    };

    const awardConfigs = [
      { placement: 1, title: '1st Place', description: 'Champion' },
      { placement: 2, title: '2nd Place', description: 'Runner-up' },
      { placement: 3, title: '3rd Place', description: 'Third Place' },
    ];

    it('should award prizes to top finishers', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentAward.findUnique.mockResolvedValue(null);
      mockPrismaService.tournamentAward.create.mockImplementation((args) => {
        return Promise.resolve({
          id: 'award-' + args.data.userId,
          ...args.data,
          createdAt: new Date(),
          user: mockTournament.players.find((p) => p.userId === args.data.userId)?.user,
        });
      });

      const result = await service.awardPrizes(tournamentId, awardConfigs);

      expect(result).toHaveLength(3);
      expect(result[0].placement).toBe(1);
      expect(result[0].awardTitle).toBe('1st Place');
      expect(result[0].userId).toBe('user-1');
      expect(result[1].placement).toBe(2);
      expect(result[2].placement).toBe(3);
      expect(mockPrismaService.tournamentAward.create).toHaveBeenCalledTimes(3);
    });

    it('should throw NotFoundException if tournament not found', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(service.awardPrizes(tournamentId, awardConfigs)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if tournament not completed', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue({
        ...mockTournament,
        status: 'IN_PROGRESS',
      });

      await expect(service.awardPrizes(tournamentId, awardConfigs)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.tournamentAward.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if no ranked players', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue({
        ...mockTournament,
        players: [
          {
            userId: 'user-1',
            rank: null,
            score: 5.5,
          },
        ],
      });

      await expect(service.awardPrizes(tournamentId, awardConfigs)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip placements with no players', async () => {
      const configsWithGap = [
        { placement: 1, title: '1st Place', description: 'Champion' },
        { placement: 5, title: '5th Place', description: 'Fifth' },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentAward.findUnique.mockResolvedValue(null);
      mockPrismaService.tournamentAward.create.mockImplementation((args) => {
        return Promise.resolve({
          id: 'award-' + args.data.userId,
          ...args.data,
          createdAt: new Date(),
          user: mockTournament.players.find((p) => p.userId === args.data.userId)?.user,
        });
      });

      const result = await service.awardPrizes(tournamentId, configsWithGap);

      expect(result).toHaveLength(1);
      expect(result[0].placement).toBe(1);
      expect(mockPrismaService.tournamentAward.create).toHaveBeenCalledTimes(1);
    });

    it('should update existing awards', async () => {
      const existingAward = {
        id: 'existing-award-1',
        tournamentId,
        userId: 'user-1',
        placement: 1,
        awardTitle: 'Old Title',
        awardDescription: 'Old Description',
        createdAt: new Date(),
      };

      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentAward.findUnique.mockResolvedValue(existingAward);
      mockPrismaService.tournamentAward.update.mockImplementation((args) => {
        return Promise.resolve({
          ...existingAward,
          ...args.data,
          user: mockTournament.players[0].user,
        });
      });

      const result = await service.awardPrizes(tournamentId, [awardConfigs[0]]);

      expect(result).toHaveLength(1);
      expect(result[0].awardTitle).toBe('1st Place');
      expect(mockPrismaService.tournamentAward.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.tournamentAward.create).not.toHaveBeenCalled();
    });

    it('should include user details in awards', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentAward.findUnique.mockResolvedValue(null);
      mockPrismaService.tournamentAward.create.mockImplementation((args) => {
        return Promise.resolve({
          id: 'award-' + args.data.userId,
          ...args.data,
          createdAt: new Date(),
          user: mockTournament.players.find((p) => p.userId === args.data.userId)?.user,
        });
      });

      const result = await service.awardPrizes(tournamentId, [awardConfigs[0]]);

      expect(result[0].username).toBe('player1');
      expect(result[0].displayName).toBe('Player One');
      expect(result[0].avatarUrl).toBe('avatar1.jpg');
    });
  });

  describe('getTournamentAwards', () => {
    const tournamentId = 'tournament-123';

    it('should return all awards for a tournament', async () => {
      const mockAwards = [
        {
          id: 'award-1',
          tournamentId,
          userId: 'user-1',
          placement: 1,
          awardTitle: '1st Place',
          awardDescription: 'Champion',
          createdAt: new Date(),
          user: {
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: 'avatar1.jpg',
          },
        },
        {
          id: 'award-2',
          tournamentId,
          userId: 'user-2',
          placement: 2,
          awardTitle: '2nd Place',
          awardDescription: 'Runner-up',
          createdAt: new Date(),
          user: {
            username: 'player2',
            displayName: 'Player Two',
            avatarUrl: 'avatar2.jpg',
          },
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({ id: tournamentId });
      mockPrismaService.tournamentAward.findMany.mockResolvedValue(mockAwards);

      const result = await service.getTournamentAwards(tournamentId);

      expect(result).toHaveLength(2);
      expect(result[0].placement).toBe(1);
      expect(result[1].placement).toBe(2);
      expect(mockPrismaService.tournamentAward.findMany).toHaveBeenCalledWith({
        where: { tournamentId },
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          placement: 'asc',
        },
      });
    });

    it('should throw NotFoundException if tournament not found', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(service.getTournamentAwards(tournamentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty array if no awards', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue({ id: tournamentId });
      mockPrismaService.tournamentAward.findMany.mockResolvedValue([]);

      const result = await service.getTournamentAwards(tournamentId);

      expect(result).toEqual([]);
    });
  });

  describe('getUserAwards', () => {
    const userId = 'user-123';

    it('should return all awards for a user', async () => {
      const mockAwards = [
        {
          id: 'award-1',
          tournamentId: 'tournament-1',
          userId,
          placement: 1,
          awardTitle: '1st Place',
          awardDescription: 'Champion',
          createdAt: new Date('2024-01-15'),
          user: {
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: 'avatar1.jpg',
          },
          tournament: {
            name: 'Tournament 1',
            format: 'SWISS',
            startTime: new Date('2024-01-10'),
            endTime: new Date('2024-01-15'),
          },
        },
        {
          id: 'award-2',
          tournamentId: 'tournament-2',
          userId,
          placement: 2,
          awardTitle: '2nd Place',
          awardDescription: 'Runner-up',
          createdAt: new Date('2024-01-20'),
          user: {
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: 'avatar1.jpg',
          },
          tournament: {
            name: 'Tournament 2',
            format: 'ROUND_ROBIN',
            startTime: new Date('2024-01-18'),
            endTime: new Date('2024-01-20'),
          },
        },
      ];

      mockPrismaService.tournamentAward.findMany.mockResolvedValue(mockAwards);

      const result = await service.getUserAwards(userId);

      expect(result).toHaveLength(2);
      expect(result[0].placement).toBe(1);
      expect(result[1].placement).toBe(2);
      expect(mockPrismaService.tournamentAward.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          tournament: {
            select: {
              name: true,
              format: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array if user has no awards', async () => {
      mockPrismaService.tournamentAward.findMany.mockResolvedValue([]);

      const result = await service.getUserAwards(userId);

      expect(result).toEqual([]);
    });
  });

  describe('deleteAwards', () => {
    const tournamentId = 'tournament-123';

    it('should delete all awards for a tournament', async () => {
      mockPrismaService.tournamentAward.deleteMany.mockResolvedValue({ count: 3 });

      await service.deleteAwards(tournamentId);

      expect(mockPrismaService.tournamentAward.deleteMany).toHaveBeenCalledWith({
        where: { tournamentId },
      });
    });
  });

  describe('parsePrizeDescription', () => {
    it('should return default awards for empty description', () => {
      const result = service.parsePrizeDescription('');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        placement: 1,
        title: '1st Place',
        description: 'Tournament Champion',
      });
      expect(result[1]).toEqual({
        placement: 2,
        title: '2nd Place',
        description: 'Runner-up',
      });
      expect(result[2]).toEqual({
        placement: 3,
        title: '3rd Place',
        description: 'Third Place',
      });
    });

    it('should parse structured prize description', () => {
      const description = '1st: Gold Medal - $500; 2nd: Silver Medal - $300; 3rd: Bronze Medal - $100';

      const result = service.parsePrizeDescription(description);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        placement: 1,
        title: 'Gold Medal',
        description: '$500',
      });
      expect(result[1]).toEqual({
        placement: 2,
        title: 'Silver Medal',
        description: '$300',
      });
      expect(result[2]).toEqual({
        placement: 3,
        title: 'Bronze Medal',
        description: '$100',
      });
    });

    it('should parse description with newlines', () => {
      const description = '1st: Champion Trophy - Best Player\n2nd: Runner-up Medal\n3rd: Third Place Certificate';

      const result = service.parsePrizeDescription(description);

      expect(result).toHaveLength(3);
      expect(result[0].placement).toBe(1);
      expect(result[0].title).toBe('Champion Trophy');
      expect(result[0].description).toBe('Best Player');
    });

    it('should handle ordinal suffixes', () => {
      const description = '1st: First; 2nd: Second; 3rd: Third; 4th: Fourth';

      const result = service.parsePrizeDescription(description);

      expect(result).toHaveLength(4);
      expect(result[0].placement).toBe(1);
      expect(result[1].placement).toBe(2);
      expect(result[2].placement).toBe(3);
      expect(result[3].placement).toBe(4);
    });

    it('should return default with description if parsing fails', () => {
      const description = 'Top 3 players get prizes';

      const result = service.parsePrizeDescription(description);

      expect(result).toHaveLength(3);
      expect(result[0].placement).toBe(1);
      expect(result[0].description).toBe('Top 3 players get prizes');
      expect(result[1].description).toBeUndefined();
      expect(result[2].description).toBeUndefined();
    });

    it('should handle description without dash separator', () => {
      const description = '1st: Champion; 2nd: Runner-up; 3rd: Third';

      const result = service.parsePrizeDescription(description);

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Champion');
      expect(result[0].description).toBeUndefined();
    });
  });
});
