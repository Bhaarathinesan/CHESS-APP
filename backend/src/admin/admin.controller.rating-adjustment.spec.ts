import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AnnouncementService } from './announcement.service';
import { LoggingService } from './logging.service';
import { AdjustRatingDto } from './dto/adjust-rating.dto';
import { TimeControl } from '@prisma/client';

describe('AdminController - Rating Adjustment', () => {
  let controller: AdminController;
  let adminService: AdminService;

  const mockAdminService = {
    adjustRating: jest.fn(),
  };

  const mockAnnouncementService = {};
  const mockLoggingService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
        {
          provide: AnnouncementService,
          useValue: mockAnnouncementService,
        },
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get<AdminService>(AdminService);

    jest.clearAllMocks();
  });

  describe('POST /api/admin/ratings/:userId/adjust', () => {
    const userId = 'user-123';
    const adjustedBy = 'admin-456';

    const dto: AdjustRatingDto = {
      timeControl: TimeControl.BLITZ,
      newRating: 1600,
      reason: 'Correcting rating after investigation',
    };

    const mockRequest = {
      user: {
        sub: adjustedBy,
      },
    };

    const mockResponse = {
      success: true,
      user: {
        id: userId,
        username: 'testuser',
        displayName: 'Test User',
      },
      timeControl: 'blitz',
      oldRating: 1400,
      newRating: 1600,
      ratingChange: 200,
      reason: dto.reason,
      adjustedBy,
      adjustedAt: new Date(),
    };

    it('should adjust rating successfully', async () => {
      mockAdminService.adjustRating.mockResolvedValue(mockResponse);

      const result = await controller.adjustRating(userId, dto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.adjustRating).toHaveBeenCalledWith(
        userId,
        dto.timeControl,
        dto.newRating,
        dto.reason,
        adjustedBy,
      );
    });

    it('should extract adjustedBy from request user', async () => {
      mockAdminService.adjustRating.mockResolvedValue(mockResponse);

      await controller.adjustRating(userId, dto, mockRequest);

      expect(mockAdminService.adjustRating).toHaveBeenCalledWith(
        userId,
        dto.timeControl,
        dto.newRating,
        dto.reason,
        adjustedBy,
      );
    });

    it('should pass all DTO fields to service', async () => {
      mockAdminService.adjustRating.mockResolvedValue(mockResponse);

      await controller.adjustRating(userId, dto, mockRequest);

      expect(mockAdminService.adjustRating).toHaveBeenCalledWith(
        userId,
        dto.timeControl,
        dto.newRating,
        dto.reason,
        expect.any(String),
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('User not found');
      mockAdminService.adjustRating.mockRejectedValue(error);

      await expect(
        controller.adjustRating(userId, dto, mockRequest),
      ).rejects.toThrow(error);
    });

    it('should work with different time controls', async () => {
      const timeControls = [
        TimeControl.BULLET,
        TimeControl.BLITZ,
        TimeControl.RAPID,
        TimeControl.CLASSICAL,
      ];

      for (const tc of timeControls) {
        jest.clearAllMocks();
        const tcDto = { ...dto, timeControl: tc };
        mockAdminService.adjustRating.mockResolvedValue({
          ...mockResponse,
          timeControl: tc,
        });

        await controller.adjustRating(userId, tcDto, mockRequest);

        expect(mockAdminService.adjustRating).toHaveBeenCalledWith(
          userId,
          tc,
          dto.newRating,
          dto.reason,
          adjustedBy,
        );
      }
    });

    it('should work with rating increases', async () => {
      const increaseDto = { ...dto, newRating: 1800 };
      mockAdminService.adjustRating.mockResolvedValue({
        ...mockResponse,
        newRating: 1800,
        ratingChange: 400,
      });

      await controller.adjustRating(userId, increaseDto, mockRequest);

      expect(mockAdminService.adjustRating).toHaveBeenCalledWith(
        userId,
        dto.timeControl,
        1800,
        dto.reason,
        adjustedBy,
      );
    });

    it('should work with rating decreases', async () => {
      const decreaseDto = { ...dto, newRating: 1200 };
      mockAdminService.adjustRating.mockResolvedValue({
        ...mockResponse,
        newRating: 1200,
        ratingChange: -200,
      });

      await controller.adjustRating(userId, decreaseDto, mockRequest);

      expect(mockAdminService.adjustRating).toHaveBeenCalledWith(
        userId,
        dto.timeControl,
        1200,
        dto.reason,
        adjustedBy,
      );
    });
  });
});
