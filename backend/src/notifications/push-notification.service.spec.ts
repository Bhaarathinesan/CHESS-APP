import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PushNotificationService } from './push-notification.service';
import { PrismaService } from '../prisma/prisma.service';
import * as webpush from 'web-push';

jest.mock('web-push');

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockUser = {
    id: 'user-1',
    notificationPreferences: {
      pushNotifications: true,
      pushSubscriptions: [
        {
          endpoint: 'https://example.com/push/1',
          keys: {
            p256dh: 'test-key-1',
            auth: 'test-auth-1',
          },
        },
      ],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                VAPID_PUBLIC_KEY: 'test-public-key',
                VAPID_PRIVATE_KEY: 'test-private-key',
                VAPID_SUBJECT: 'mailto:test@example.com',
              };
              return config[key];
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendPushNotification', () => {
    it('should send push notification to user', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      (webpush.sendNotification as jest.Mock).mockResolvedValue({ statusCode: 201 });

      await service.sendPushNotification(
        'user-1',
        'Test Title',
        'Test Body',
        { type: 'test' },
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { notificationPreferences: true },
      });

      expect(webpush.sendNotification).toHaveBeenCalledWith(
        mockUser.notificationPreferences.pushSubscriptions[0],
        expect.stringContaining('Test Title'),
      );
    });

    it('should not send if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await service.sendPushNotification('user-1', 'Test', 'Test');

      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('should not send if push notifications disabled', async () => {
      const userWithDisabled = {
        ...mockUser,
        notificationPreferences: {
          ...mockUser.notificationPreferences,
          pushNotifications: false,
        },
      };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithDisabled as any);

      await service.sendPushNotification('user-1', 'Test', 'Test');

      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('should not send if no subscriptions', async () => {
      const userWithNoSubs = {
        ...mockUser,
        notificationPreferences: {
          pushNotifications: true,
          pushSubscriptions: [],
        },
      };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithNoSubs as any);

      await service.sendPushNotification('user-1', 'Test', 'Test');

      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('should remove invalid subscriptions', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      (webpush.sendNotification as jest.Mock).mockRejectedValue(new Error('Invalid subscription'));

      await service.sendPushNotification('user-1', 'Test', 'Test');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          notificationPreferences: {
            ...mockUser.notificationPreferences,
            pushSubscriptions: [],
          },
        },
      });
    });
  });

  describe('subscribe', () => {
    it('should add new subscription', async () => {
      const user = {
        id: 'user-1',
        notificationPreferences: {
          pushSubscriptions: [],
        },
      };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(user as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

      const newSubscription = {
        endpoint: 'https://example.com/push/new',
        keys: {
          p256dh: 'new-key',
          auth: 'new-auth',
        },
      };

      await service.subscribe('user-1', newSubscription);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          notificationPreferences: {
            pushSubscriptions: [newSubscription],
            pushNotifications: true,
          },
        },
      });
    });

    it('should not add duplicate subscription', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      await service.subscribe('user-1', mockUser.notificationPreferences.pushSubscriptions[0]);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.subscribe('user-1', { endpoint: 'test', keys: { p256dh: '', auth: '' } }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('unsubscribe', () => {
    it('should remove subscription', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

      await service.unsubscribe('user-1', 'https://example.com/push/1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          notificationPreferences: {
            ...mockUser.notificationPreferences,
            pushSubscriptions: [],
          },
        },
      });
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.unsubscribe('user-1', 'test-endpoint')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('sendKeyEventPush', () => {
    beforeEach(() => {
      jest.spyOn(service, 'sendPushNotification').mockResolvedValue();
    });

    it('should send game challenge notification', async () => {
      await service.sendKeyEventPush('user-1', 'game_challenge', {
        challengerName: 'Alice',
        timeControl: 'blitz',
      });

      expect(service.sendPushNotification).toHaveBeenCalledWith(
        'user-1',
        'New Game Challenge',
        'Alice has challenged you to a blitz game',
        expect.any(Object),
      );
    });

    it('should send tournament start notification', async () => {
      await service.sendKeyEventPush('user-1', 'tournament_start', {
        tournamentName: 'Weekly Blitz',
        minutes: 5,
      });

      expect(service.sendPushNotification).toHaveBeenCalledWith(
        'user-1',
        'Tournament Starting',
        'Weekly Blitz starts in 5 minutes',
        expect.any(Object),
      );
    });

    it('should send draw offer notification', async () => {
      await service.sendKeyEventPush('user-1', 'draw_offer', {
        opponentName: 'Bob',
      });

      expect(service.sendPushNotification).toHaveBeenCalledWith(
        'user-1',
        'Draw Offer',
        'Bob has offered a draw',
        expect.any(Object),
      );
    });

    it('should send game end notification', async () => {
      await service.sendKeyEventPush('user-1', 'game_end', {
        result: 'Victory',
      });

      expect(service.sendPushNotification).toHaveBeenCalledWith(
        'user-1',
        'Game Ended',
        'Your game has ended: Victory',
        expect.any(Object),
      );
    });

    it('should send achievement notification', async () => {
      await service.sendKeyEventPush('user-1', 'achievement', {
        achievementName: 'First Win',
      });

      expect(service.sendPushNotification).toHaveBeenCalledWith(
        'user-1',
        'Achievement Unlocked!',
        'First Win',
        expect.any(Object),
      );
    });

    it('should send tournament pairing notification', async () => {
      await service.sendKeyEventPush('user-1', 'tournament_pairing', {
        round: 2,
        opponentName: 'Charlie',
      });

      expect(service.sendPushNotification).toHaveBeenCalledWith(
        'user-1',
        'Tournament Pairing',
        'Round 2: You will play Charlie',
        expect.any(Object),
      );
    });

    it('should not send for unknown event type', async () => {
      await service.sendKeyEventPush('user-1', 'unknown_event', {});

      expect(service.sendPushNotification).not.toHaveBeenCalled();
    });
  });
});
