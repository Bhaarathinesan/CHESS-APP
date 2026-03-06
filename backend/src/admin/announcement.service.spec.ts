import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementService } from './announcement.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotFoundException } from '@nestjs/common';
import { AnnouncementPriority } from '@prisma/client';

describe('AnnouncementService', () => {
  let service: AnnouncementService;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;
  let notificationsGateway: NotificationsGateway;

  const mockPrismaService = {
    announcement: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockNotificationsService = {
    notifyAnnouncement: jest.fn(),
  };

  const mockNotificationsGateway = {
    getConnectedUserCount: jest.fn(),
    server: {
      emit: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
      ],
    }).compile();

    service = module.get<AnnouncementService>(AnnouncementService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    notificationsGateway = module.get<NotificationsGateway>(NotificationsGateway);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAnnouncement', () => {
    it('should create an announcement and broadcast to all users', async () => {
      const dto = {
        title: 'Maintenance Notice',
        message: 'System will be down for maintenance',
        priority: AnnouncementPriority.HIGH,
        linkUrl: '/maintenance',
      };
      const createdBy = 'admin-user-id';
      const mockAnnouncement = {
        id: 'announcement-id',
        ...dto,
        createdBy,
        createdAt: new Date(),
        expiresAt: null,
        isActive: true,
      };

      mockPrismaService.announcement.create.mockResolvedValue(mockAnnouncement);
      mockNotificationsService.notifyAnnouncement.mockResolvedValue(undefined);
      mockNotificationsGateway.getConnectedUserCount.mockReturnValue(10);

      const result = await service.createAnnouncement(dto, createdBy);

      expect(result).toEqual(mockAnnouncement);
      expect(prisma.announcement.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          message: dto.message,
          priority: dto.priority,
          linkUrl: dto.linkUrl,
          expiresAt: null,
          createdBy,
          isActive: true,
        },
      });
      expect(notificationsService.notifyAnnouncement).toHaveBeenCalledWith(
        dto.title,
        dto.message,
        dto.linkUrl,
      );
      expect(notificationsGateway.server.emit).toHaveBeenCalledWith('announcement', {
        id: mockAnnouncement.id,
        title: mockAnnouncement.title,
        message: mockAnnouncement.message,
        priority: mockAnnouncement.priority,
        linkUrl: mockAnnouncement.linkUrl,
        createdAt: mockAnnouncement.createdAt,
      });
    });

    it('should create announcement with default priority', async () => {
      const dto = {
        title: 'New Feature',
        message: 'Check out our new feature',
      };
      const createdBy = 'admin-user-id';
      const mockAnnouncement = {
        id: 'announcement-id',
        ...dto,
        priority: AnnouncementPriority.NORMAL,
        linkUrl: null,
        createdBy,
        createdAt: new Date(),
        expiresAt: null,
        isActive: true,
      };

      mockPrismaService.announcement.create.mockResolvedValue(mockAnnouncement);
      mockNotificationsService.notifyAnnouncement.mockResolvedValue(undefined);
      mockNotificationsGateway.getConnectedUserCount.mockReturnValue(0);

      const result = await service.createAnnouncement(dto, createdBy);

      expect(result.priority).toBe(AnnouncementPriority.NORMAL);
    });
  });

  describe('getAnnouncements', () => {
    it('should return paginated announcements', async () => {
      const dto = { limit: 10, offset: 0, activeOnly: true };
      const mockAnnouncements = [
        {
          id: '1',
          title: 'Announcement 1',
          message: 'Message 1',
          priority: AnnouncementPriority.HIGH,
          linkUrl: null,
          createdBy: 'admin-id',
          createdAt: new Date(),
          expiresAt: null,
          isActive: true,
        },
      ];

      mockPrismaService.announcement.findMany.mockResolvedValue(mockAnnouncements);
      mockPrismaService.announcement.count.mockResolvedValue(1);

      const result = await service.getAnnouncements(dto);

      expect(result).toEqual({
        announcements: mockAnnouncements,
        total: 1,
        limit: 10,
        offset: 0,
      });
      expect(prisma.announcement.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } },
          ],
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: 0,
        take: 10,
      });
    });

    it('should return all announcements when activeOnly is false', async () => {
      const dto = { limit: 10, offset: 0, activeOnly: false };

      mockPrismaService.announcement.findMany.mockResolvedValue([]);
      mockPrismaService.announcement.count.mockResolvedValue(0);

      await service.getAnnouncements(dto);

      expect(prisma.announcement.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: 0,
        take: 10,
      });
    });
  });

  describe('getAnnouncementById', () => {
    it('should return an announcement by ID', async () => {
      const mockAnnouncement = {
        id: 'announcement-id',
        title: 'Test',
        message: 'Test message',
        priority: AnnouncementPriority.NORMAL,
        linkUrl: null,
        createdBy: 'admin-id',
        createdAt: new Date(),
        expiresAt: null,
        isActive: true,
      };

      mockPrismaService.announcement.findUnique.mockResolvedValue(mockAnnouncement);

      const result = await service.getAnnouncementById('announcement-id');

      expect(result).toEqual(mockAnnouncement);
    });

    it('should throw NotFoundException if announcement not found', async () => {
      mockPrismaService.announcement.findUnique.mockResolvedValue(null);

      await expect(service.getAnnouncementById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAnnouncement', () => {
    it('should update an announcement', async () => {
      const existingAnnouncement = {
        id: 'announcement-id',
        title: 'Old Title',
        message: 'Old message',
        priority: AnnouncementPriority.NORMAL,
        linkUrl: null,
        createdBy: 'admin-id',
        createdAt: new Date(),
        expiresAt: null,
        isActive: true,
      };

      const updateDto = {
        title: 'New Title',
        message: 'New message',
        priority: AnnouncementPriority.HIGH,
      };

      const updatedAnnouncement = {
        ...existingAnnouncement,
        ...updateDto,
      };

      mockPrismaService.announcement.findUnique.mockResolvedValue(existingAnnouncement);
      mockPrismaService.announcement.update.mockResolvedValue(updatedAnnouncement);

      const result = await service.updateAnnouncement('announcement-id', updateDto);

      expect(result).toEqual(updatedAnnouncement);
      expect(prisma.announcement.update).toHaveBeenCalledWith({
        where: { id: 'announcement-id' },
        data: {
          title: updateDto.title,
          message: updateDto.message,
          priority: updateDto.priority,
          linkUrl: undefined,
          expiresAt: undefined,
        },
      });
    });
  });

  describe('deactivateAnnouncement', () => {
    it('should deactivate an announcement', async () => {
      const mockAnnouncement = {
        id: 'announcement-id',
        title: 'Test',
        message: 'Test message',
        priority: AnnouncementPriority.NORMAL,
        linkUrl: null,
        createdBy: 'admin-id',
        createdAt: new Date(),
        expiresAt: null,
        isActive: true,
      };

      mockPrismaService.announcement.findUnique.mockResolvedValue(mockAnnouncement);
      mockPrismaService.announcement.update.mockResolvedValue({
        ...mockAnnouncement,
        isActive: false,
      });

      await service.deactivateAnnouncement('announcement-id');

      expect(prisma.announcement.update).toHaveBeenCalledWith({
        where: { id: 'announcement-id' },
        data: { isActive: false },
      });
    });
  });

  describe('deleteAnnouncement', () => {
    it('should delete an announcement', async () => {
      const mockAnnouncement = {
        id: 'announcement-id',
        title: 'Test',
        message: 'Test message',
        priority: AnnouncementPriority.NORMAL,
        linkUrl: null,
        createdBy: 'admin-id',
        createdAt: new Date(),
        expiresAt: null,
        isActive: true,
      };

      mockPrismaService.announcement.findUnique.mockResolvedValue(mockAnnouncement);
      mockPrismaService.announcement.delete.mockResolvedValue(mockAnnouncement);

      await service.deleteAnnouncement('announcement-id');

      expect(prisma.announcement.delete).toHaveBeenCalledWith({
        where: { id: 'announcement-id' },
      });
    });
  });

  describe('getActiveAnnouncements', () => {
    it('should return active announcements for dashboard', async () => {
      const mockAnnouncements = [
        {
          id: '1',
          title: 'Announcement 1',
          message: 'Message 1',
          priority: AnnouncementPriority.URGENT,
          linkUrl: null,
          createdBy: 'admin-id',
          createdAt: new Date(),
          expiresAt: null,
          isActive: true,
        },
      ];

      mockPrismaService.announcement.findMany.mockResolvedValue(mockAnnouncements);

      const result = await service.getActiveAnnouncements(5);

      expect(result).toEqual(mockAnnouncements);
      expect(prisma.announcement.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } },
          ],
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 5,
      });
    });
  });

  describe('cleanupExpiredAnnouncements', () => {
    it('should deactivate expired announcements', async () => {
      mockPrismaService.announcement.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.cleanupExpiredAnnouncements();

      expect(result).toBe(3);
      expect(prisma.announcement.updateMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          expiresAt: {
            lte: expect.any(Date),
          },
        },
        data: {
          isActive: false,
        },
      });
    });

    it('should return 0 if no expired announcements', async () => {
      mockPrismaService.announcement.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.cleanupExpiredAnnouncements();

      expect(result).toBe(0);
    });
  });
});
