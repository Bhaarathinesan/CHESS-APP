import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from './dto/create-notification.dto';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
    },
    follow: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const userId = 'user-1';
      const notification = {
        id: 'notif-1',
        userId,
        type: NotificationType.GAME_CHALLENGE,
        title: 'New Game Challenge',
        message: 'Test message',
        data: {},
        isRead: false,
        linkUrl: '/play',
        createdAt: new Date(),
        readAt: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        notificationPreferences: {},
      });
      mockPrismaService.notification.create.mockResolvedValue(notification);

      const result = await service.create({
        userId,
        type: NotificationType.GAME_CHALLENGE,
        title: 'New Game Challenge',
        message: 'Test message',
      });

      expect(result).toEqual(notification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: NotificationType.GAME_CHALLENGE,
          title: 'New Game Challenge',
          message: 'Test message',
          data: {},
          linkUrl: undefined,
        },
      });
    });

    it('should not create notification if user has DND enabled', async () => {
      const userId = 'user-1';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        notificationPreferences: { doNotDisturb: true },
      });

      const result = await service.create({
        userId,
        type: NotificationType.GAME_CHALLENGE,
        title: 'New Game Challenge',
        message: 'Test message',
      });

      expect(result).toBeNull();
      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
    });

    it('should not create notification if type is disabled', async () => {
      const userId = 'user-1';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        notificationPreferences: { game_challenge: false },
      });

      const result = await service.create({
        userId,
        type: NotificationType.GAME_CHALLENGE,
        title: 'New Game Challenge',
        message: 'Test message',
      });

      expect(result).toBeNull();
      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          userId: 'invalid-user',
          type: NotificationType.GAME_CHALLENGE,
          title: 'Test',
          message: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      const userId = 'user-1';
      const notifications = [
        { id: 'notif-1', userId, title: 'Test 1' },
        { id: 'notif-2', userId, title: 'Test 2' },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(notifications);
      mockPrismaService.notification.count.mockResolvedValue(10);

      const result = await service.findAll(userId, 1, 20);

      expect(result).toEqual({
        notifications,
        total: 10,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const userId = 'user-1';
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(5);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId, isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notif-1';
      const userId = 'user-1';
      const notification = { id: notificationId, userId, isRead: false };

      mockPrismaService.notification.findFirst.mockResolvedValue(notification);
      mockPrismaService.notification.update.mockResolvedValue({
        ...notification,
        isRead: true,
        readAt: new Date(),
      });

      const result = await service.markAsRead(notificationId, userId);

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('invalid-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const userId = 'user-1';
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.markAllAsRead(userId);

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('delete', () => {
    it('should delete notification', async () => {
      const notificationId = 'notif-1';
      const userId = 'user-1';
      const notification = { id: notificationId, userId };

      mockPrismaService.notification.findFirst.mockResolvedValue(notification);
      mockPrismaService.notification.delete.mockResolvedValue(notification);

      await service.delete(notificationId, userId);

      expect(mockPrismaService.notification.delete).toHaveBeenCalledWith({
        where: { id: notificationId },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await expect(service.delete('invalid-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('notifyGameChallenge', () => {
    it('should create game challenge notification', async () => {
      const userId = 'user-1';
      const notification = {
        id: 'notif-1',
        userId,
        type: NotificationType.GAME_CHALLENGE,
        title: 'New Game Challenge',
        message: 'John has challenged you to a blitz game',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        notificationPreferences: {},
      });
      mockPrismaService.notification.create.mockResolvedValue(notification);

      const result = await service.notifyGameChallenge(userId, 'challenger-1', 'John', 'blitz');

      expect(result.type).toBe(NotificationType.GAME_CHALLENGE);
      expect(result.message).toContain('John');
      expect(result.message).toContain('blitz');
    });
  });

  describe('notifyAnnouncement', () => {
    it('should create announcement for all users', async () => {
      const users = [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }];

      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 3 });

      await service.notifyAnnouncement('Test Title', 'Test Message');

      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-1',
            type: NotificationType.ANNOUNCEMENT,
            title: 'Test Title',
            message: 'Test Message',
          }),
        ]),
      });
    });
  });

  describe('notifyFriendOnline', () => {
    it('should notify followers when user comes online', async () => {
      const userId = 'user-1';
      const userName = 'John';
      const followers = [{ followerId: 'follower-1' }, { followerId: 'follower-2' }];

      mockPrismaService.follow.findMany.mockResolvedValue(followers);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });

      await service.notifyFriendOnline(userId, userName);

      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'follower-1',
            type: NotificationType.FRIEND_ONLINE,
            message: 'John is now online',
          }),
        ]),
      });
    });

    it('should not create notifications if no followers', async () => {
      mockPrismaService.follow.findMany.mockResolvedValue([]);

      await service.notifyFriendOnline('user-1', 'John');

      expect(mockPrismaService.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe('notifyRatingChange', () => {
    it('should create rating change notification with positive change', async () => {
      const userId = 'user-1';
      const notification = {
        id: 'notif-1',
        userId,
        type: NotificationType.RATING_CHANGE,
        message: 'Your blitz rating changed: 1500 → 1520 (+20)',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        notificationPreferences: {},
      });
      mockPrismaService.notification.create.mockResolvedValue(notification);

      const result = await service.notifyRatingChange(userId, 'blitz', 1500, 1520, 'game-1');

      expect(result.message).toContain('+20');
      expect(result.message).toContain('1500 → 1520');
    });

    it('should create rating change notification with negative change', async () => {
      const userId = 'user-1';
      const notification = {
        id: 'notif-1',
        userId,
        type: NotificationType.RATING_CHANGE,
        message: 'Your blitz rating changed: 1500 → 1480 (-20)',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        notificationPreferences: {},
      });
      mockPrismaService.notification.create.mockResolvedValue(notification);

      const result = await service.notifyRatingChange(userId, 'blitz', 1500, 1480, 'game-1');

      expect(result.message).toContain('-20');
      expect(result.message).toContain('1500 → 1480');
    });
  });
});
