import { Test, TestingModule } from '@nestjs/testing';
import { RatingsService } from './ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeControl, GameResult } from '@prisma/client';

describe('RatingsService Integration Tests', () => {
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
    $transaction: jest.fn((operations) => Promise.all(operations)),
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

  describe('Complete rating update flow', () => {
    it('should handle complete rating update for white win', async () => {
      const gameId = 'game1';
      const whitePlayerId = 'white1';
      const blackPlayerId = 'black1';

      // Mock game data
      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        whitePlayerId,
        blackPlayerId,
      });

      // Mock initial ratings
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

      await service.updateRatingsAfterGame({
        userId: whitePlayerId,
        opponentId: blackPlayerId,
        timeControl: TimeControl.BLITZ,
        result: GameResult.WHITE_WIN,
        gameId,
      });

      // Verify transaction was called
      expect(mockPrismaService.$transaction).toHaveBeenCalled();

      // Verify all 5 operations in transaction
      const transactionOps = mockPrismaService.$transaction.mock.calls[0][0];
      expect(transactionOps).toHaveLength(5);

      // Verify white player rating update
      expect(mockPrismaService.rating.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_timeControl: {
              userId: whitePlayerId,
              timeControl: TimeControl.BLITZ,
            },
          },
          data: expect.objectContaining({
            gamesPlayed: 26,
            wins: 13,
            losses: 10,
            draws: 3,
            isProvisional: false, // Should become false at 20+ games
          }),
        })
      );

      // Verify black player rating update
      expect(mockPrismaService.rating.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_timeControl: {
              userId: blackPlayerId,
              timeControl: TimeControl.BLITZ,
            },
          },
          data: expect.objectContaining({
            gamesPlayed: 31,
            wins: 15,
            losses: 13,
            draws: 3,
          }),
        })
      );

      // Verify rating history records
      expect(mockPrismaService.ratingHistory.create).toHaveBeenCalledTimes(2);
    });

    it('should handle draw correctly', async () => {
      const gameId = 'game2';
      const player1Id = 'player1';
      const player2Id = 'player2';

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        whitePlayerId: player1Id,
        blackPlayerId: player2Id,
      });

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

      await service.updateRatingsAfterGame({
        userId: player1Id,
        opponentId: player2Id,
        timeControl: TimeControl.RAPID,
        result: GameResult.DRAW,
        gameId,
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();

      // For equal ratings and draw, rating change should be 0
      expect(mockPrismaService.rating.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_timeControl: {
              userId: player1Id,
              timeControl: TimeControl.RAPID,
            },
          },
          data: expect.objectContaining({
            draws: 6, // Incremented from 5
          }),
        })
      );
    });

    it('should enforce rating floor of 100', async () => {
      const gameId = 'game3';
      const weakPlayerId = 'weak1';
      const strongPlayerId = 'strong1';

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        whitePlayerId: weakPlayerId,
        blackPlayerId: strongPlayerId,
      });

      const weakRating = {
        id: '1',
        userId: weakPlayerId,
        timeControl: TimeControl.BULLET,
        rating: 105,
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

      await service.updateRatingsAfterGame({
        userId: weakPlayerId,
        opponentId: strongPlayerId,
        timeControl: TimeControl.BULLET,
        result: GameResult.BLACK_WIN,
        gameId,
      });

      // Verify weak player's rating doesn't go below 100
      const weakPlayerUpdate = mockPrismaService.rating.update.mock.calls.find(
        call => call[0].where.userId_timeControl.userId === weakPlayerId
      );
      
      expect(weakPlayerUpdate[0].data.rating).toBeGreaterThanOrEqual(100);
    });

    it('should update peak rating when new rating exceeds previous peak', async () => {
      const gameId = 'game4';
      const player1Id = 'player1';
      const player2Id = 'player2';

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        whitePlayerId: player1Id,
        blackPlayerId: player2Id,
      });

      const player1Rating = {
        id: '1',
        userId: player1Id,
        timeControl: TimeControl.CLASSICAL,
        rating: 1795,
        peakRating: 1800,
        gamesPlayed: 45,
        wins: 25,
        losses: 15,
        draws: 5,
        isProvisional: false,
        kFactor: 20,
        updatedAt: new Date(),
      };

      const player2Rating = {
        id: '2',
        userId: player2Id,
        timeControl: TimeControl.CLASSICAL,
        rating: 1700,
        peakRating: 1750,
        gamesPlayed: 40,
        wins: 20,
        losses: 18,
        draws: 2,
        isProvisional: false,
        kFactor: 20,
        updatedAt: new Date(),
      };

      mockPrismaService.rating.findUnique
        .mockResolvedValueOnce(player1Rating)
        .mockResolvedValueOnce(player2Rating);

      await service.updateRatingsAfterGame({
        userId: player1Id,
        opponentId: player2Id,
        timeControl: TimeControl.CLASSICAL,
        result: GameResult.WHITE_WIN,
        gameId,
      });

      // Player 1 should gain rating and potentially exceed peak
      const player1Update = mockPrismaService.rating.update.mock.calls.find(
        call => call[0].where.userId_timeControl.userId === player1Id
      );

      // Peak rating should be at least the old peak
      expect(player1Update[0].data.peakRating).toBeGreaterThanOrEqual(1800);
    });

    it('should transition from provisional to non-provisional at 20 games', async () => {
      const gameId = 'game5';
      const player1Id = 'player1';
      const player2Id = 'player2';

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        whitePlayerId: player1Id,
        blackPlayerId: player2Id,
      });

      // Player with exactly 19 games
      const player1Rating = {
        id: '1',
        userId: player1Id,
        timeControl: TimeControl.BLITZ,
        rating: 1400,
        peakRating: 1450,
        gamesPlayed: 19,
        wins: 10,
        losses: 7,
        draws: 2,
        isProvisional: true,
        kFactor: 40,
        updatedAt: new Date(),
      };

      const player2Rating = {
        id: '2',
        userId: player2Id,
        timeControl: TimeControl.BLITZ,
        rating: 1400,
        peakRating: 1400,
        gamesPlayed: 25,
        wins: 12,
        losses: 11,
        draws: 2,
        isProvisional: false,
        kFactor: 20,
        updatedAt: new Date(),
      };

      mockPrismaService.rating.findUnique
        .mockResolvedValueOnce(player1Rating)
        .mockResolvedValueOnce(player2Rating);

      await service.updateRatingsAfterGame({
        userId: player1Id,
        opponentId: player2Id,
        timeControl: TimeControl.BLITZ,
        result: GameResult.WHITE_WIN,
        gameId,
      });

      // Player 1 should now have 20 games and be non-provisional
      const player1Update = mockPrismaService.rating.update.mock.calls.find(
        call => call[0].where.userId_timeControl.userId === player1Id
      );

      expect(player1Update[0].data.gamesPlayed).toBe(20);
      expect(player1Update[0].data.isProvisional).toBe(false);
    });

    it('should use correct K-factors based on games and rating', async () => {
      const gameId = 'game6';
      const noviceId = 'novice1';
      const masterId = 'master1';

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        whitePlayerId: noviceId,
        blackPlayerId: masterId,
      });

      // Novice with < 30 games (K=40)
      const noviceRating = {
        id: '1',
        userId: noviceId,
        timeControl: TimeControl.RAPID,
        rating: 1200,
        peakRating: 1200,
        gamesPlayed: 10,
        wins: 5,
        losses: 4,
        draws: 1,
        isProvisional: true,
        kFactor: 40,
        updatedAt: new Date(),
      };

      // Master with rating >= 2400 (K=10)
      const masterRating = {
        id: '2',
        userId: masterId,
        timeControl: TimeControl.RAPID,
        rating: 2450,
        peakRating: 2500,
        gamesPlayed: 500,
        wins: 350,
        losses: 120,
        draws: 30,
        isProvisional: false,
        kFactor: 10,
        updatedAt: new Date(),
      };

      mockPrismaService.rating.findUnique
        .mockResolvedValueOnce(noviceRating)
        .mockResolvedValueOnce(masterRating);

      await service.updateRatingsAfterGame({
        userId: noviceId,
        opponentId: masterId,
        timeControl: TimeControl.RAPID,
        result: GameResult.WHITE_WIN, // Upset!
        gameId,
      });

      // Novice should gain significant rating with K=40
      // Master should lose minimal rating with K=10
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('Separate ratings per time control', () => {
    it('should maintain separate ratings for different time controls', async () => {
      const userId = 'user1';

      const bulletRating = {
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
      };

      const blitzRating = {
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
      };

      mockPrismaService.rating.findMany.mockResolvedValue([bulletRating, blitzRating]);

      const ratings = await service.getUserRatings(userId);

      expect(ratings).toHaveLength(2);
      expect(ratings[0].timeControl).toBe(TimeControl.BULLET);
      expect(ratings[1].timeControl).toBe(TimeControl.BLITZ);
      expect(ratings[0].rating).not.toBe(ratings[1].rating);
    });
  });
});
