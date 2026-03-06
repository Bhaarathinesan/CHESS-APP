import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly isConfigured: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const vapidSubject = this.configService.get<string>('VAPID_SUBJECT') || 'mailto:admin@chessarena.com';

    if (vapidPublicKey && vapidPrivateKey && 
        vapidPublicKey !== 'your-vapid-public-key' && 
        vapidPrivateKey !== 'your-vapid-private-key') {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      this.isConfigured = true;
      this.logger.log('Web Push configured');
    } else {
      this.isConfigured = false;
      this.logger.warn('Web Push not configured - push notifications will be logged only');
    }
  }

  /**
   * Send push notification to user
   * Requirements: 18.13
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: any,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.log(`[DEV MODE] Would send push to user ${userId}: ${title}`);
      return;
    }

    try {
      // Get user's push subscriptions from preferences
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { notificationPreferences: true },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found`);
        return;
      }

      const preferences = user.notificationPreferences as any;
      
      // Check if push notifications are enabled
      if (preferences?.pushNotifications === false) {
        this.logger.log(`User ${userId} has push notifications disabled`);
        return;
      }

      const subscriptions = preferences?.pushSubscriptions || [];

      if (subscriptions.length === 0) {
        this.logger.log(`No push subscriptions for user ${userId}`);
        return;
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: data || {},
        timestamp: Date.now(),
      });

      // Send to all subscriptions
      const results = await Promise.allSettled(
        subscriptions.map((subscription: PushSubscription) =>
          webpush.sendNotification(subscription, payload),
        ),
      );

      // Remove invalid subscriptions
      const validSubscriptions = subscriptions.filter((_, index) => {
        const result = results[index];
        if (result.status === 'rejected') {
          this.logger.warn(`Failed to send push to subscription ${index}: ${result.reason}`);
          return false;
        }
        return true;
      });

      // Update user preferences if subscriptions changed
      if (validSubscriptions.length !== subscriptions.length) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            notificationPreferences: {
              ...preferences,
              pushSubscriptions: validSubscriptions,
            },
          },
        });
      }

      this.logger.log(`Sent push notification to ${validSubscriptions.length} devices for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification to user ${userId}:`, error);
    }
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribe(userId: string, subscription: PushSubscription): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const preferences = user.notificationPreferences as any;
    const subscriptions = preferences?.pushSubscriptions || [];

    // Check if subscription already exists
    const exists = subscriptions.some(
      (sub: PushSubscription) => sub.endpoint === subscription.endpoint,
    );

    if (!exists) {
      subscriptions.push(subscription);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          notificationPreferences: {
            ...preferences,
            pushSubscriptions: subscriptions,
            pushNotifications: true,
          },
        },
      });

      this.logger.log(`Added push subscription for user ${userId}`);
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const preferences = user.notificationPreferences as any;
    const subscriptions = preferences?.pushSubscriptions || [];

    const filteredSubscriptions = subscriptions.filter(
      (sub: PushSubscription) => sub.endpoint !== endpoint,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: {
          ...preferences,
          pushSubscriptions: filteredSubscriptions,
        },
      },
    });

    this.logger.log(`Removed push subscription for user ${userId}`);
  }

  /**
   * Send push notification for key events
   * Requirements: 18.13
   */
  async sendKeyEventPush(userId: string, eventType: string, data: any): Promise<void> {
    const messages = {
      game_challenge: {
        title: 'New Game Challenge',
        body: `${data.challengerName} has challenged you to a ${data.timeControl} game`,
      },
      tournament_start: {
        title: 'Tournament Starting',
        body: `${data.tournamentName} starts in ${data.minutes} minutes`,
      },
      draw_offer: {
        title: 'Draw Offer',
        body: `${data.opponentName} has offered a draw`,
      },
      game_end: {
        title: 'Game Ended',
        body: `Your game has ended: ${data.result}`,
      },
      achievement: {
        title: 'Achievement Unlocked!',
        body: data.achievementName,
      },
      tournament_pairing: {
        title: 'Tournament Pairing',
        body: `Round ${data.round}: You will play ${data.opponentName}`,
      },
    };

    const message = messages[eventType];
    if (message) {
      await this.sendPushNotification(userId, message.title, message.body, data);
    }
  }
}
