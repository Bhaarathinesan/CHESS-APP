import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CloudinaryService } from './cloudinary.service';
import { BadRequestException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let cloudinaryService: CloudinaryService;

  const mockUser = {
    userId: 'user-123',
  };

  const mockUserProfile = {
    user: {
      id: 'user-123',
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
      bio: 'Test bio',
      country: 'USA',
      city: 'New York',
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
    },
    ratings: [
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
        isProvisional: false,
        kFactor: 20,
      },
    ],
    statistics: {
      totalGames: 50,
      wins: 25,
      losses: 20,
      draws: 5,
      winRate: 50,
    },
  };

  const mockPublicProfile = {
    user: {
      id: 'user-456',
      username: 'otheruser',
      displayName: 'Other User',
      avatarUrl: 'https://example.com/avatar2.jpg',
      bio: 'Other bio',
      country: 'Canada',
      city: 'Toronto',
      collegeName: 'Other College',
      isOnline: false,
      lastOnline: new Date(),
      createdAt: new Date(),
    },
    ratings: [],
    recentGames: [],
    achievements: [],
  };

  const mockUsersService = {
    getCurrentUser: jest.fn(),
    getUserProfile: jest.fn(),
    updateProfile: jest.fn(),
    updateSettings: jest.fn(),
    updateAvatar: jest.fn(),
    getDetailedStatistics: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadAvatar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return current user with ratings and statistics', async () => {
      mockUsersService.getCurrentUser.mockResolvedValue(mockUserProfile);

      const result = await controller.getCurrentUser(mockUser);

      expect(result).toEqual(mockUserProfile);
      expect(usersService.getCurrentUser).toHaveBeenCalledWith('user-123');
    });

    it('should include all rating categories', async () => {
      const profileWithAllRatings = {
        ...mockUserProfile,
        ratings: [
          { timeControl: 'BULLET', rating: 1400 },
          { timeControl: 'BLITZ', rating: 1500 },
          { timeControl: 'RAPID', rating: 1600 },
          { timeControl: 'CLASSICAL', rating: 1550 },
        ],
      };
      mockUsersService.getCurrentUser.mockResolvedValue(profileWithAllRatings);

      const result = await controller.getCurrentUser(mockUser);

      expect(result.ratings).toHaveLength(4);
      expect(result.ratings.map((r) => r.timeControl)).toEqual([
        'BULLET',
        'BLITZ',
        'RAPID',
        'CLASSICAL',
      ]);
    });
  });

  describe('getUserProfile', () => {
    it('should return public profile for specified user', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(mockPublicProfile);

      const result = await controller.getUserProfile('user-456');

      expect(result).toEqual(mockPublicProfile);
      expect(usersService.getUserProfile).toHaveBeenCalledWith('user-456');
    });

    it('should include recent games in profile', async () => {
      const profileWithGames = {
        ...mockPublicProfile,
        recentGames: [
          {
            id: 'game-1',
            whitePlayerId: 'user-456',
            blackPlayerId: 'user-789',
            result: 'WHITE_WIN',
            timeControl: 'BLITZ',
          },
        ],
      };
      mockUsersService.getUserProfile.mockResolvedValue(profileWithGames);

      const result = await controller.getUserProfile('user-456');

      expect(result.recentGames).toHaveLength(1);
    });

    it('should include achievements in profile', async () => {
      const profileWithAchievements = {
        ...mockPublicProfile,
        achievements: [
          {
            id: 'ua-1',
            userId: 'user-456',
            achievementId: 'ach-1',
            earnedAt: new Date(),
            achievement: {
              code: 'first_victory',
              name: 'First Victory',
              description: 'Win your first game',
            },
          },
        ],
      };
      mockUsersService.getUserProfile.mockResolvedValue(profileWithAchievements);

      const result = await controller.getUserProfile('user-456');

      expect(result.achievements).toHaveLength(1);
      expect(result.achievements[0].achievement.code).toBe('first_victory');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateDto = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        country: 'UK',
        city: 'London',
      };
      const updatedUser = {
        user: { ...mockUserProfile.user, ...updateDto },
      };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockUser, updateDto);

      expect(result.user.displayName).toBe('Updated Name');
      expect(usersService.updateProfile).toHaveBeenCalledWith('user-123', updateDto);
    });

    it('should allow partial updates', async () => {
      const updateDto = { bio: 'New bio only' };
      const updatedUser = {
        user: { ...mockUserProfile.user, bio: 'New bio only' },
      };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockUser, updateDto);

      expect(result.user.bio).toBe('New bio only');
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
        user: {
          themePreference: 'light',
          boardTheme: 'wood',
          pieceSet: 'classic',
          soundEnabled: false,
          soundVolume: 50,
        },
      };
      mockUsersService.updateSettings.mockResolvedValue(updatedUser);

      const result = await controller.updateSettings(mockUser, updateDto);

      expect(result.user.themePreference).toBe('light');
      expect(result.user.soundEnabled).toBe(false);
      expect(usersService.updateSettings).toHaveBeenCalledWith('user-123', updateDto);
    });

    it('should update notification preferences', async () => {
      const updateDto = {
        notificationPreferences: {
          gameChallenge: true,
          tournamentStart: false,
        },
      };
      const updatedUser = {
        user: { notificationPreferences: updateDto.notificationPreferences },
      };
      mockUsersService.updateSettings.mockResolvedValue(updatedUser);

      const result = await controller.updateSettings(mockUser, updateDto);

      expect(result.user.notificationPreferences).toEqual(updateDto.notificationPreferences);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar and return URL', async () => {
      const mockFile = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
      } as any;
      const avatarUrl = 'https://cloudinary.com/avatar.jpg';

      mockCloudinaryService.uploadAvatar.mockResolvedValue(avatarUrl);
      mockUsersService.updateAvatar.mockResolvedValue({ avatarUrl });

      const result = await controller.uploadAvatar(mockUser, mockFile);

      expect(result.avatarUrl).toBe(avatarUrl);
      expect(cloudinaryService.uploadAvatar).toHaveBeenCalledWith(mockFile, 'user-123');
      expect(usersService.updateAvatar).toHaveBeenCalledWith('user-123', avatarUrl);
    });

    it('should throw error if no file uploaded', async () => {
      await expect(controller.uploadAvatar(mockUser, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUserStatistics', () => {
    it('should return detailed statistics', async () => {
      const mockStats = {
        totalGames: 100,
        wins: 50,
        losses: 30,
        draws: 20,
        winRate: 50,
        performanceByTimeControl: {
          blitz: { gamesPlayed: 50, wins: 25, losses: 15, draws: 10 },
        },
        openingStats: [],
        timeManagement: { averageTimePerMove: 5000 },
        accuracy: { averageAccuracy: 85 },
        streaks: { currentWinStreak: 3, longestWinStreak: 10 },
        ratingHistory: [],
      };
      mockUsersService.getDetailedStatistics.mockResolvedValue(mockStats);

      const result = await controller.getUserStatistics('user-123', {});

      expect(result).toEqual(mockStats);
      expect(usersService.getDetailedStatistics).toHaveBeenCalledWith(
        'user-123',
        undefined,
        undefined,
        undefined,
      );
    });

    it('should filter statistics by time control', async () => {
      const query = { timeControl: 'BLITZ' as any };
      mockUsersService.getDetailedStatistics.mockResolvedValue({});

      await controller.getUserStatistics('user-123', query);

      expect(usersService.getDetailedStatistics).toHaveBeenCalledWith(
        'user-123',
        'BLITZ',
        undefined,
        undefined,
      );
    });

    it('should filter statistics by date range', async () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
      mockUsersService.getDetailedStatistics.mockResolvedValue({});

      await controller.getUserStatistics('user-123', query);

      expect(usersService.getDetailedStatistics).toHaveBeenCalledWith(
        'user-123',
        undefined,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );
    });
  });
});
