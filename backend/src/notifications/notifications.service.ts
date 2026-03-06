import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto, NotificationType } from './dto/create-notification.dto';
import { Notification } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a notification for a user
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    // Check if user has this notification type enabled
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { notificationPreferences: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preferences = user.notificationPreferences as any;
    
    // Check Do Not Disturb mode
    if (preferences?.doNotDisturb) {
      this.logger.log(`User ${dto.userId} has DND enabled, skipping notification`);
      return null;
    }

    // Check if this notification type is enabled
    if (preferences && preferences[dto.type] === false) {
      this.logger.log(`User ${dto.userId} has ${dto.type} notifications disabled`);
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data || {},
        linkUrl: dto.linkUrl,
      },
    });

    this.logger.log(`Created notification ${notification.id} for user ${dto.userId}`);
    return notification;
  }

  /**
   * Get notifications for a user with pagination
   */
  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  // ==================== Event-specific notification methods ====================

  /**
   * Notify user of game challenge
   * Requirements: 18.1
   */
  async notifyGameChallenge(
    userId: string,
    challengerId: string,
    challengerName: string,
    timeControl: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.GAME_CHALLENGE,
      title: 'New Game Challenge',
      message: `${challengerName} has challenged you to a ${timeControl} game`,
      data: { challengerId, timeControl },
      linkUrl: '/play',
    });
  }

  /**
   * Notify user of tournament starting soon
   * Requirements: 18.2
   */
  async notifyTournamentStart(
    userId: string,
    tournamentId: string,
    tournamentName: string,
    minutesUntilStart: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.TOURNAMENT_START,
      title: 'Tournament Starting Soon',
      message: `${tournamentName} starts in ${minutesUntilStart} minutes`,
      data: { tournamentId, minutesUntilStart },
      linkUrl: `/tournaments/${tournamentId}`,
    });
  }

  /**
   * Notify user of tournament registration confirmation
   * Requirements: 18.3
   */
  async notifyTournamentConfirmation(
    userId: string,
    tournamentId: string,
    tournamentName: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.TOURNAMENT_CONFIRMATION,
      title: 'Tournament Registration Confirmed',
      message: `You have successfully registered for ${tournamentName}`,
      data: { tournamentId },
      linkUrl: `/tournaments/${tournamentId}`,
    });
  }

  /**
   * Notify user of tournament pairing
   * Requirements: 18.4
   */
  async notifyTournamentPairing(
    userId: string,
    tournamentId: string,
    tournamentName: string,
    opponentName: string,
    roundNumber: number,
    gameId: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.TOURNAMENT_PAIRING,
      title: 'Tournament Pairing Announced',
      message: `Round ${roundNumber}: You will play against ${opponentName} in ${tournamentName}`,
      data: { tournamentId, opponentName, roundNumber, gameId },
      linkUrl: `/games/${gameId}`,
    });
  }

  /**
   * Notify user of opponent move (when not viewing game)
   * Requirements: 18.5
   */
  async notifyOpponentMove(
    userId: string,
    gameId: string,
    opponentName: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.OPPONENT_MOVE,
      title: 'Your Turn',
      message: `${opponentName} has made a move`,
      data: { gameId, opponentName },
      linkUrl: `/games/${gameId}`,
    });
  }

  /**
   * Notify user of draw offer
   * Requirements: 18.6
   */
  async notifyDrawOffer(
    userId: string,
    gameId: string,
    opponentName: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.DRAW_OFFER,
      title: 'Draw Offer',
      message: `${opponentName} has offered a draw`,
      data: { gameId, opponentName },
      linkUrl: `/games/${gameId}`,
    });
  }

  /**
   * Notify user of game end
   * Requirements: 18.7
   */
  async notifyGameEnd(
    userId: string,
    gameId: string,
    result: string,
    reason: string,
    ratingChange?: number,
  ): Promise<Notification> {
    const resultText = result === 'win' ? 'You won!' : result === 'loss' ? 'You lost' : 'Draw';
    const ratingText = ratingChange ? ` (${ratingChange > 0 ? '+' : ''}${ratingChange})` : '';
    
    return this.create({
      userId,
      type: NotificationType.GAME_END,
      title: 'Game Ended',
      message: `${resultText} by ${reason}${ratingText}`,
      data: { gameId, result, reason, ratingChange },
      linkUrl: `/history/${gameId}`,
    });
  }

  /**
   * Notify user of tournament completion
   * Requirements: 18.8
   */
  async notifyTournamentComplete(
    userId: string,
    tournamentId: string,
    tournamentName: string,
    placement: number,
    totalPlayers: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.TOURNAMENT_COMPLETE,
      title: 'Tournament Completed',
      message: `${tournamentName} has ended. You placed ${placement} out of ${totalPlayers}`,
      data: { tournamentId, placement, totalPlayers },
      linkUrl: `/tournaments/${tournamentId}`,
    });
  }

  /**
   * Notify user of achievement unlock
   * Requirements: 18.9
   */
  async notifyAchievementUnlocked(
    userId: string,
    achievementId: string,
    achievementName: string,
    achievementDescription: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.ACHIEVEMENT_UNLOCKED,
      title: 'Achievement Unlocked!',
      message: `${achievementName}: ${achievementDescription}`,
      data: { achievementId },
      linkUrl: '/achievements',
    });
  }

  /**
   * Notify all users of announcement
   * Requirements: 18.10
   */
  async notifyAnnouncement(
    title: string,
    message: string,
    linkUrl?: string,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    const notifications = users.map(user => ({
      userId: user.id,
      type: NotificationType.ANNOUNCEMENT,
      title,
      message,
      data: {},
      linkUrl: linkUrl || null,
      isRead: false,
      createdAt: new Date(),
    }));

    // Batch create notifications
    await this.prisma.notification.createMany({
      data: notifications,
    });

    this.logger.log(`Created announcement notification for ${users.length} users`);
  }

  /**
   * Notify followers when user comes online
   * Requirements: 18.11
   */
  async notifyFriendOnline(
    userId: string,
    userName: string,
  ): Promise<void> {
    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });

    const notifications = followers.map(follow => ({
      userId: follow.followerId,
      type: NotificationType.FRIEND_ONLINE,
      title: 'Friend Online',
      message: `${userName} is now online`,
      data: { userId, userName },
      linkUrl: `/profile/${userId}`,
      isRead: false,
      createdAt: new Date(),
    }));

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({
        data: notifications,
      });

      this.logger.log(`Notified ${followers.length} followers that ${userName} is online`);
    }
  }

  /**
   * Notify user of rating change
   * Requirements: 18.12
   */
  async notifyRatingChange(
    userId: string,
    timeControl: string,
    oldRating: number,
    newRating: number,
    gameId: string,
  ): Promise<Notification> {
    const change = newRating - oldRating;
    const changeText = change > 0 ? `+${change}` : `${change}`;
    
    return this.create({
      userId,
      type: NotificationType.RATING_CHANGE,
      title: 'Rating Updated',
      message: `Your ${timeControl} rating changed: ${oldRating} → ${newRating} (${changeText})`,
      data: { timeControl, oldRating, newRating, change, gameId },
      linkUrl: `/history/${gameId}`,
    });
  }

  /**
   * Notify user of tournament reminder (5 minutes before)
   * Requirements: 18.17
   */
  async notifyTournamentReminder(
    userId: string,
    tournamentId: string,
    tournamentName: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.TOURNAMENT_REMINDER,
      title: 'Tournament Reminder',
      message: `${tournamentName} starts in 5 minutes!`,
      data: { tournamentId },
      linkUrl: `/tournaments/${tournamentId}`,
    });
  }

  /**
   * Notify user of security event
   * Requirements: 18.19
   */
  async notifySecurityEvent(
    userId: string,
    eventType: string,
    eventDescription: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SECURITY_EVENT,
      title: 'Security Alert',
      message: eventDescription,
      data: { eventType },
      linkUrl: '/profile/settings',
    });
  }
}
