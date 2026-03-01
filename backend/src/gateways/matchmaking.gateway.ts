import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TimeControl } from '@prisma/client';

@WebSocketGateway({
  namespace: '/matchmaking',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class MatchmakingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MatchmakingGateway.name);
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private queueUpdateInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      // Extract and verify JWT token
      const token = this.extractTokenFromHandshake(client);
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided (${client.id})`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('auth.jwt.secret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          username: true,
          displayName: true,
          isBanned: true,
        },
      });

      if (!user || user.isBanned) {
        this.logger.warn(`Connection rejected: Invalid user (${client.id})`);
        client.emit('error', { message: 'Authentication failed' });
        client.disconnect();
        return;
      }

      client.data.user = user;
      this.userSockets.set(user.id, client.id);

      this.logger.log(
        `Client connected to /matchmaking: ${client.id} (user: ${user.username})`,
      );

      // Start queue update broadcasting if not already running
      if (!this.queueUpdateInterval) {
        this.startQueueUpdateBroadcasting();
      }
    } catch (error) {
      this.logger.error(`Connection authentication failed: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = client.data.user?.id;
    if (userId) {
      this.userSockets.delete(userId);
      this.logger.log(
        `Client disconnected from /matchmaking: ${client.id} (user: ${userId})`,
      );
    } else {
      this.logger.log(`Client disconnected from /matchmaking: ${client.id}`);
    }

    // Stop broadcasting if no clients connected
    if (this.userSockets.size === 0 && this.queueUpdateInterval) {
      clearInterval(this.queueUpdateInterval);
      this.queueUpdateInterval = null;
      this.logger.log('Stopped queue update broadcasting (no clients connected)');
    }
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (token && typeof token === 'string') {
      return token;
    }
    return null;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { timeControl: TimeControl; ratingRange?: number },
  ) {
    const userId = client.data.user?.id;
    const { timeControl, ratingRange = 200 } = data;

    try {
      // Join the queue via matchmaking service
      const status = await this.matchmakingService.joinQueue(
        userId,
        timeControl,
        ratingRange,
      );

      this.logger.log(
        `User ${userId} joined ${timeControl} queue (position: ${status.position}, queue size: ${status.queueSize})`,
      );

      // Send confirmation to the client
      client.emit('queue_joined', {
        timeControl,
        position: status.position,
        queueSize: status.queueSize,
        waitTimeSeconds: status.waitTimeSeconds,
      });

      return {
        event: 'queue_joined',
        data: {
          timeControl,
          position: status.position,
          queueSize: status.queueSize,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to join queue for user ${userId}: ${error.message}`,
      );
      client.emit('queue_error', {
        message: error.message || 'Failed to join queue',
      });
      return {
        event: 'queue_error',
        data: { message: error.message },
      };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_queue')
  async handleLeaveQueue(@ConnectedSocket() client: Socket) {
    const userId = client.data.user?.id;

    try {
      const success = await this.matchmakingService.leaveQueue(userId);

      if (success) {
        this.logger.log(`User ${userId} left matchmaking queue`);
        client.emit('queue_left', { success: true });
        return { event: 'queue_left', data: { success: true } };
      } else {
        client.emit('queue_error', { message: 'Not in queue' });
        return { event: 'queue_error', data: { message: 'Not in queue' } };
      }
    } catch (error) {
      this.logger.error(
        `Failed to leave queue for user ${userId}: ${error.message}`,
      );
      client.emit('queue_error', { message: 'Failed to leave queue' });
      return {
        event: 'queue_error',
        data: { message: error.message },
      };
    }
  }

  /**
   * Broadcast queue position updates to all users in queues
   * Runs every 5 seconds to keep clients updated
   */
  private startQueueUpdateBroadcasting() {
    this.queueUpdateInterval = setInterval(async () => {
      try {
        await this.broadcastQueueUpdates();
      } catch (error) {
        this.logger.error(
          `Error broadcasting queue updates: ${error.message}`,
        );
      }
    }, 5000); // Update every 5 seconds

    this.logger.log('Started queue update broadcasting');
  }

  private async broadcastQueueUpdates() {
    const timeControls = [
      TimeControl.BULLET,
      TimeControl.BLITZ,
      TimeControl.RAPID,
      TimeControl.CLASSICAL,
    ];

    for (const timeControl of timeControls) {
      const entries = await this.matchmakingService.getQueueEntries(
        timeControl,
      );

      // Send position updates to each user in this queue
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const socketId = this.userSockets.get(entry.userId);

        if (socketId) {
          const waitTimeSeconds = Math.floor(
            (Date.now() - entry.joinedAt) / 1000,
          );

          this.server.to(socketId).emit('queue_update', {
            timeControl,
            position: i + 1,
            queueSize: entries.length,
            waitTimeSeconds,
          });
        }
      }
    }
  }

  /**
   * Notify players when a match is found
   * Called by matchmaking service when a game is created
   */
  async notifyMatchFound(
    player1Id: string,
    player2Id: string,
    gameId: string,
    timeControl: TimeControl,
    whitePlayerId: string,
    blackPlayerId: string,
  ) {
    try {
      // Fetch player details
      const [player1, player2] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: player1Id },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        }),
        this.prisma.user.findUnique({
          where: { id: player2Id },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        }),
      ]);

      // Fetch ratings
      const [rating1, rating2] = await Promise.all([
        this.prisma.rating.findUnique({
          where: { userId_timeControl: { userId: player1Id, timeControl } },
          select: { rating: true },
        }),
        this.prisma.rating.findUnique({
          where: { userId_timeControl: { userId: player2Id, timeControl } },
          select: { rating: true },
        }),
      ]);

      // Get time control settings
      const { initialTimeMinutes, incrementSeconds } =
        this.getTimeControlSettings(timeControl);

      // Notify player 1
      const socket1 = this.userSockets.get(player1Id);
      if (socket1) {
        this.server.to(socket1).emit('match_found', {
          gameId,
          opponent: {
            id: player2!.id,
            username: player2!.username,
            displayName: player2!.displayName,
            avatarUrl: player2!.avatarUrl,
            rating: rating2?.rating || 1200,
          },
          color: whitePlayerId === player1Id ? 'white' : 'black',
          timeControl,
          initialTimeMinutes,
          incrementSeconds,
        });
      }

      // Notify player 2
      const socket2 = this.userSockets.get(player2Id);
      if (socket2) {
        this.server.to(socket2).emit('match_found', {
          gameId,
          opponent: {
            id: player1!.id,
            username: player1!.username,
            displayName: player1!.displayName,
            avatarUrl: player1!.avatarUrl,
            rating: rating1?.rating || 1200,
          },
          color: whitePlayerId === player2Id ? 'white' : 'black',
          timeControl,
          initialTimeMinutes,
          incrementSeconds,
        });
      }

      this.logger.log(
        `Notified players ${player1Id} and ${player2Id} of match ${gameId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify players of match: ${error.message}`,
      );
    }
  }

  /**
   * Notify receiver when a challenge is received
   * Requirements: 7.5
   */
  async notifyChallengeReceived(challenge: any) {
    try {
      const sender = await this.prisma.user.findUnique({
        where: { id: challenge.senderId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      const rating = await this.prisma.rating.findUnique({
        where: {
          userId_timeControl: {
            userId: challenge.senderId,
            timeControl: challenge.timeControl,
          },
        },
        select: { rating: true },
      });

      const socketId = this.userSockets.get(challenge.receiverId);
      if (socketId) {
        this.server.to(socketId).emit('challenge_received', {
          challengeId: challenge.id,
          sender: {
            id: sender!.id,
            username: sender!.username,
            displayName: sender!.displayName,
            avatarUrl: sender!.avatarUrl,
            rating: rating?.rating || 1200,
          },
          timeControl: challenge.timeControl,
          initialTimeMinutes: challenge.initialTimeMinutes,
          incrementSeconds: challenge.incrementSeconds,
          isRated: challenge.isRated,
          expiresAt: challenge.expiresAt,
        });

        this.logger.log(
          `Notified ${challenge.receiverId} of challenge from ${challenge.senderId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify challenge received: ${error.message}`,
      );
    }
  }

  /**
   * Notify sender when challenge is accepted
   * Requirements: 7.6
   */
  async notifyChallengeAccepted(challenge: any, gameId: string) {
    try {
      const receiver = await this.prisma.user.findUnique({
        where: { id: challenge.receiverId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      const socketId = this.userSockets.get(challenge.senderId);
      if (socketId) {
        this.server.to(socketId).emit('challenge_accepted', {
          challengeId: challenge.id,
          gameId,
          receiver: {
            id: receiver!.id,
            username: receiver!.username,
            displayName: receiver!.displayName,
            avatarUrl: receiver!.avatarUrl,
          },
        });

        this.logger.log(
          `Notified ${challenge.senderId} that challenge was accepted`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify challenge accepted: ${error.message}`,
      );
    }
  }

  /**
   * Notify sender when challenge is declined
   * Requirements: 7.6
   */
  async notifyChallengeDeclined(challenge: any) {
    try {
      const receiver = await this.prisma.user.findUnique({
        where: { id: challenge.receiverId },
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      });

      const socketId = this.userSockets.get(challenge.senderId);
      if (socketId) {
        this.server.to(socketId).emit('challenge_declined', {
          challengeId: challenge.id,
          receiver: {
            id: receiver!.id,
            username: receiver!.username,
            displayName: receiver!.displayName,
          },
        });

        this.logger.log(
          `Notified ${challenge.senderId} that challenge was declined`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify challenge declined: ${error.message}`,
      );
    }
  }

  /**
   * Notify both users when challenge expires
   * Requirements: 7.7
   */
  async notifyChallengeExpired(challenge: any) {
    try {
      const senderSocketId = this.userSockets.get(challenge.senderId);
      if (senderSocketId) {
        this.server.to(senderSocketId).emit('challenge_expired', {
          challengeId: challenge.id,
        });
      }

      const receiverSocketId = this.userSockets.get(challenge.receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('challenge_expired', {
          challengeId: challenge.id,
        });
      }

      this.logger.log(`Challenge ${challenge.id} expired`);
    } catch (error) {
      this.logger.error(
        `Failed to notify challenge expired: ${error.message}`,
      );
    }
  }

  /**
   * Notify receiver when a rematch is offered
   * Requirements: 7.8
   */
  async notifyRematchOffered(rematchOffer: any) {
    try {
      const sender = await this.prisma.user.findUnique({
        where: { id: rematchOffer.senderId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      const rating = await this.prisma.rating.findUnique({
        where: {
          userId_timeControl: {
            userId: rematchOffer.senderId,
            timeControl: rematchOffer.timeControl,
          },
        },
        select: { rating: true },
      });

      const socketId = this.userSockets.get(rematchOffer.receiverId);
      if (socketId) {
        this.server.to(socketId).emit('rematch_offered', {
          rematchId: rematchOffer.id,
          gameId: rematchOffer.gameId,
          sender: {
            id: sender!.id,
            username: sender!.username,
            displayName: sender!.displayName,
            avatarUrl: sender!.avatarUrl,
            rating: rating?.rating || 1200,
          },
          timeControl: rematchOffer.timeControl,
          initialTimeMinutes: rematchOffer.initialTimeMinutes,
          incrementSeconds: rematchOffer.incrementSeconds,
          isRated: rematchOffer.isRated,
          expiresAt: rematchOffer.expiresAt,
        });

        this.logger.log(
          `Notified ${rematchOffer.receiverId} of rematch offer from ${rematchOffer.senderId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify rematch offered: ${error.message}`,
      );
    }
  }

  /**
   * Notify sender when rematch is accepted
   * Requirements: 7.8
   */
  async notifyRematchAccepted(rematchOffer: any, gameId: string) {
    try {
      const receiver = await this.prisma.user.findUnique({
        where: { id: rematchOffer.receiverId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      const socketId = this.userSockets.get(rematchOffer.senderId);
      if (socketId) {
        this.server.to(socketId).emit('rematch_accepted', {
          rematchId: rematchOffer.id,
          gameId,
          receiver: {
            id: receiver!.id,
            username: receiver!.username,
            displayName: receiver!.displayName,
            avatarUrl: receiver!.avatarUrl,
          },
        });

        this.logger.log(
          `Notified ${rematchOffer.senderId} that rematch was accepted`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify rematch accepted: ${error.message}`,
      );
    }
  }

  /**
   * Notify sender when rematch is declined
   * Requirements: 7.8
   */
  async notifyRematchDeclined(rematchOffer: any) {
    try {
      const receiver = await this.prisma.user.findUnique({
        where: { id: rematchOffer.receiverId },
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      });

      const socketId = this.userSockets.get(rematchOffer.senderId);
      if (socketId) {
        this.server.to(socketId).emit('rematch_declined', {
          rematchId: rematchOffer.id,
          receiver: {
            id: receiver!.id,
            username: receiver!.username,
            displayName: receiver!.displayName,
          },
        });

        this.logger.log(
          `Notified ${rematchOffer.senderId} that rematch was declined`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify rematch declined: ${error.message}`,
      );
    }
  }

  private getTimeControlSettings(timeControl: TimeControl): {
    initialTimeMinutes: number;
    incrementSeconds: number;
  } {
    switch (timeControl) {
      case TimeControl.BULLET:
        return { initialTimeMinutes: 1, incrementSeconds: 0 };
      case TimeControl.BLITZ:
        return { initialTimeMinutes: 3, incrementSeconds: 2 };
      case TimeControl.RAPID:
        return { initialTimeMinutes: 10, incrementSeconds: 0 };
      case TimeControl.CLASSICAL:
        return { initialTimeMinutes: 30, incrementSeconds: 0 };
      default:
        return { initialTimeMinutes: 5, incrementSeconds: 0 };
    }
  }
}
