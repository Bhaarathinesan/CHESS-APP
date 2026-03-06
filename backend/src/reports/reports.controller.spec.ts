import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { CreateReportDto, ReportType } from './dto/create-report.dto';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  const mockReportsService = {
    createReport: jest.fn(),
    getReports: jest.fn(),
    getReportById: jest.fn(),
    updateReportStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createReport', () => {
    it('should create a user report', async () => {
      const dto: CreateReportDto = {
        reportType: ReportType.USER,
        description: 'Harassment',
        reportedUserId: 'user-id',
      };

      const mockReport = {
        id: 'report-id',
        reporterId: 'reporter-id',
        reportedUserId: dto.reportedUserId,
        reportType: 'harassment',
        description: dto.description,
        status: 'PENDING',
      };

      mockReportsService.createReport.mockResolvedValue(mockReport);

      const req = { user: { sub: 'reporter-id' } };
      const result = await controller.createReport(dto, req);

      expect(result).toEqual(mockReport);
      expect(mockReportsService.createReport).toHaveBeenCalledWith('reporter-id', dto);
    });

    it('should create a game report', async () => {
      const dto: CreateReportDto = {
        reportType: ReportType.GAME,
        description: 'Suspected cheating',
        reportedUserId: 'cheater-id',
        gameId: 'game-id',
      };

      const mockReport = {
        id: 'report-id',
        reporterId: 'reporter-id',
        reportedUserId: dto.reportedUserId,
        gameId: dto.gameId,
        reportType: 'cheating',
        description: dto.description,
        status: 'PENDING',
      };

      mockReportsService.createReport.mockResolvedValue(mockReport);

      const req = { user: { sub: 'reporter-id' } };
      const result = await controller.createReport(dto, req);

      expect(result).toEqual(mockReport);
      expect(mockReportsService.createReport).toHaveBeenCalledWith('reporter-id', dto);
    });

    it('should create a chat report', async () => {
      const dto: CreateReportDto = {
        reportType: ReportType.CHAT,
        description: 'Inappropriate language',
        chatMessageId: 'message-id',
      };

      const mockReport = {
        id: 'report-id',
        reporterId: 'reporter-id',
        reportType: 'inappropriate_chat',
        description: dto.description,
        status: 'PENDING',
      };

      mockReportsService.createReport.mockResolvedValue(mockReport);

      const req = { user: { sub: 'reporter-id' } };
      const result = await controller.createReport(dto, req);

      expect(result).toEqual(mockReport);
      expect(mockReportsService.createReport).toHaveBeenCalledWith('reporter-id', dto);
    });
  });

  describe('getReports', () => {
    it('should return all reports', async () => {
      const mockReports = [
        { id: 'report-1', status: 'PENDING' },
        { id: 'report-2', status: 'REVIEWED' },
      ];

      mockReportsService.getReports.mockResolvedValue(mockReports);

      const result = await controller.getReports();

      expect(result).toEqual(mockReports);
      expect(mockReportsService.getReports).toHaveBeenCalledWith(undefined, 50, 0);
    });

    it('should filter reports by status', async () => {
      const mockReports = [{ id: 'report-1', status: 'PENDING' }];

      mockReportsService.getReports.mockResolvedValue(mockReports);

      const result = await controller.getReports('pending');

      expect(result).toEqual(mockReports);
      expect(mockReportsService.getReports).toHaveBeenCalledWith('pending', 50, 0);
    });

    it('should support pagination', async () => {
      mockReportsService.getReports.mockResolvedValue([]);

      await controller.getReports(undefined, '10', '20');

      expect(mockReportsService.getReports).toHaveBeenCalledWith(undefined, 10, 20);
    });
  });

  describe('getReportById', () => {
    it('should return a report by ID', async () => {
      const mockReport = {
        id: 'report-id',
        status: 'PENDING',
        reporter: { id: 'reporter-id', username: 'reporter' },
      };

      mockReportsService.getReportById.mockResolvedValue(mockReport);

      const result = await controller.getReportById('report-id');

      expect(result).toEqual(mockReport);
      expect(mockReportsService.getReportById).toHaveBeenCalledWith('report-id');
    });
  });

  describe('updateReportStatus', () => {
    it('should update report status', async () => {
      const reportId = 'report-id';
      const body = {
        status: 'reviewed',
        adminNotes: 'Resolved',
      };

      const mockUpdatedReport = {
        id: reportId,
        status: 'REVIEWED',
        reviewedBy: 'admin-id',
        adminNotes: body.adminNotes,
      };

      mockReportsService.updateReportStatus.mockResolvedValue(mockUpdatedReport);

      const req = { user: { sub: 'admin-id' } };
      const result = await controller.updateReportStatus(reportId, body, req);

      expect(result).toEqual(mockUpdatedReport);
      expect(mockReportsService.updateReportStatus).toHaveBeenCalledWith(
        reportId,
        body.status,
        'admin-id',
        body.adminNotes,
      );
    });
  });
});
