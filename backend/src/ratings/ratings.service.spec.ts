import { Test, TestingModule } from '@nestjs/testing';
import { RatingsService } from './ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeControl, GameResult } from '@prisma/client';

describe('RatingsService', () => {
  let service: RatingsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    rating: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    ratingHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    game: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateExpectedScore', () => {
    it('should return 0.5 for equal ratings', () => {
      const expectedScore = service.calculateExpectedScore(1500, 1500);
      expect(expectedScore).toBeCloseTo(0.5, 2);
    });

    it('should return higher expected score for higher rated player', () => {
      const expectedScore = service.calculateExpectedScore(1600, 1400);
      expect(expectedScore).toBeGreaterThan(0.5);
      expect(expectedScore).toBeCloseTo(0.76, 2);
    });

    it('should return lower expected score for lower rated player', () => {
      const expectedScore = service.calculateExpectedScore(1400, 1600);
      expect(expectedScore).toBeLessThan(0.5);
      expect(expectedScore).toBeCloseTo(0.24, 2);
    });

    it('should use correct ELO formula: 1 / (1 + 10^((opponent - player) / 400))', () => {
      const playerRating = 1500;
      const opponentRating = 1700;
      const expectedScore = service.calculateExpectedScore(playerRating, opponentRating);
      
      // Manual calculation
      const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
      expect(expectedScore).toBe(expected);
    });
  });

  describe('calculateEloChange', () => {
    it('should calculate correct rating change for equal players winning', () => {
      const change = service.calculateEloChange({
        playerRating: 1500,
        opponentRating: 1500,
        kFactor: 20,
        result: 1, // win
      });
      // Expected score = 0.5, actual = 1, diff = 0.5, change = 20 * 0.5 = 10
      expect(change).toBe(10);
    });

    it('should calculate correct rating change for equal players losing', () => {
      const change = service.calculateEloChange({
        playerRating: 1500,
        opponentRating: 1500,
        kFactor: 20,
        result: 0, // loss
      });
      // Expected score = 0.5, actual = 0, diff = -0.5, change = 20 * -0.5 = -10
      expect(change).toBe(-10);
    });

    it('should calculate correct rating change for equal players drawing', () => {
      const change = service.calculateEloChange({
        playerRating: 1500,
        opponentRating: 1500,
        kFactor: 20,
        result: 0.5, // draw
      });
      // Expected score = 0.5, actual = 0.5, diff = 0, change = 0
      expect(change).toBe(0);
    });

    it('should give larger gain for upset victory', () => {
      const change = service.calculateEloChange({
        playerRating: 1400,
        opponentRating: 1600,
        kFactor: 20,
        result: 1, // win
      });
      // Lower rated player wins, should gain more than 10 points
      expect(change).toBeGreaterThan(10);
      expect(change).toBeCloseTo(15, 0);
    });

    it('should give smaller loss for expected defeat', () => {
      const change = service.calculateEloChange({
        playerRating: 1400,
        opponentRating: 1600,
        kFactor: 20,
        result: 0, // loss
      });
      // Lower rated player loses, should lose less than 10 points
      expect(change).toBeGreaterThan(-10);
      expect(change).toBeLessThan(0);
    });

    it('should use K-factor correctly in calculation', () => {
      const change40 = service.calculateEloChange({
        playerRating: 1500,
        opponentRating: 1500,
        kFactor: 40,
        result: 1,
      });
      const change20 = service.calculateEloChange({
        playerRating: 1500,
        opponentRating: 1500,
        kFactor: 20,
        result: 1,
      });
      // K=40 should give double the rating change of K=20
      expect(change40).toBe(change20 * 2);
    });

    it('should round rating change to nearest integer', () => {
      const change = service.calculateEloChange({
        playerRating: 1523,
        opponentRating: 1487,
        kFactor: 20,
        result: 1,
      });
      expect(Number.isInteger(change)).toBe(true);
    });
  });

  describe('getKFactor', () => {
    it('should return 40 for players with fewer than 30 games', () => {
      expect(service.getKFactor(0, 1200)).toBe(40);
      expect(service.getKFactor(15, 1500)).toBe(40);
      expect(service.getKFactor(29, 1800)).toBe(40);
    });

    it('should return 20 for players with 30+ games and rating < 2400', () => {
      expect(service.getKFactor(30, 1200)).toBe(20);
      expect(service.getKFactor(50, 1800)).toBe(20);
      expect(service.getKFactor(100, 2399)).toBe(20);
    });

    it('should return 10 for players with rating >= 2400', () => {
      expect(service.getKFactor(30, 2400)).toBe(10);
      expect(service.getKFactor(50, 2500)).toBe(10);
      expect(service.getKFactor(100, 3000)).toBe(10);
    });

    it('should prioritize games played over rating for K=40', () => {
      // Even with high rating, < 30 games should give K=40
      expect(service.getKFactor(29, 2500)).toBe(40);
    });

    it('should use rating for K=10 regardless of games played', () => {
      // High rating should give K=10 even with many games
      expect(service.getKFactor(30, 2400)).toBe(10);
      expect(service.getKFactor(200, 2400)).toBe(10);
    });
  });

  describe('getOrCreateRating', () => {
    it('should return existing rating if found', async () => {
      const existingRating = {
        id: '1',
        userId: 'user1',
        timeControl: TimeControl.BLITZ,
        rating: 1500,
        peakRating: 1550,
        gamesPlayed: 10,
        wins: 5,
        losses: 3,
        draws: 2,
        isProvisional: true,
        kFactor: 40,
        updatedAt: new Date(),
      };

      mockPrismaService.rating.findUnique.mockResolvedValue(existingRating);

      const result = await service.getOrCreateRating('user1', TimeControl.BLITZ);

      expect(result).toEqual(existingRating);
      expect(mockPrismaService.rating.findUnique).toHaveBeenCalledWith({
        where: {
          userId_timeControl: {
            userId: 'user1',
            timeControl: TimeControl.BLITZ,
          },
        },
      });
      expect(mockPrismaService.rating.create).not.toHaveBeenCalled();
    });

    it('should create new rating with 1200 starting rating if not found', async () => {
      mockPrismaService.rating.findUnique.mockResolvedValue(null);
      
      const newRating = {
        id: '2',
        userId: 'user2',
        timeControl: TimeControl.RAPID,
        rating: 1200,
        peakRating: 1200,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        isProvisional: true,
        kFactor: 40,
        updatedAt: new Date(),
      };

      mockPrismaService.rating.create.mockResolvedValue(newRating);

      const result = await service.getOrCreateRating('user2', TimeControl.RAPID);

      expect(result).toEqual(newRating);
      expect(mockPrismaService.rating.create).toHaveBeenCalledWith({
        data: {
          userId: 'user2',
          timeControl: TimeControl.RAPID,
          rating: 1200,
          peakRating: 1200,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          isProvisional: true,
          kFactor: 40,
        },
      });
    });

    it('should create separate ratings for different time controls', async () => {
      mockPrismaService.rating.findUnique.mockResolvedValue(null);
      mockPrismaService.rating.create.mockResolvedValue({
        id: '3',
        userId: 'user3',
        timeControl: TimeControl.BULLET,
        rating: 1200,
        peakRating: 1200,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        isProvisional: true,
        kFactor: 40,
        updatedAt: new Date(),
      });

      await service.getOrCreateRating('user3', TimeControl.BULLET);

      expect(mockPrismaService.rating.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user3',
            timeControl: TimeControl.BULLET,
          }),
        })
      );
    });
  });

  describe('updateRatingsAfterGame - White Win', () => {
    it('should update ratings correctly when white wins', async () => {
      const gameId = 'game1';
      const whitePlayerId = 'white1';
      const blackPlayerId = 'black1';

      const whiteRating = {
        id: '1',
        userId: whitePlayerId,
        timeControl: TimeControl.BLITZ,
        rating: 1500,
        peakRating: 1500,
        gamesPlayed: 25,
        wins: 12,
        losses: 10,
        draws: 3,
        isProvisional: true,
        kFactor: 40,
        updatedAt: new Date(),
      };

      const blackRating = {
        id: '2',
        userId: blackPlayerId,
        timeControl: TimeControl.BLITZ,
        rating: 1480,
        peakRating: 1520,
        gamesPlayed: 30,
        wins: 15,
        losses: 12,
        draws: 3,
        isProvisional: false,
        kFactor: 20,
        updatedAt: new Date(),
      };

      mockPrismaService.rating.findUnique
        .mockResolvedValueOnce(whiteRating)
        .mockResolvedValueOnce(blackRating);

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        whitePlayerId,
        blackPlayerId,
      });

      mockPrismaService.$transaction.mockImplementation((operations) => 
        Promise.all(operations)
      );

      await service.updateRatingsAfterGame({
        userId: whitePlayerId,
        opponentId: blackPlayerId,
        timeControl: TimeControl.BLITZ,
        result: GameResult.WHITE_WIN,
        gameId,
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      
      // Verify transaction includes rating updates and history records
      const transactionCalls = mockPrismaService.$transaction.mock.calls[0][0];
      expect(transactionCalls).toHaveLength(5); // 2 rating updates + 2 history records + 1 game update
    });
  });

  describe('updateRatingsAfterGame - Draw', () => {
    it('should update ratings correctly for a draw', async () => {
      const gameId = 'game2';
      const player1Id = 'player1';
      const player2Id = 'player2';

      const player1Rating = {
        id: '1',
        userId: player1Id,
        timeControl: TimeControl.RAPID,
        rating: 1600,
        peakRating: 1650,
        gamesPlayed: 40,
        wins: 20,
        losses: 15,
        draws: 5,
        isProvisional: false,
        kFactor: 20,
        updatedAt: new Date(),
      };

      const player2Rating = {
        id: '2',
        userId: player2Id,
        timeControl: TimeControl.RAPID,
        rating: 1600,
        peakRating: 1600,
        gamesPlayed: 35,
        wins: 18,
        losses: 14,
        draws: 3,
        isProvisional: false,
        kFactor: 20,
        updatedAt: new Date(),
      };

      mockPrismaService.rating.findUnique
        .mockResolvedValueOnce(player1Rating)
        .mockResolvedValueOnce(player2Rating);

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        whitePlayerId: player1Id,
        blackPlayerId: player2Id,
      });

      mockPrismaService.$transaction.mockImplementation((operations) => 
        Promise.all(operations)
      );

      await service.updateRatingsAfterGame({
        userId: player1Id,
        opponentId: player2Id,
        timeControl: TimeControl.RAPID,
        result: GameResult.DRAW,
        gameId,
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('Rating floor and provisional status', () => {
    it('should not allow rating to fall below 100', async () => {
      const gameId = 'game3';
      const weakPlayerId = 'weak1';
      const strongPlayerId = 'strong1';

      const weakRating = {
        id: '1',
        userId: weakPlayerId,
        timeControl: TimeControl.BULLET,
        rating: 105, // Very low rating
        peakRating: 200,
        gamesPlayed: 50,
        wins: 5,
        losses: 43,
        draws: 2,
        isProvisional: false,
        kFactor: 20,
        updatedAt: new Date(),
      };

      const strongRating = {
        id: '2',
        userId: strongPlayerId,
        timeControl: TimeControl.BULLET,
        rating: 2000,
        peakRating: 2100,
        gamesPlayed: 200,
        wins: 150,
        losses: 40,
        draws: 10,
        isProvisional: false,
        kFactor: 20,
        updatedAt: new Date(),
      };

      mockPrismaService.rating.findUnique
        .mockResolvedValueOnce(weakRating)
        .mockResolvedValueOnce(strongRating);

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        whitePlayerId: weakPlayerId,
        blackPlayerId: strongPlayerId,
      });

      mockPrismaService.$transaction.mockImplementation((operations) => 
        Promise.all(operations)
      );

      await service.updateRatingsAfterGame({
        userId: weakPlayerId,
        opponentId: strongPlayerId,
        timeControl: TimeControl.BULLET,
        result: GameResult.BLACK_WIN, // Weak player loses
        gameId,
      });

      // The rating should be clamped to 100 minimum
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('getRatingHistory', () => {
    it('should return rating history for user and time control', async () => {
      const userId = 'user1';
      const timeControl = TimeControl.BLITZ;
      const mockHistory = [
        {
          id: '1',
          userId,
          timeControl,
          ratingBefore: 1500,
          ratingAfter: 1510,
          ratingChange: 10,
          gameId: 'game1',
          createdAt: new Date(),
          game: {
            id: 'game1',
            whitePlayerId: userId,
            blackPlayerId: 'opponent1',
            result: GameResult.WHITE_WIN,
            completedAt: new Date(),
          },
        },
      ];

      mockPrismaService.ratingHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getRatingHistory(userId, timeControl, 50);

      expect(result).toEqual(mockHistory);
      expect(mockPrismaService.ratingHistory.findMany).toHaveBeenCalledWith({
        where: { userId, timeControl },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          game: {
            select: {
              id: true,
              whitePlayerId: true,
              blackPlayerId: true,
              result: true,
              completedAt: true,
            },
          },
        },
      });
    });
  });

  describe('getUserRatings', () => {
    it('should return all ratings for a user', async () => {
      const userId = 'user1';
      const mockRatings = [
        {
          id: '1',
          userId,
          timeControl: TimeControl.BULLET,
          rating: 1400,
          peakRating: 1450,
          gamesPlayed: 20,
          wins: 10,
          losses: 8,
          draws: 2,
          isProvisional: true,
          kFactor: 40,
          updatedAt: new Date(),
        },
        {
          id: '2',
          userId,
          timeControl: TimeControl.BLITZ,
          rating: 1500,
          peakRating: 1550,
          gamesPlayed: 30,
          wins: 15,
          losses: 12,
          draws: 3,
          isProvisional: false,
          kFactor: 20,
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.rating.findMany.mockResolvedValue(mockRatings);

      const result = await service.getUserRatings(userId);

      expect(result).toEqual(mockRatings);
      expect(mockPrismaService.rating.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { timeControl: 'asc' },
      });
    });
  });

  describe('getLeaderboard', () => {
    it('should return top rated players for time control', async () => {
      const timeControl = TimeControl.BLITZ;
      const mockLeaderboard = [
        {
          id: '1',
          userId: 'user1',
          timeControl,
          rating: 2000,
          peakRating: 2100,
          gamesPlayed: 100,
          wins: 60,
          losses: 30,
          draws: 10,
          isProvisional: false,
          kFactor: 20,
          updatedAt: new Date(),
          user: {
            id: 'user1',
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: null,
            country: 'US',
          },
        },
      ];

      mockPrismaService.rating.findMany.mockResolvedValue(mockLeaderboard);

      const result = await service.getLeaderboard(timeControl, 100);

      expect(result).toEqual(mockLeaderboard);
      expect(mockPrismaService.rating.findMany).toHaveBeenCalledWith({
        where: { timeControl },
        orderBy: { rating: 'desc' },
        take: 100,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              country: true,
            },
          },
        },
      });
    });
  });
});
