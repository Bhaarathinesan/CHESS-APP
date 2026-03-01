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
import { ChatService } from '../chat/chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
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
          avatarUrl: true,
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

      this.logger.log(
        `Client connected to /chat: ${client.id} (user: ${user.username})`,
      );
    } catch (error) {
      this.logger.error(`Connection authentication failed: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = client.data.user?.id;
    if (userId) {
      this.logger.log(
        `Client disconnected from /chat: ${client.id} (user: ${userId})`,
      );
    } else {
      this.logger.log(`Client disconnected from /chat: ${client.id}`);
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

  /**
   * Handle send_message event
   * Requirements: 19.1, 19.2, 19.6, 19.10
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; message: string },
  ) {
    const userId = client.data.user?.id;
    const { gameId, message } = data;

    try {
      // Validate that user is part of the game
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          whitePlayerId: true,
          blackPlayerId: true,
          status: true,
        },
      });

      if (!game) {
        client.emit('chat_error', { message: 'Game not found' });
        return { event: 'chat_error', data: { message: 'Game not found' } };
      }

      if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
        client.emit('chat_error', {
          message: 'You are not a player in this game',
        });
        return {
          event: 'chat_error',
          data: { message: 'You are not a player in this game' },
        };
      }

      // Create message via ChatService (validates length, rate limit, profanity, etc.)
      // Requirements: 19.6 (profanity filter), 19.10 (rate limit), 19.4, 19.5 (chat disable)
      const chatMessage = await this.chatService.createMessage(
        gameId,
        userId,
        message,
      );

      // Broadcast message to game room (Requirements: 19.1, 19.8)
      this.server.to(`game:${gameId}`).emit('message_received', {
        id: chatMessage.id,
        gameId: chatMessage.gameId,
        sender: {
          id: chatMessage.sender.id,
          username: chatMessage.sender.username,
          displayName: chatMessage.sender.displayName,
          avatarUrl: chatMessage.sender.avatarUrl,
        },
        message: chatMessage.message,
        createdAt: chatMessage.createdAt,
      });

      this.logger.log(
        `Message sent in game ${gameId} by user ${userId}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
      );

      return {
        event: 'message_sent',
        data: { success: true, messageId: chatMessage.id },
      };
    } catch (error) {
      this.logger.error(
        `Failed to send message for user ${userId} in game ${gameId}: ${error.message}`,
      );
      client.emit('chat_error', {
        message: error.message || 'Failed to send message',
      });
      return {
        event: 'chat_error',
        data: { message: error.message },
      };
    }
  }

  /**
   * Handle typing_start event
   * Requirements: 19.2
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const userId = client.data.user?.id;
    const { gameId } = data;

    try {
      // Validate that user is part of the game
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: {
          whitePlayerId: true,
          blackPlayerId: true,
        },
      });

      if (!game) {
        return;
      }

      if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
        return;
      }

      // Broadcast typing indicator to game room (Requirements: 19.2, 19.8)
      client.to(`game:${gameId}`).emit('user_typing', {
        gameId,
        userId,
        username: client.data.user.username,
      });

      this.logger.debug(`User ${userId} started typing in game ${gameId}`);

      return { event: 'typing_started', data: { success: true } };
    } catch (error) {
      this.logger.error(
        `Failed to handle typing_start for user ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Handle typing_stop event
   * Requirements: 19.2
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const userId = client.data.user?.id;
    const { gameId } = data;

    try {
      // Validate that user is part of the game
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: {
          whitePlayerId: true,
          blackPlayerId: true,
        },
      });

      if (!game) {
        return;
      }

      if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
        return;
      }

      // Broadcast typing stopped to game room (Requirements: 19.2, 19.8)
      client.to(`game:${gameId}`).emit('user_stopped_typing', {
        gameId,
        userId,
      });

      this.logger.debug(`User ${userId} stopped typing in game ${gameId}`);

      return { event: 'typing_stopped', data: { success: true } };
    } catch (error) {
      this.logger.error(
        `Failed to handle typing_stop for user ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Join a game room for chat
   * Called when a player joins a game
   */
  async joinGameRoom(client: Socket, gameId: string) {
    await client.join(`game:${gameId}`);
    this.logger.log(
      `Client ${client.id} joined chat room for game ${gameId}`,
    );
  }

  /**
   * Leave a game room
   * Called when a player leaves a game
   */
  async leaveGameRoom(client: Socket, gameId: string) {
    await client.leave(`game:${gameId}`);
    this.logger.log(
      `Client ${client.id} left chat room for game ${gameId}`,
    );
  }

  /**
   * Handle report_message event
   * Requirement 19.7: Report inappropriate chat messages
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('report_message')
  async handleReportMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; reason: string },
  ) {
    const userId = client.data.user?.id;
    const { messageId, reason } = data;

    try {
      const report = await this.chatService.reportMessage(
        messageId,
        userId,
        reason,
      );

      this.logger.log(
        `User ${userId} reported message ${messageId}: ${reason}`,
      );

      return {
        event: 'message_reported',
        data: { success: true, reportId: report.id },
      };
    } catch (error) {
      this.logger.error(
        `Failed to report message ${messageId} by user ${userId}: ${error.message}`,
      );
      client.emit('chat_error', {
        message: error.message || 'Failed to report message',
      });
      return {
        event: 'chat_error',
        data: { message: error.message },
      };
    }
  }

  /**
   * Handle toggle_game_chat event
   * Requirement 19.4: Disable chat for specific game
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('toggle_game_chat')
  async handleToggleGameChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; enabled: boolean },
  ) {
    const userId = client.data.user?.id;
    const { gameId, enabled } = data;

    try {
      const result = await this.chatService.toggleGameChat(
        userId,
        gameId,
        enabled,
      );

      this.logger.log(
        `User ${userId} ${enabled ? 'enabled' : 'disabled'} chat for game ${gameId}`,
      );

      return {
        event: 'game_chat_toggled',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to toggle game chat for user ${userId}: ${error.message}`,
      );
      client.emit('chat_error', {
        message: error.message || 'Failed to toggle chat',
      });
      return {
        event: 'chat_error',
        data: { message: error.message },
      };
    }
  }

  /**
   * Handle get_rate_limit_info event
   * Requirement 19.10: Get rate limit information
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get_rate_limit_info')
  async handleGetRateLimitInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const userId = client.data.user?.id;
    const { gameId } = data;

    try {
      const info = await this.chatService.getRateLimitInfo(userId, gameId);

      return {
        event: 'rate_limit_info',
        data: info,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get rate limit info for user ${userId}: ${error.message}`,
      );
      return {
        event: 'chat_error',
        data: { message: error.message },
      };
    }
  }
}
