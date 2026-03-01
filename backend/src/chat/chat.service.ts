import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfanityFilterService } from './profanity-filter.service';
import { ChatRateLimiterService } from './chat-rate-limiter.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private profanityFilter: ProfanityFilterService,
    private rateLimiter: ChatRateLimiterService,
  ) {}

  /**
   * Create a new chat message with moderation
   * @param gameId - The game ID
   * @param senderId - The user ID of the sender
   * @param content - The message content (max 200 characters)
   * @returns The created chat message
   */
  async createMessage(gameId: string, senderId: string, content: string) {
    // Validate message length (Requirement 19.9)
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty');
    }

    if (content.length > 200) {
      throw new BadRequestException('Message cannot exceed 200 characters');
    }

    // Check if user has chat enabled globally (Requirement 19.5)
    const user = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { chatEnabled: true, chatDisabledGames: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.chatEnabled) {
      throw new ForbiddenException('Chat is disabled in your settings');
    }

    // Check if user has chat disabled for this specific game (Requirement 19.4)
    if (user.chatDisabledGames && user.chatDisabledGames.includes(gameId)) {
      throw new ForbiddenException('Chat is disabled for this game');
    }

    // Check rate limit (Requirement 19.10)
    const canSend = await this.rateLimiter.canSendMessage(senderId, gameId);
    if (!canSend) {
      const resetTime = await this.rateLimiter.getResetTime(senderId, gameId);
      const resetSeconds = Math.ceil(resetTime / 1000);
      throw new ForbiddenException(
        `Rate limit exceeded. You can send more messages in ${resetSeconds} seconds.`,
      );
    }

    // Filter profanity (Requirement 19.6)
    const filteredContent = this.profanityFilter.filterProfanity(content.trim());

    // Create the message
    return this.prisma.chatMessage.create({
      data: {
        gameId,
        senderId,
        message: filteredContent,
        isSpectator: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Get messages for a game
   * @param gameId - The game ID
   * @param limit - Optional limit on number of messages (default 50)
   * @returns Array of chat messages ordered by timestamp (oldest first)
   */
  async getMessages(gameId: string, limit: number = 50) {
    return this.prisma.chatMessage.findMany({
      where: {
        gameId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });
  }

  /**
   * Report a chat message (Requirement 19.7)
   * @param messageId - The message ID to report
   * @param reporterId - The user ID of the reporter
   * @param reason - The reason for reporting
   * @returns The created report
   */
  async reportMessage(messageId: string, reporterId: string, reason: string) {
    // Validate message exists
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, gameId: true },
    });

    if (!message) {
      throw new BadRequestException('Message not found');
    }

    // Prevent self-reporting
    if (message.senderId === reporterId) {
      throw new BadRequestException('You cannot report your own messages');
    }

    // Check if already reported by this user
    const existingReport = await this.prisma.chatReport.findFirst({
      where: {
        messageId,
        reporterId,
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this message');
    }

    // Create report
    return this.prisma.chatReport.create({
      data: {
        messageId,
        reporterId,
        reason: reason.trim(),
        status: 'pending',
      },
    });
  }

  /**
   * Toggle chat for a specific game (Requirement 19.4)
   * @param userId - The user ID
   * @param gameId - The game ID
   * @param enabled - Whether to enable or disable chat
   */
  async toggleGameChat(userId: string, gameId: string, enabled: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { chatDisabledGames: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    let disabledGames = user.chatDisabledGames || [];

    if (enabled) {
      // Remove from disabled list
      disabledGames = disabledGames.filter((id) => id !== gameId);
    } else {
      // Add to disabled list if not already there
      if (!disabledGames.includes(gameId)) {
        disabledGames.push(gameId);
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { chatDisabledGames: disabledGames },
    });

    return { success: true, enabled };
  }

  /**
   * Toggle chat globally (Requirement 19.5)
   * @param userId - The user ID
   * @param enabled - Whether to enable or disable chat globally
   */
  async toggleGlobalChat(userId: string, enabled: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { chatEnabled: enabled },
    });

    return { success: true, enabled };
  }

  /**
   * Check if chat is enabled for a user in a specific game
   * @param userId - The user ID
   * @param gameId - The game ID
   * @returns true if chat is enabled
   */
  async isChatEnabled(userId: string, gameId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { chatEnabled: true, chatDisabledGames: true },
    });

    if (!user) {
      return false;
    }

    // Check global setting
    if (!user.chatEnabled) {
      return false;
    }

    // Check game-specific setting
    if (user.chatDisabledGames && user.chatDisabledGames.includes(gameId)) {
      return false;
    }

    return true;
  }

  /**
   * Get rate limit info for a user
   * @param userId - The user ID
   * @param gameId - The game ID
   * @returns Rate limit information
   */
  async getRateLimitInfo(userId: string, gameId: string) {
    const remaining = await this.rateLimiter.getRemainingMessages(
      userId,
      gameId,
    );
    const resetTime = await this.rateLimiter.getResetTime(userId, gameId);

    return {
      maxMessages: 5,
      remaining,
      resetInMs: resetTime,
      resetInSeconds: Math.ceil(resetTime / 1000),
    };
  }
}
