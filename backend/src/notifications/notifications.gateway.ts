import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Notification } from '@prisma/client';

/**
 * Notification Gateway for real-time notifications
 * Requirements: 18.1-18.12
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.userId;

      if (!userId) {
        this.logger.warn(`Invalid token for client ${client.id}`);
        client.disconnect();
        return;
      }

      // Store socket mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);

      // Store userId in socket data
      client.data.userId = userId;

      this.logger.log(`User ${userId} connected to notifications (socket: ${client.id})`);

      // Send unread count on connection
      const unreadCount = await this.prisma.notification.count({
        where: { userId, isRead: false },
      });

      client.emit('unread_count', { count: unreadCount });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(client.id);
      
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client ${client.id} disconnected from notifications`);
  }

  /**
   * Subscribe to notifications
   * Requirements: 18.1
   */
  @SubscribeMessage('subscribe_notifications')
  handleSubscribe(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    client.join(`user:${userId}`);
    this.logger.log(`User ${userId} subscribed to notifications`);

    return { success: true };
  }

  /**
   * Send notification to specific user
   * Requirements: 18.1
   */
  async sendNotificationToUser(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', { notification });
    this.logger.log(`Sent notification ${notification.id} to user ${userId}`);

    // Update unread count
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    this.server.to(`user:${userId}`).emit('unread_count', { count: unreadCount });
  }

  /**
   * Broadcast achievement unlocked event
   * Requirements: 18.9
   */
  async broadcastAchievementUnlocked(
    userId: string,
    achievement: {
      id: string;
      name: string;
      description: string;
      iconUrl?: string;
      points: number;
    },
  ) {
    this.server.to(`user:${userId}`).emit('achievement_unlocked', { achievement });
    this.logger.log(`Broadcast achievement ${achievement.name} to user ${userId}`);
  }

  /**
   * Broadcast friend online event
   * Requirements: 18.11
   */
  async broadcastFriendOnline(followerIds: string[], user: { id: string; username: string }) {
    for (const followerId of followerIds) {
      this.server.to(`user:${followerId}`).emit('friend_online', {
        userId: user.id,
        userName: user.username,
      });
    }

    this.logger.log(`Broadcast friend online for ${user.username} to ${followerIds.length} followers`);
  }

  /**
   * Broadcast challenge received event
   * Requirements: 18.1
   */
  async broadcastChallengeReceived(
    userId: string,
    challenge: {
      challengeId: string;
      challenger: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
      };
      timeControl: string;
    },
  ) {
    this.server.to(`user:${userId}`).emit('challenge_received', challenge);
    this.logger.log(`Broadcast challenge from ${challenge.challenger.username} to user ${userId}`);
  }

  /**
   * Broadcast tournament starting event
   * Requirements: 18.2
   */
  async broadcastTournamentStarting(
    userIds: string[],
    tournament: {
      id: string;
      name: string;
      minutesUntilStart: number;
    },
  ) {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit('tournament_starting', tournament);
    }

    this.logger.log(`Broadcast tournament starting for ${tournament.name} to ${userIds.length} users`);
  }

  /**
   * Broadcast game end event
   * Requirements: 18.7
   */
  async broadcastGameEnd(
    userId: string,
    gameResult: {
      gameId: string;
      result: string;
      reason: string;
      ratingChange?: number;
    },
  ) {
    this.server.to(`user:${userId}`).emit('game_ended', gameResult);
    this.logger.log(`Broadcast game end to user ${userId}`);
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Get connected user count
   */
  getConnectedUserCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get socket count for user
   */
  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}
