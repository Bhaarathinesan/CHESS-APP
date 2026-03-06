import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardsController } from './leaderboards.controller';
import { LeaderboardsService } from './leaderboards.service';
import { TimeControl } from '@prisma/client';

describe('LeaderboardsController', () => {
  let controller: LeaderboardsController;
  let service: LeaderboardsService;

  const mockLeaderboardsService = {
    getGlobalLeaderboard: jest.fn(),
    getCollegeLeaderboard: jest.fn(),
    getWeeklyLeaderboard: jest.fn(),
    searchPlayer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaderboardsController],
      providers: [
        {
          provide: LeaderboardsService,
          useValue: mockLeaderboardsService,
        },
      ],
    }).compile();

    controller = module.get<LeaderboardsController>(LeaderboardsController);
    service = module.get<LeaderboardsService>(LeaderboardsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGlobalLeaderboard', () => {
    it('should return global leaderboard', async () => {
      const mockResult = {
        leaderboard: [
          {
            rank: 1,
            userId: 'user1',
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: null,
            rating: 1800,
            gamesPlayed: 50,
            ratingTrend: 'up',
          },
        ],
        total: 1,
      };

      mockLeaderboardsService.getGlobalLeaderboard.mockResolvedValue(mockResult);

      const result = await controller.getGlobalLeaderboard(TimeControl.BLITZ, {
        page: 1,
        limit: 100,
      });

      expect(result).toEqual(mockResult);
      expect(service.getGlobalLeaderboard).toHaveBeenCalledWith(
        TimeControl.BLITZ,
        1,
        100,
      );
    });

    it('should use default pagination values', async () => {
      mockLeaderboardsService.getGlobalLeaderboard.mockResolvedValue({
        leaderboard: [],
        total: 0,
      });

      await controller.getGlobalLeaderboard(TimeControl.BLITZ, {});

      expect(service.getGlobalLeaderboard).toHaveBeenCalledWith(
        TimeControl.BLITZ,
        1,
        100,
      );
    });
  });

  describe('getCollegeLeaderboard', () => {
    it('should return college-specific leaderboard', async () => {
      const mockResult = {
        leaderboard: [
          {
            rank: 1,
            userId: 'user1',
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: null,
            rating: 1800,
            gamesPlayed: 50,
            ratingTrend: 'up',
            collegeName: 'Test College',
            collegeDomain: 'test.edu',
          },
        ],
        total: 1,
      };

      mockLeaderboardsService.getCollegeLeaderboard.mockResolvedValue(mockResult);

      const result = await controller.getCollegeLeaderboard(
        TimeControl.BLITZ,
        'test.edu',
        { page: 1, limit: 100 },
      );

      expect(result).toEqual(mockResult);
      expect(service.getCollegeLeaderboard).toHaveBeenCalledWith(
        TimeControl.BLITZ,
        'test.edu',
        1,
        100,
      );
    });
  });

  describe('getWeeklyLeaderboard', () => {
    it('should return weekly leaderboard', async () => {
      const mockLeaderboard = [
        {
          rank: 1,
          userId: 'user1',
          username: 'player1',
          displayName: 'Player One',
          avatarUrl: null,
          rating: 1800,
          gamesPlayed: 50,
          ratingTrend: 'up',
        },
      ];

      mockLeaderboardsService.getWeeklyLeaderboard.mockResolvedValue(
        mockLeaderboard,
      );

      const result = await controller.getWeeklyLeaderboard({
        timeControl: TimeControl.BLITZ,
        limit: 100,
      });

      expect(result).toEqual({ leaderboard: mockLeaderboard });
      expect(service.getWeeklyLeaderboard).toHaveBeenCalledWith(
        TimeControl.BLITZ,
        100,
      );
    });
  });

  describe('searchPlayer', () => {
    it('should search for a player', async () => {
      const mockPlayer = {
        rank: 5,
        userId: 'user1',
        username: 'player1',
        displayName: 'Player One',
        avatarUrl: null,
        rating: 1800,
        gamesPlayed: 50,
        ratingTrend: 'up',
      };

      mockLeaderboardsService.searchPlayer.mockResolvedValue(mockPlayer);

      const result = await controller.searchPlayer(TimeControl.BLITZ, 'player1');

      expect(result).toEqual({ player: mockPlayer });
      expect(service.searchPlayer).toHaveBeenCalledWith('player1', TimeControl.BLITZ);
    });

    it('should return null player if not found', async () => {
      mockLeaderboardsService.searchPlayer.mockResolvedValue(null);

      const result = await controller.searchPlayer(
        TimeControl.BLITZ,
        'nonexistent',
      );

      expect(result).toEqual({ player: null });
    });
  });
});
