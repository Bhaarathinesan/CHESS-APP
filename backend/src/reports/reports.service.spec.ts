import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto, ReportType } from './dto/create-report.dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    game: {
      findUnique: jest.fn(),
    },
    chatMessage: {
      findUnique: jest.fn(),
    },
    report: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReport', () => {
    const reporterId = 'reporter-id';

    describe('user reports', () => {
      it('should create a user report successfully', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.USER,
          description: 'Harassment in chat',
          reportedUserId: 'reported-user-id',
        };

        mockPrismaService.user.findUnique.mockResolvedValue({ id: 'reported-user-id' });
        mockPrismaService.report.create.mockResolvedValue({
          id: 'report-id',
          reporterId,
          reportedUserId: dto.reportedUserId,
          reportType: 'harassment',
          description: dto.description,
          status: 'PENDING',
          reporter: { id: reporterId, username: 'reporter', displayName: 'Reporter' },
          reportedUser: { id: dto.reportedUserId, username: 'reported', displayName: 'Reported' },
        });

        const result = await service.createReport(reporterId, dto);

        expect(result).toBeDefined();
        expect(result.reportType).toBe('harassment');
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: dto.reportedUserId },
          select: { id: true },
        });
        expect(mockPrismaService.report.create).toHaveBeenCalled();
      });

      it('should throw BadRequestException if reportedUserId is missing', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.USER,
          description: 'Harassment',
        };

        await expect(service.createReport(reporterId, dto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for self-reporting', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.USER,
          description: 'Self report',
          reportedUserId: reporterId,
        };

        await expect(service.createReport(reporterId, dto)).rejects.toThrow(
          'You cannot report yourself',
        );
      });

      it('should throw NotFoundException if reported user does not exist', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.USER,
          description: 'Harassment',
          reportedUserId: 'non-existent-user',
        };

        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await expect(service.createReport(reporterId, dto)).rejects.toThrow(
          'Reported user not found',
        );
      });
    });

    describe('game reports (cheating)', () => {
      it('should create a game report successfully', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.GAME,
          description: 'Suspected cheating',
          reportedUserId: 'cheater-id',
          gameId: 'game-id',
        };

        mockPrismaService.user.findUnique.mockResolvedValue({ id: 'cheater-id' });
        mockPrismaService.game.findUnique.mockResolvedValue({ id: 'game-id' });
        mockPrismaService.report.create.mockResolvedValue({
          id: 'report-id',
          reporterId,
          reportedUserId: dto.reportedUserId,
          gameId: dto.gameId,
          reportType: 'cheating',
          description: dto.description,
          status: 'PENDING',
        });

        const result = await service.createReport(reporterId, dto);

        expect(result).toBeDefined();
        expect(result.reportType).toBe('cheating');
        expect(mockPrismaService.game.findUnique).toHaveBeenCalledWith({
          where: { id: dto.gameId },
          select: { id: true },
        });
      });

      it('should throw BadRequestException if gameId is missing', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.GAME,
          description: 'Cheating',
          reportedUserId: 'cheater-id',
        };

        await expect(service.createReport(reporterId, dto)).rejects.toThrow(
          'gameId is required for game reports',
        );
      });

      it('should throw BadRequestException if reportedUserId is missing', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.GAME,
          description: 'Cheating',
          gameId: 'game-id',
        };

        await expect(service.createReport(reporterId, dto)).rejects.toThrow(
          'reportedUserId is required for game reports',
        );
      });

      it('should throw NotFoundException if game does not exist', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.GAME,
          description: 'Cheating',
          reportedUserId: 'cheater-id',
          gameId: 'non-existent-game',
        };

        mockPrismaService.user.findUnique.mockResolvedValue({ id: 'cheater-id' });
        mockPrismaService.game.findUnique.mockResolvedValue(null);

        await expect(service.createReport(reporterId, dto)).rejects.toThrow(
          'Game not found',
        );
      });
    });

    describe('chat reports', () => {
      it('should create a chat report successfully', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.CHAT,
          description: 'Inappropriate language',
          chatMessageId: 'message-id',
        };

        mockPrismaService.chatMessage.findUnique.mockResolvedValue({
          id: 'message-id',
          senderId: 'sender-id',
        });
        mockPrismaService.report.create.mockResolvedValue({
          id: 'report-id',
          reporterId,
          reportType: 'inappropriate_chat',
          description: dto.description,
          status: 'PENDING',
        });

        const result = await service.createReport(reporterId, dto);

        expect(result).toBeDefined();
        expect(result.reportType).toBe('inappropriate_chat');
        expect(mockPrismaService.chatMessage.findUnique).toHaveBeenCalledWith({
          where: { id: dto.chatMessageId },
          select: { id: true, senderId: true },
        });
      });

      it('should throw BadRequestException if chatMessageId is missing', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.CHAT,
          description: 'Inappropriate chat',
        };

        await expect(service.createReport(reporterId, dto)).rejects.toThrow(
          'chatMessageId is required for chat reports',
        );
      });

      it('should throw BadRequestException for reporting own message', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.CHAT,
          description: 'My own message',
          chatMessageId: 'message-id',
        };

        mockPrismaService.chatMessage.findUnique.mockResolvedValue({
          id: 'message-id',
          senderId: reporterId,
        });

        await expect(service.createReport(reporterId, dto)).rejects.toThrow(
          'You cannot report your own messages',
        );
      });

      it('should throw NotFoundException if chat message does not exist', async () => {
        const dto: CreateReportDto = {
          reportType: ReportType.CHAT,
          description: 'Inappropriate chat',
          chatMessageId: 'non-existent-message',
        };

        mockPrismaService.chatMessage.findUnique.mockResolvedValue(null);

        await expect(service.createReport(reporterId, dto)).rejects.toThrow(
          'Chat message not found',
        );
      });
    });
  });

  describe('getReports', () => {
    it('should return all reports without filter', async () => {
      const mockReports = [
        { id: 'report-1', status: 'PENDING' },
        { id: 'report-2', status: 'REVIEWED' },
      ];

      mockPrismaService.report.findMany.mockResolvedValue(mockReports);

      const result = await service.getReports();

      expect(result).toEqual(mockReports);
      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter reports by status', async () => {
      const mockReports = [{ id: 'report-1', status: 'PENDING' }];

      mockPrismaService.report.findMany.mockResolvedValue(mockReports);

      const result = await service.getReports('pending');

      expect(result).toEqual(mockReports);
      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should support pagination', async () => {
      mockPrismaService.report.findMany.mockResolvedValue([]);

      await service.getReports(undefined, 10, 20);

      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });
  });

  describe('getReportById', () => {
    it('should return a report by ID', async () => {
      const mockReport = {
        id: 'report-id',
        status: 'PENDING',
        reporter: { id: 'reporter-id', username: 'reporter' },
      };

      mockPrismaService.report.findUnique.mockResolvedValue(mockReport);

      const result = await service.getReportById('report-id');

      expect(result).toEqual(mockReport);
      expect(mockPrismaService.report.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-id' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if report does not exist', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue(null);

      await expect(service.getReportById('non-existent')).rejects.toThrow(
        'Report not found',
      );
    });
  });

  describe('updateReportStatus', () => {
    it('should update report status successfully', async () => {
      const reportId = 'report-id';
      const reviewerId = 'admin-id';
      const status = 'reviewed';
      const adminNotes = 'Reviewed and resolved';

      mockPrismaService.report.findUnique.mockResolvedValue({
        id: reportId,
        status: 'PENDING',
      });

      mockPrismaService.report.update.mockResolvedValue({
        id: reportId,
        status: 'REVIEWED',
        reviewedBy: reviewerId,
        adminNotes,
      });

      const result = await service.updateReportStatus(
        reportId,
        status,
        reviewerId,
        adminNotes,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('REVIEWED');
      expect(mockPrismaService.report.update).toHaveBeenCalledWith({
        where: { id: reportId },
        data: {
          status: 'REVIEWED',
          reviewedBy: reviewerId,
          reviewedAt: expect.any(Date),
          adminNotes,
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if report does not exist', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue(null);

      await expect(
        service.updateReportStatus('non-existent', 'reviewed', 'admin-id'),
      ).rejects.toThrow('Report not found');
    });
  });
});
