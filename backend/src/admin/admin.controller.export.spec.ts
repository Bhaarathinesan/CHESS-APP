import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AnnouncementService } from './announcement.service';
import { LoggingService } from './logging.service';
import { ExportService } from './export.service';

describe('AdminController - Export Endpoints', () => {
  let controller: AdminController;
  let exportService: ExportService;

  const mockExportService = {
    exportUsersToCSV: jest.fn(),
    exportUsersToPDF: jest.fn(),
    exportAnalyticsToCSV: jest.fn(),
    exportAnalyticsToPDF: jest.fn(),
  };

  const mockAdminService = {};
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
        {
          provide: ExportService,
          useValue: mockExportService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    exportService = module.get<ExportService>(ExportService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('exportUsersCSV', () => {
    it('should export users as CSV', async () => {
      const mockCSVBuffer = Buffer.from('id,email,username\nuser-1,test@test.com,testuser');
      mockExportService.exportUsersToCSV.mockResolvedValue(mockCSVBuffer);

      const result = await controller.exportUsersCSV(undefined, undefined, undefined);

      expect(result).toHaveProperty('filename');
      expect(result.filename).toContain('.csv');
      expect(result.contentType).toBe('text/csv');
      expect(result.data).toBe(mockCSVBuffer.toString('base64'));
      expect(mockExportService.exportUsersToCSV).toHaveBeenCalledWith({});
    });

    it('should apply role filter', async () => {
      const mockCSVBuffer = Buffer.from('id,email,username\n');
      mockExportService.exportUsersToCSV.mockResolvedValue(mockCSVBuffer);

      await controller.exportUsersCSV('PLAYER', undefined, undefined);

      expect(mockExportService.exportUsersToCSV).toHaveBeenCalledWith({
        role: 'PLAYER',
      });
    });

    it('should apply college domain filter', async () => {
      const mockCSVBuffer = Buffer.from('id,email,username\n');
      mockExportService.exportUsersToCSV.mockResolvedValue(mockCSVBuffer);

      await controller.exportUsersCSV(undefined, 'college.edu', undefined);

      expect(mockExportService.exportUsersToCSV).toHaveBeenCalledWith({
        collegeDomain: 'college.edu',
      });
    });

    it('should apply banned filter', async () => {
      const mockCSVBuffer = Buffer.from('id,email,username\n');
      mockExportService.exportUsersToCSV.mockResolvedValue(mockCSVBuffer);

      await controller.exportUsersCSV(undefined, undefined, 'true');

      expect(mockExportService.exportUsersToCSV).toHaveBeenCalledWith({
        isBanned: true,
      });
    });

    it('should generate filename with current date', async () => {
      const mockCSVBuffer = Buffer.from('id,email,username\n');
      mockExportService.exportUsersToCSV.mockResolvedValue(mockCSVBuffer);

      const result = await controller.exportUsersCSV(undefined, undefined, undefined);

      const today = new Date().toISOString().split('T')[0];
      expect(result.filename).toContain(today);
    });
  });

  describe('exportUsersPDF', () => {
    it('should export users as PDF', async () => {
      const mockPDFBuffer = Buffer.from('%PDF-1.4\n');
      mockExportService.exportUsersToPDF.mockResolvedValue(mockPDFBuffer);

      const result = await controller.exportUsersPDF(undefined, undefined, undefined);

      expect(result).toHaveProperty('filename');
      expect(result.filename).toContain('.pdf');
      expect(result.contentType).toBe('application/pdf');
      expect(result.data).toBe(mockPDFBuffer.toString('base64'));
      expect(mockExportService.exportUsersToPDF).toHaveBeenCalledWith({});
    });

    it('should apply filters to PDF export', async () => {
      const mockPDFBuffer = Buffer.from('%PDF-1.4\n');
      mockExportService.exportUsersToPDF.mockResolvedValue(mockPDFBuffer);

      await controller.exportUsersPDF('TOURNAMENT_ADMIN', 'college.edu', 'false');

      expect(mockExportService.exportUsersToPDF).toHaveBeenCalledWith({
        role: 'TOURNAMENT_ADMIN',
        collegeDomain: 'college.edu',
        isBanned: false,
      });
    });
  });

  describe('exportAnalyticsCSV', () => {
    it('should export analytics as CSV', async () => {
      const mockCSVBuffer = Buffer.from('metric,value\ntotal_users,100');
      mockExportService.exportAnalyticsToCSV.mockResolvedValue(mockCSVBuffer);

      const result = await controller.exportAnalyticsCSV();

      expect(result).toHaveProperty('filename');
      expect(result.filename).toContain('.csv');
      expect(result.filename).toContain('analytics-report');
      expect(result.contentType).toBe('text/csv');
      expect(result.data).toBe(mockCSVBuffer.toString('base64'));
      expect(mockExportService.exportAnalyticsToCSV).toHaveBeenCalled();
    });

    it('should generate filename with current date', async () => {
      const mockCSVBuffer = Buffer.from('metric,value\n');
      mockExportService.exportAnalyticsToCSV.mockResolvedValue(mockCSVBuffer);

      const result = await controller.exportAnalyticsCSV();

      const today = new Date().toISOString().split('T')[0];
      expect(result.filename).toContain(today);
    });
  });

  describe('exportAnalyticsPDF', () => {
    it('should export analytics as PDF', async () => {
      const mockPDFBuffer = Buffer.from('%PDF-1.4\n');
      mockExportService.exportAnalyticsToPDF.mockResolvedValue(mockPDFBuffer);

      const result = await controller.exportAnalyticsPDF();

      expect(result).toHaveProperty('filename');
      expect(result.filename).toContain('.pdf');
      expect(result.filename).toContain('analytics-report');
      expect(result.contentType).toBe('application/pdf');
      expect(result.data).toBe(mockPDFBuffer.toString('base64'));
      expect(mockExportService.exportAnalyticsToPDF).toHaveBeenCalled();
    });
  });

  describe('Requirements Validation', () => {
    it('should support CSV format for user data export (Requirement 25.17)', async () => {
      const mockCSVBuffer = Buffer.from('data');
      mockExportService.exportUsersToCSV.mockResolvedValue(mockCSVBuffer);

      const result = await controller.exportUsersCSV(undefined, undefined, undefined);

      expect(result.contentType).toBe('text/csv');
    });

    it('should support PDF format for user data export (Requirement 25.17)', async () => {
      const mockPDFBuffer = Buffer.from('data');
      mockExportService.exportUsersToPDF.mockResolvedValue(mockPDFBuffer);

      const result = await controller.exportUsersPDF(undefined, undefined, undefined);

      expect(result.contentType).toBe('application/pdf');
    });

    it('should support CSV format for analytics export (Requirement 25.17)', async () => {
      const mockCSVBuffer = Buffer.from('data');
      mockExportService.exportAnalyticsToCSV.mockResolvedValue(mockCSVBuffer);

      const result = await controller.exportAnalyticsCSV();

      expect(result.contentType).toBe('text/csv');
    });

    it('should support PDF format for analytics export (Requirement 25.17)', async () => {
      const mockPDFBuffer = Buffer.from('data');
      mockExportService.exportAnalyticsToPDF.mockResolvedValue(mockPDFBuffer);

      const result = await controller.exportAnalyticsPDF();

      expect(result.contentType).toBe('application/pdf');
    });
  });
});
