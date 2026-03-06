import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('AdminService - Report Management', () => {
  let service: AdminService;
  let prisma: PrismaService;

  const mockPrismaService = {
    report: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    game: {
      findUnique: jest.fn(),
    },
    chatMessage: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getReports', () => {
    it('should return paginated reports with filters', async () => {
      const mockReports = [
        {
          id: 'report-1',
          reportType: 'cheating',
          status: 'PENDING',
          description: 'Suspected cheating',
          createdAt: new Date(),
          reporter: {
            id: 'user-1',
            username: 'reporter',
            displayName: 'Reporter',
            email: 'reporter@test.com',
            avatarUrl: null,
          },
          reportedUser: {
            id: 'user-2',
            username: 'reported',
            displayName: 'Reported',
            email: 'reported@test.com',
            avatarUrl: null,
          },
          reviewer: null,
        },
      ];

      mockPrismaService.report.count.mockResolvedValue(1);
      mockPrismaService.report.findMany.mockResolvedValue(mockReports);

      const result = await service.getReports({
        status: 'pending',
        page: 1,
        limit: 50,
      });

      expect(result).toEqual({
        reports: mockReports,
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      expect(mockPrismaService.report.count).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
      });
    });

    it('should filter by report type', async () => {
      mockPrismaService.report.count.mockResolvedValue(0);
      mockPrismaService.report.findMany.mockResolvedValue([]);

      await service.getReports({
        reportType: 'cheating',
        page: 1,
        limit: 50,
      });

      expect(mockPrismaService.report.count).toHaveBeenCalledWith({
        where: { reportType: 'cheating' },
      });
    });

    it('should filter by reported user ID', async () => {
      mockPrismaService.report.count.mockResolvedValue(0);
      mockPrismaService.report.findMany.mockResolvedValue([]);

      await service.getReports({
        reportedUserId: 'user-123',
        page: 1,
        limit: 50,
      });

      expect(mockPrismaService.report.count).toHaveBeenCalledWith({
        where: { reportedUserId: 'user-123' },
      });
    });
  });

  describe('getReportById', () => {
    it('should return report with full details', async () => {
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
          email: 'reporter@test.com',
          avatarUrl: null,
          createdAt: new Date(),
        },
        reportedUser: {
          id: 'user-2',
          username: 'reported',
          displayName: 'Reported',
          email: 'reported@test.com',
          avatarUrl: null,
          isBanned: false,
          banReason: null,
          createdAt: new Date(),
        },
        reviewer: null,
      };

      const mockGameDetails = {
        id: 'game-1',
        whitePlayerId: 'user-2',
        blackPlayerId: 'user-3',
        timeControl: 'BLITZ',
        status: 'COMPLETED',
        result: 'WHITE_WIN',
        terminationReason: 'checkmate',
        pgn: '1. e4 e5',
        createdAt: new Date(),
        completedAt: new Date(),
        whitePlayer: {
          id: 'user-2',
          username: 'reported',
          displayName: 'Reported',
        },
        blackPlayer: {
          id: 'user-3',
          username: 'opponent',
          displayName: 'Opponent',
        },
      };

      mockPrismaService.report.findUnique.mockResolvedValue(mockReport);
      mockPrismaService.game.findUnique.mockResolvedValue(mockGameDetails);

      const result = await service.getReportById('report-1');

      expect(result).toEqual({
        ...mockReport,
        gameDetails: mockGameDetails,
      });
    });

    it('should throw NotFoundException if report not found', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue(null);

      await expect(service.getReportById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not include game details if no gameId', async () => {
      const mockReport = {
        id: 'report-1',
        reportType: 'harassment',
        status: 'PENDING',
        description: 'Harassment report',
        gameId: null,
        createdAt: new Date(),
        reporter: {
          id: 'user-1',
          username: 'reporter',
          displayName: 'Reporter',
          email: 'reporter@test.com',
          avatarUrl: null,
          createdAt: new Date(),
        },
        reportedUser: {
          id: 'user-2',
          username: 'reported',
          displayName: 'Reported',
          email: 'reported@test.com',
          avatarUrl: null,
          isBanned: false,
          banReason: null,
          createdAt: new Date(),
        },
        reviewer: null,
      };

      mockPrismaService.report.findUnique.mockResolvedValue(mockReport);

      const result = await service.getReportById('report-1');

      expect(result.gameDetails).toBeNull();
      expect(mockPrismaService.game.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('updateReportStatus', () => {
    it('should update report status successfully', async () => {
      const mockReport = {
        id: 'report-1',
        reportType: 'cheating',
        status: 'PENDING',
      };

      const mockUpdatedReport = {
        id: 'report-1',
        reportType: 'cheating',
        status: 'REVIEWED',
        reviewedBy: 'admin-1',
        reviewedAt: expect.any(Date),
        adminNotes: 'Reviewed and confirmed',
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
        reviewer: {
          id: 'admin-1',
          username: 'admin',
          displayName: 'Admin',
        },
      };

      mockPrismaService.report.findUnique.mockResolvedValue(mockReport);
      mockPrismaService.report.update.mockResolvedValue(mockUpdatedReport);

      const result = await service.updateReportStatus(
        'report-1',
        'reviewed',
        'admin-1',
        'Reviewed and confirmed',
      );

      expect(result).toEqual(mockUpdatedReport);
      expect(mockPrismaService.report.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: {
          status: 'REVIEWED',
          reviewedBy: 'admin-1',
          reviewedAt: expect.any(Date),
          adminNotes: 'Reviewed and confirmed',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if report not found', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue(null);

      await expect(
        service.updateReportStatus('invalid-id', 'reviewed', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getChatLogs', () => {
    it('should return chat logs for a game', async () => {
      const mockGame = {
        id: 'game-1',
        whitePlayerId: 'user-1',
        blackPlayerId: 'user-2',
        status: 'COMPLETED',
        createdAt: new Date(),
        completedAt: new Date(),
        whitePlayer: {
          id: 'user-1',
          username: 'white',
          displayName: 'White Player',
        },
        blackPlayer: {
          id: 'user-2',
          username: 'black',
          displayName: 'Black Player',
        },
      };

      const mockMessages = [
        {
          id: 'msg-1',
          gameId: 'game-1',
          senderId: 'user-1',
          message: 'Good luck!',
          isSpectator: false,
          createdAt: new Date(),
          sender: {
            id: 'user-1',
            username: 'white',
            displayName: 'White Player',
            avatarUrl: null,
          },
          reports: [],
        },
        {
          id: 'msg-2',
          gameId: 'game-1',
          senderId: 'user-2',
          message: 'You too!',
          isSpectator: false,
          createdAt: new Date(),
          sender: {
            id: 'user-2',
            username: 'black',
            displayName: 'Black Player',
            avatarUrl: null,
          },
          reports: [],
        },
      ];

      mockPrismaService.game.findUnique.mockResolvedValue(mockGame);
      mockPrismaService.chatMessage.findMany.mockResolvedValue(mockMessages);

      const result = await service.getChatLogs('game-1');

      expect(result).toEqual({
        game: mockGame,
        messages: mockMessages,
        totalMessages: 2,
      });

      expect(mockPrismaService.chatMessage.findMany).toHaveBeenCalledWith({
        where: { gameId: 'game-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should throw NotFoundException if game not found', async () => {
      mockPrismaService.game.findUnique.mockResolvedValue(null);

      await expect(service.getChatLogs('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty messages array if no chat messages', async () => {
      const mockGame = {
        id: 'game-1',
        whitePlayerId: 'user-1',
        blackPlayerId: 'user-2',
        status: 'COMPLETED',
        createdAt: new Date(),
        completedAt: new Date(),
        whitePlayer: {
          id: 'user-1',
          username: 'white',
          displayName: 'White Player',
        },
        blackPlayer: {
          id: 'user-2',
          username: 'black',
          displayName: 'Black Player',
        },
      };

      mockPrismaService.game.findUnique.mockResolvedValue(mockGame);
      mockPrismaService.chatMessage.findMany.mockResolvedValue([]);

      const result = await service.getChatLogs('game-1');

      expect(result.messages).toEqual([]);
      expect(result.totalMessages).toBe(0);
    });
  });
});
