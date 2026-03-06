import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import { BanService } from './ban.service';
import { RatingRollbackService } from './rating-rollback.service';
import { LoggingService } from './logging.service';
import { NotFoundException } from '@nestjs/common';
import { TimeControl } from '@prisma/client';

describe('AdminService - Rating Adjustment', () => {
  let service: AdminService;
  let prisma: PrismaService;
  let loggingService: LoggingService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    rating: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ratingHistory: {
      create: jest.fn(),
    },
  };

  const mockLoggingService = {
    createLog: jest.fn(),
  };

  const mockAntiCheatService = {};
  const mockBanService = {};
  const mockRatingRollbackService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AntiCheatService,
          useValue: mockAntiCheatService,
        },
        {
          provide: BanService,
          useValue: mockBanService,
        },
        {
          provide: RatingRollbackService,
          useValue: mockRatingRollbackService,
        },
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
    loggingService = module.get<LoggingService>(LoggingService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('adjustRating', () => {
    const userId = 'user-123';
    const timeControl = TimeControl.BLITZ;
    const newRating = 1600;
    const reason = 'Correcting rating after investigation';
    const adjustedBy = 'admin-456';

    const mockUser = {
      id: userId,
      username: 'testuser',
      displayName: 'Test User',
    };

    const mockCurrentRating = {
      id: 'rating-123',
      userId,
      timeControl,
      rating: 1400,
      peakRating: 1500,
      gamesPlayed: 50,
      wins: 25,
      losses: 20,
      draws: 5,
      isProvisional: false,
      kFactor: 20,
    };

    it('should successfully adjust a user rating', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.rating.findUnique.mockResolvedValue(mockCurrentRating);
      mockPrismaService.rating.update.mockResolvedValue({
        ...mockCurrentRating,
        rating: newRating,
        peakRating: newRating,
      });
      mockPrismaService.ratingHistory.create.mockResolvedValue({
        id: 'history-123',
        userId,
        timeControl,
        ratingBefore: 1400,
        ratingAfter: newRating,
        ratingChange: 200,
        gameId: null,
        createdAt: new Date(),
      });
      mockLoggingService.createLog.mockResolvedValue({});

      const result = await service.adjustRating(
        userId,
        timeControl,
        newRating,
        reason,
        adjustedBy,
      );

      expect(result).toMatchObject({
        success: true,
        user: {
          id: userId,
          username: 'testuser',
          displayName: 'Test User',
        },
        timeControl,
        oldRating: 1400,
        newRating: 1600,
        ratingChange: 200,
        reason,
        adjustedBy,
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      });

      expect(mockPrismaService.rating.findUnique).toHaveBeenCalledWith({
        where: {
          userId_timeControl: {
            userId,
            timeControl,
          },
        },
      });

      expect(mockPrismaService.rating.update).toHaveBeenCalledWith({
        where: {
          userId_timeControl: {
            userId,
            timeControl,
          },
        },
        data: {
          rating: newRating,
          peakRating: newRating,
        },
      });

      expect(mockPrismaService.ratingHistory.create).toHaveBeenCalledWith({
        data: {
          userId,
          timeControl,
          ratingBefore: 1400,
          ratingAfter: newRating,
          ratingChange: 200,
          gameId: null,
        },
      });

      expect(mockLoggingService.createLog).toHaveBeenCalledWith({
        level: 'INFO',
        message: `Rating manually adjusted for user ${mockUser.username}`,
        context: 'RATING_ADJUSTMENT',
        metadata: {
          performedBy: adjustedBy,
          targetUserId: userId,
          timeControl,
          oldRating: 1400,
          newRating: 1600,
          ratingChange: 200,
          reason,
          username: 'testuser',
          displayName: 'Test User',
        },
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.adjustRating(userId, timeControl, newRating, reason, adjustedBy),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      });

      expect(mockPrismaService.rating.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if rating does not exist for time control', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.rating.findUnique.mockResolvedValue(null);

      await expect(
        service.adjustRating(userId, timeControl, newRating, reason, adjustedBy),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.adjustRating(userId, timeControl, newRating, reason, adjustedBy),
      ).rejects.toThrow(`Rating not found for time control: ${timeControl}`);

      expect(mockPrismaService.rating.findUnique).toHaveBeenCalledWith({
        where: {
          userId_timeControl: {
            userId,
            timeControl,
          },
        },
      });

      expect(mockPrismaService.rating.update).not.toHaveBeenCalled();
    });

    it('should handle rating decrease correctly', async () => {
      const lowerRating = 1200;
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.rating.findUnique.mockResolvedValue(mockCurrentRating);
      mockPrismaService.rating.update.mockResolvedValue({
        ...mockCurrentRating,
        rating: lowerRating,
        peakRating: 1500, // Peak rating should not decrease
      });
      mockPrismaService.ratingHistory.create.mockResolvedValue({});
      mockLoggingService.createLog.mockResolvedValue({});

      const result = await service.adjustRating(
        userId,
        timeControl,
        lowerRating,
        reason,
        adjustedBy,
      );

      expect(result.oldRating).toBe(1400);
      expect(result.newRating).toBe(1200);
      expect(result.ratingChange).toBe(-200);

      expect(mockPrismaService.rating.update).toHaveBeenCalledWith({
        where: {
          userId_timeControl: {
            userId,
            timeControl,
          },
        },
        data: {
          rating: lowerRating,
          peakRating: 1500, // Should keep existing peak rating
        },
      });
    });

    it('should update peak rating when new rating exceeds current peak', async () => {
      const higherRating = 1700;
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.rating.findUnique.mockResolvedValue(mockCurrentRating);
      mockPrismaService.rating.update.mockResolvedValue({
        ...mockCurrentRating,
        rating: higherRating,
        peakRating: higherRating,
      });
      mockPrismaService.ratingHistory.create.mockResolvedValue({});
      mockLoggingService.createLog.mockResolvedValue({});

      await service.adjustRating(
        userId,
        timeControl,
        higherRating,
        reason,
        adjustedBy,
      );

      expect(mockPrismaService.rating.update).toHaveBeenCalledWith({
        where: {
          userId_timeControl: {
            userId,
            timeControl,
          },
        },
        data: {
          rating: higherRating,
          peakRating: higherRating, // Should update to new rating
        },
      });
    });

    it('should create rating history entry with null gameId', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.rating.findUnique.mockResolvedValue(mockCurrentRating);
      mockPrismaService.rating.update.mockResolvedValue({
        ...mockCurrentRating,
        rating: newRating,
      });
      mockPrismaService.ratingHistory.create.mockResolvedValue({});
      mockLoggingService.createLog.mockResolvedValue({});

      await service.adjustRating(
        userId,
        timeControl,
        newRating,
        reason,
        adjustedBy,
      );

      expect(mockPrismaService.ratingHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          gameId: null, // Manual adjustment should have null gameId
        }),
      });
    });

    it('should work with all time controls', async () => {
      const timeControls = [
        TimeControl.BULLET,
        TimeControl.BLITZ,
        TimeControl.RAPID,
        TimeControl.CLASSICAL,
      ];

      for (const tc of timeControls) {
        jest.clearAllMocks();
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockPrismaService.rating.findUnique.mockResolvedValue({
          ...mockCurrentRating,
          timeControl: tc,
        });
        mockPrismaService.rating.update.mockResolvedValue({});
        mockPrismaService.ratingHistory.create.mockResolvedValue({});
        mockLoggingService.createLog.mockResolvedValue({});

        await service.adjustRating(userId, tc, newRating, reason, adjustedBy);

        expect(mockPrismaService.rating.findUnique).toHaveBeenCalledWith({
          where: {
            userId_timeControl: {
              userId,
              timeControl: tc,
            },
          },
        });
      }
    });

    it('should include all required details in the log', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.rating.findUnique.mockResolvedValue(mockCurrentRating);
      mockPrismaService.rating.update.mockResolvedValue({});
      mockPrismaService.ratingHistory.create.mockResolvedValue({});
      mockLoggingService.createLog.mockResolvedValue({});

      await service.adjustRating(
        userId,
        timeControl,
        newRating,
        reason,
        adjustedBy,
      );

      expect(mockLoggingService.createLog).toHaveBeenCalledWith({
        level: expect.any(String),
        message: expect.any(String),
        context: 'RATING_ADJUSTMENT',
        metadata: expect.objectContaining({
          performedBy: adjustedBy,
          targetUserId: userId,
          timeControl,
          oldRating: expect.any(Number),
          newRating: expect.any(Number),
          ratingChange: expect.any(Number),
          reason,
          username: expect.any(String),
          displayName: expect.any(String),
        }),
      });
    });
  });
});
