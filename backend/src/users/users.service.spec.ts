import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    rating: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    game: {
      findMany: jest.fn(),
    },
    userAchievement: {
      findMany: jest.fn(),
    },
    ratingHistory: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return current user with ratings and statistics', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        bio: null,
        country: null,
        city: null,
        collegeName: 'Test College',
        collegeDomain: 'test.edu',
        role: 'player',
        themePreference: 'dark',
        boardTheme: 'default',
        pieceSet: 'default',
        soundEnabled: true,
        soundVolume: 70,
        notificationPreferences: {},
        isOnline: true,
        lastOnline: new Date(),
        createdAt: new Date(),
      };

      const mockRatings = [
        {
          id: 'rating-1',
          userId: 'user-123',
          timeControl: 'BLITZ',
          rating: 1500,
          peakRating: 1550,
          gamesPlayed: 50,
          wins: 25,
          losses: 20,
          draws: 5,
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.rating.findMany.mockResolvedValue(mockRatings);

      const result = await service.getCurrentUser('user-123');

      expect(result.user).toEqual(mockUser);
      expect(result.ratings).toEqual(mockRatings);
      expect(result.statistics).toHaveProperty('totalGames');
      expect(result.statistics).toHaveProperty('wins');
      expect(result.statistics).toHaveProperty('losses');
      expect(result.statistics).toHaveProperty('draws');
      expect(result.statistics).toHaveProperty('winRate');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate correct statistics', async () => {
      const mockUser = { id: 'user-123' } as any;
      const mockRatings = [
        {
          userId: 'user-123',
          timeControl: 'BLITZ',
          gamesPlayed: 100,
          wins: 50,
          losses: 30,
          draws: 20,
        },
        {
          userId: 'user-123',
          timeControl: 'RAPID',
          gamesPlayed: 50,
          wins: 25,
          losses: 15,
          draws: 10,
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.rating.findMany.mockResolvedValue(mockRatings);

      const result = await service.getCurrentUser('user-123');

      expect(result.statistics.totalGames).toBe(150);
      expect(result.statistics.wins).toBe(75);
      expect(result.statistics.losses).toBe(45);
      expect(result.statistics.draws).toBe(30);
      expect(result.statistics.winRate).toBe(50);
    });
  });

  describe('getUserProfile', () => {
    it('should return public profile with recent games and achievements', async () => {
      const mockUser = {
        id: 'user-456',
        username: 'otheruser',
        displayName: 'Other User',
        avatarUrl: null,
        bio: null,
        country: null,
        city: null,
        collegeName: 'Test College',
        isOnline: false,
        lastOnline: new Date(),
        createdAt: new Date(),
      };

      const mockRatings = [];
      const mockGames = [
        {
          id: 'game-1',
          whitePlayerId: 'user-456',
          blackPlayerId: 'user-789',
          result: 'WHITE_WIN',
          whitePlayer: { id: 'user-456', username: 'otheruser', displayName: 'Other User', avatarUrl: null },
          blackPlayer: { id: 'user-789', username: 'opponent', displayName: 'Opponent', avatarUrl: null },
        },
      ];
      const mockAchievements = [];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.rating.findMany.mockResolvedValue(mockRatings);
      mockPrismaService.game.findMany.mockResolvedValue(mockGames);
      mockPrismaService.userAchievement.findMany.mockResolvedValue(mockAchievements);

      const result = await service.getUserProfile('user-456');

      expect(result.user).toEqual(mockUser);
      expect(result.ratings).toEqual(mockRatings);
      expect(result.recentGames).toEqual(mockGames);
      expect(result.achievements).toEqual(mockAchievements);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateDto = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        country: 'USA',
        city: 'New York',
      };

      const updatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Updated Name',
        bio: 'Updated bio',
        country: 'USA',
        city: 'New York',
        avatarUrl: null,
        collegeName: 'Test College',
        collegeDomain: 'test.edu',
        role: 'player',
        createdAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-123', updateDto);

      expect(result.user.displayName).toBe('Updated Name');
      expect(result.user.bio).toBe('Updated bio');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateDto,
        select: expect.any(Object),
      });
    });
  });

  describe('updateSettings', () => {
    it('should update user settings', async () => {
      const updateDto = {
        theme: 'light',
        boardTheme: 'wood',
        pieceSet: 'classic',
        soundEnabled: false,
        soundVolume: 50,
      };

      const updatedUser = {
        id: 'user-123',
        themePreference: 'light',
        boardTheme: 'wood',
        pieceSet: 'classic',
        soundEnabled: false,
        soundVolume: 50,
        notificationPreferences: {},
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateSettings('user-123', updateDto);

      expect(result.user.themePreference).toBe('light');
      expect(result.user.soundEnabled).toBe(false);
    });
  });

  describe('updateAvatar', () => {
    it('should update user avatar URL', async () => {
      const avatarUrl = 'https://cloudinary.com/avatar.jpg';
      const updatedUser = {
        id: 'user-123',
        avatarUrl,
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateAvatar('user-123', avatarUrl);

      expect(result.avatarUrl).toBe(avatarUrl);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { avatarUrl },
        select: { id: true, avatarUrl: true },
      });
    });
  });

  describe('getDetailedStatistics', () => {
    const mockGames = [
      {
        id: 'game-1',
        whitePlayerId: 'user-123',
        blackPlayerId: 'user-456',
        result: 'WHITE_WIN',
        timeControl: 'BLITZ',
        openingName: 'Sicilian Defense',
        completedAt: new Date('2024-01-15'),
        moves: [
          { color: 'white', timeTakenMs: 5000 },
          { color: 'black', timeTakenMs: 4000 },
          { color: 'white', timeTakenMs: 6000 },
        ],
        whitePlayer: { id: 'user-123', username: 'testuser', displayName: 'Test User' },
        blackPlayer: { id: 'user-456', username: 'opponent', displayName: 'Opponent' },
      },
      {
        id: 'game-2',
        whitePlayerId: 'user-456',
        blackPlayerId: 'user-123',
        result: 'DRAW',
        timeControl: 'BLITZ',
        openingName: 'French Defense',
        completedAt: new Date('2024-01-16'),
        moves: [
          { color: 'white', timeTakenMs: 3000 },
          { color: 'black', timeTakenMs: 4000 },
        ],
        whitePlayer: { id: 'user-456', username: 'opponent', displayName: 'Opponent' },
        blackPlayer: { id: 'user-123', username: 'testuser', displayName: 'Test User' },
      },
    ];

    beforeEach(() => {
      mockPrismaService.game.findMany.mockResolvedValue(mockGames);
      mockPrismaService.rating.findUnique.mockResolvedValue({
        rating: 1500,
        peakRating: 1550,
      });
      mockPrismaService.ratingHistory.findMany.mockResolvedValue([]);
    });

    it('should calculate win/loss/draw distribution', async () => {
      const result = await service.getDetailedStatistics('user-123');

      expect(result.wins).toBe(1);
      expect(result.draws).toBe(1);
      expect(result.losses).toBe(0);
      expect(result.totalGames).toBe(2);
    });

    it('should calculate performance by time control', async () => {
      const result = await service.getDetailedStatistics('user-123');

      expect(result.performanceByTimeControl).toHaveProperty('blitz');
      expect(result.performanceByTimeControl).toHaveProperty('rapid');
      expect(result.performanceByTimeControl).toHaveProperty('bullet');
      expect(result.performanceByTimeControl).toHaveProperty('classical');
    });

    it('should calculate opening statistics', async () => {
      const result = await service.getDetailedStatistics('user-123');

      expect(result.openingStats).toBeInstanceOf(Array);
      expect(result.openingStats.length).toBeGreaterThan(0);
      expect(result.openingStats[0]).toHaveProperty('opening');
      expect(result.openingStats[0]).toHaveProperty('gamesPlayed');
      expect(result.openingStats[0]).toHaveProperty('winRate');
    });

    it('should calculate time management statistics', async () => {
      const result = await service.getDetailedStatistics('user-123');

      expect(result.timeManagement).toHaveProperty('averageTimePerMove');
      expect(result.timeManagement).toHaveProperty('totalTimeSpent');
      expect(result.timeManagement).toHaveProperty('totalMoves');
    });

    it('should calculate streaks', async () => {
      const result = await service.getDetailedStatistics('user-123');

      expect(result.streaks).toHaveProperty('currentWinStreak');
      expect(result.streaks).toHaveProperty('longestWinStreak');
      expect(result.streaks).toHaveProperty('currentLossStreak');
      expect(result.streaks).toHaveProperty('longestLossStreak');
    });

    it('should calculate opponent statistics', async () => {
      const result = await service.getDetailedStatistics('user-123');

      expect(result.opponents).toBeInstanceOf(Array);
      if (result.opponents.length > 0) {
        expect(result.opponents[0]).toHaveProperty('opponent');
        expect(result.opponents[0]).toHaveProperty('total');
        expect(result.opponents[0]).toHaveProperty('wins');
        expect(result.opponents[0]).toHaveProperty('winRate');
      }
    });

    it('should calculate day of week performance', async () => {
      const result = await service.getDetailedStatistics('user-123');

      expect(result.dayOfWeekPerformance).toBeInstanceOf(Array);
      expect(result.dayOfWeekPerformance).toHaveLength(7);
      expect(result.dayOfWeekPerformance[0]).toHaveProperty('day');
      expect(result.dayOfWeekPerformance[0]).toHaveProperty('gamesPlayed');
      expect(result.dayOfWeekPerformance[0]).toHaveProperty('winRate');
    });

    it('should calculate performance trend', async () => {
      const result = await service.getDetailedStatistics('user-123');

      expect(result.performanceTrend).toBeInstanceOf(Array);
      if (result.performanceTrend.length > 0) {
        expect(result.performanceTrend[0]).toHaveProperty('date');
        expect(result.performanceTrend[0]).toHaveProperty('wins');
        expect(result.performanceTrend[0]).toHaveProperty('losses');
        expect(result.performanceTrend[0]).toHaveProperty('winRate');
      }
    });

    it('should filter by time control', async () => {
      const result = await service.getDetailedStatistics('user-123', 'BLITZ');

      expect(mockPrismaService.game.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timeControl: 'BLITZ',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await service.getDetailedStatistics('user-123', undefined, startDate, endDate);

      expect(mockPrismaService.game.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            completedAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });
  });
});
