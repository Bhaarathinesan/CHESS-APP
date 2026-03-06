import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminReportQueryDto } from './dto/admin-report-query.dto';
import { UpdateReportStatusDto, ReportStatusUpdate } from './dto/update-report-status.dto';

describe('AdminController - Report Management', () => {
  let controller: AdminController;
  let service: AdminService;

  const mockAdminService = {
    getReports: jest.fn(),
    getReportById: jest.fn(),
    updateReportStatus: jest.fn(),
    getChatLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/reports', () => {
    it('should return paginated reports', async () => {
      const query: AdminReportQueryDto = {
        status: undefined,
        reportType: undefined,
        page: 1,
        limit: 50,
      };

      const mockResponse = {
        reports: [
          {
            id: 'report-1',
            reportType: 'cheating',
            status: 'PENDING',
            description: 'Suspected cheating',
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      };

      mockAdminService.getReports.mockResolvedValue(mockResponse);

      const result = await controller.getReports(query);

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.getReports).toHaveBeenCalledWith(query);
    });

    it('should filter reports by status', async () => {
      const query: AdminReportQueryDto = {
        status: 'pending' as any,
        page: 1,
        limit: 50,
      };

      mockAdminService.getReports.mockResolvedValue({
        reports: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      });

      await controller.getReports(query);

      expect(mockAdminService.getReports).toHaveBeenCalledWith(query);
    });
  });

  describe('GET /api/admin/reports/:reportId', () => {
    it('should return report details', async () => {
      const mockReport = {
        id: 'report-1',
        reportType: 'cheating',
        status: 'PENDING',
        description: 'Suspected cheating',
        gameId: 'game-1',
        createdAt: new Date(),
        reporter: {
          id: 'user-1',
          username: 'reporter',
          displayName: 'Reporter',
        },
        reportedUser: {
          id: 'user-2',
          username: 'reported',
          displayName: 'Reported',
        },
        gameDetails: {
          id: 'game-1',
          status: 'COMPLETED',
        },
      };

      mockAdminService.getReportById.mockResolvedValue(mockReport);

      const result = await controller.getReportById('report-1');

      expect(result).toEqual(mockReport);
      expect(mockAdminService.getReportById).toHaveBeenCalledWith('report-1');
    });
  });

  describe('PATCH /api/admin/reports/:reportId', () => {
    it('should update report status', async () => {
      const updateDto: UpdateReportStatusDto = {
        status: ReportStatusUpdate.REVIEWED,
        adminNotes: 'Reviewed and confirmed',
      };

      const mockRequest = {
        user: {
          sub: 'admin-1',
        },
      };

      const mockUpdatedReport = {
        id: 'report-1',
        status: 'REVIEWED',
        reviewedBy: 'admin-1',
        adminNotes: 'Reviewed and confirmed',
      };

      mockAdminService.updateReportStatus.mockResolvedValue(mockUpdatedReport);

      const result = await controller.updateReportStatus(
        'report-1',
        updateDto,
        mockRequest,
      );

      expect(result).toEqual({
        message: 'Report status updated successfully',
        report: mockUpdatedReport,
      });

      expect(mockAdminService.updateReportStatus).toHaveBeenCalledWith(
        'report-1',
        'reviewed',
        'admin-1',
        'Reviewed and confirmed',
      );
    });

    it('should update report status without admin notes', async () => {
      const updateDto: UpdateReportStatusDto = {
        status: ReportStatusUpdate.DISMISSED,
      };

      const mockRequest = {
        user: {
          sub: 'admin-1',
        },
      };

      const mockUpdatedReport = {
        id: 'report-1',
        status: 'DISMISSED',
        reviewedBy: 'admin-1',
      };

      mockAdminService.updateReportStatus.mockResolvedValue(mockUpdatedReport);

      await controller.updateReportStatus('report-1', updateDto, mockRequest);

      expect(mockAdminService.updateReportStatus).toHaveBeenCalledWith(
        'report-1',
        'dismissed',
        'admin-1',
        undefined,
      );
    });
  });

  describe('GET /api/admin/reports/chat-logs/:gameId', () => {
    it('should return chat logs for a game', async () => {
      const mockChatLogs = {
        game: {
          id: 'game-1',
          whitePlayerId: 'user-1',
          blackPlayerId: 'user-2',
          status: 'COMPLETED',
        },
        messages: [
          {
            id: 'msg-1',
            message: 'Good luck!',
            sender: {
              id: 'user-1',
              username: 'white',
            },
          },
        ],
        totalMessages: 1,
      };

      mockAdminService.getChatLogs.mockResolvedValue(mockChatLogs);

      const result = await controller.getChatLogs('game-1');

      expect(result).toEqual(mockChatLogs);
      expect(mockAdminService.getChatLogs).toHaveBeenCalledWith('game-1');
    });
  });
});
