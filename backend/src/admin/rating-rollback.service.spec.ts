import { Test, TestingModule } from '@nestjs/testing';
import { RatingRollbackService } from './rating-rollback.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TimeControl } from '@prisma/client';

describe('RatingRollbackService', () => {
  let service: RatingRollbackService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    ratingHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    rating: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    game: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingRollbackService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RatingRollbackService>(RatingRollbackService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rollbackRatingsFromGames', () => {
    it('should rollback ratings from specific games', async () => {
      const userId = 'user-123';
      const gameIds = ['game-1', 'game-2'];

      const mockUser = { id: userId };
      const mockRatingHistory = [
        {
          userId,
          gameId: 'game-1',
          timeControl: TimeControl.BLITZ,
          ratingChange: 20,
          game: { id: 'game-1', timeControl: TimeControl.BLITZ },
        },
        {
          userId,
          gameId: 'game-2',
          timeControl: TimeControl.BLITZ,
          ratingChange: 15,
          game: { id: 'game-2', timeControl: TimeControl.BLITZ },
        },
      ];

      const mockCurrentRating = {
        userId,
        timeControl: TimeControl.BLITZ,
        rating: 1235,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.ratingHistory.findMany.mockResolvedValue(
        mockRatingHistory,
      );
      mockPrismaService.rating.findUnique.mockResolvedValue(mockCurrentRating);
      mockPrismaService.rating.update.mockResolvedValue({
        ...mockCurrentRating,
        rating: 1200,
      });
      mockPrismaService.ratingHistory.create.mockResolvedValue({});

      const result = await service.rollbackRatingsFromGames(userId, gameIds);

      expect(result.userId).toBe(userId);
      expect(result.totalGamesAffected).toBe(2);
      expect(result.rollbacks[0].ratingChange).toBe(-35); // -(20 + 15)
      expect(prisma.rating.update).toHaveBeenCalledWith({
        where: {
          userId_timeControl: {
            userId,
            timeControl: TimeControl.BLITZ,
          },
        },
        data: {
          rating: 1200, // 1235 - 35
        },
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.rollbackRatingsFromGames('user-123', ['game-1']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no game IDs provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123' });

      await expect(
        service.rollbackRatingsFromGames('user-123', []),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no rating changes found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.ratingHistory.findMany.mockResolvedValue([]);

      await expect(
        service.rollbackRatingsFromGames('user-123', ['game-1']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not let rating fall below 100', async () => {
      const userId = 'user-123';
      const gameIds = ['game-1'];

      const mockUser = { id: userId };
      const mockRatingHistory = [
        {
          userId,
          gameId: 'game-1',
          timeControl: TimeControl.BLITZ,
          ratingChange: 50,
          game: { id: 'game-1', timeControl: TimeControl.BLITZ },
        },
      ];

      const mockCurrentRating = {
        userId,
        timeControl: TimeControl.BLITZ,
        rating: 120,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.ratingHistory.findMany.mockResolvedValue(
        mockRatingHistory,
      );
      mockPrismaService.rating.findUnique.mockResolvedValue(mockCurrentRating);
      mockPrismaService.rating.update.mockResolvedValue({
        ...mockCurrentRating,
        rating: 100,
      });
      mockPrismaService.ratingHistory.create.mockResolvedValue({});

      const result = await service.rollbackRatingsFromGames(userId, gameIds);

      expect(result.rollbacks[0].ratingAfter).toBe(100); // Should not go below 100
    });
  });

  describe('rollbackRatingsFromDateRange', () => {
    it('should rollback ratings from games in date range', async () => {
      const userId = 'user-123';
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      const mockUser = { id: userId };
      const mockGames = [{ id: 'game-1' }, { id: 'game-2' }];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.game.findMany.mockResolvedValue(mockGames);
      mockPrismaService.ratingHistory.findMany.mockResolvedValue([
        {
          userId,
          gameId: 'game-1',
          timeControl: TimeControl.BLITZ,
          ratingChange: 20,
          game: { id: 'game-1', timeControl: TimeControl.BLITZ },
        },
      ]);
      mockPrismaService.rating.findUnique.mockResolvedValue({
        userId,
        timeControl: TimeControl.BLITZ,
        rating: 1220,
      });
      mockPrismaService.rating.update.mockResolvedValue({});
      mockPrismaService.ratingHistory.create.mockResolvedValue({});

      const result = await service.rollbackRatingsFromDateRange(
        userId,
        fromDate,
        toDate,
      );

      expect(result.userId).toBe(userId);
      expect(prisma.game.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
          completedAt: {
            gte: fromDate,
            lte: toDate,
          },
          isRated: true,
        },
        select: {
          id: true,
        },
      });
    });

    it('should throw BadRequestException if date range is invalid', async () => {
      const userId = 'user-123';
      const fromDate = new Date('2024-01-31');
      const toDate = new Date('2024-01-01');

      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });

      await expect(
        service.rollbackRatingsFromDateRange(userId, fromDate, toDate),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no games found in date range', async () => {
      const userId = 'user-123';
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.game.findMany.mockResolvedValue([]);

      await expect(
        service.rollbackRatingsFromDateRange(userId, fromDate, toDate),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('previewRollback', () => {
    it('should preview rollback without applying changes', async () => {
      const userId = 'user-123';
      const gameIds = ['game-1', 'game-2'];

      const mockUser = { id: userId };
      const mockRatingHistory = [
        {
          userId,
          gameId: 'game-1',
          timeControl: TimeControl.BLITZ,
          ratingChange: 20,
          game: {
            id: 'game-1',
            timeControl: TimeControl.BLITZ,
            completedAt: new Date(),
          },
        },
        {
          userId,
          gameId: 'game-2',
          timeControl: TimeControl.BLITZ,
          ratingChange: 15,
          game: {
            id: 'game-2',
            timeControl: TimeControl.BLITZ,
            completedAt: new Date(),
          },
        },
      ];

      const mockCurrentRating = {
        userId,
        timeControl: TimeControl.BLITZ,
        rating: 1235,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.ratingHistory.findMany.mockResolvedValue(
        mockRatingHistory,
      );
      mockPrismaService.rating.findUnique.mockResolvedValue(mockCurrentRating);

      const result = await service.previewRollback(userId, gameIds);

      expect(result.userId).toBe(userId);
      expect(result.totalGamesAffected).toBe(2);
      expect(result.preview[0].currentRating).toBe(1235);
      expect(result.preview[0].newRating).toBe(1200);
      expect(result.preview[0].ratingChange).toBe(-35);
      // Should not call update methods
      expect(prisma.rating.update).not.toHaveBeenCalled();
      expect(prisma.ratingHistory.create).not.toHaveBeenCalled();
    });

    it('should return empty preview if no rating changes found', async () => {
      const userId = 'user-123';
      const gameIds = ['game-1'];

      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.ratingHistory.findMany.mockResolvedValue([]);

      const result = await service.previewRollback(userId, gameIds);

      expect(result.totalGamesAffected).toBe(0);
      expect(result.preview).toEqual([]);
    });
  });
});
