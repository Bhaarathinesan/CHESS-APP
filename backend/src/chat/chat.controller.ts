import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

/**
 * ChatController
 * REST API endpoints for chat settings and moderation
 */
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get chat messages for a game
   * GET /api/chat/:gameId/messages
   */
  @Get(':gameId/messages')
  async getMessages(
    @Param('gameId') gameId: string,
    @Request() req: any,
  ) {
    return this.chatService.getMessages(gameId);
  }

  /**
   * Report a chat message
   * POST /api/chat/report
   * Requirement 19.7: Report inappropriate chat messages
   */
  @Post('report')
  @HttpCode(HttpStatus.CREATED)
  async reportMessage(
    @Body() body: { messageId: string; reason: string },
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.chatService.reportMessage(body.messageId, userId, body.reason);
  }

  /**
   * Toggle chat for a specific game
   * POST /api/chat/toggle-game
   * Requirement 19.4: Disable chat for specific game
   */
  @Post('toggle-game')
  @HttpCode(HttpStatus.OK)
  async toggleGameChat(
    @Body() body: { gameId: string; enabled: boolean },
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.chatService.toggleGameChat(userId, body.gameId, body.enabled);
  }

  /**
   * Toggle chat globally
   * POST /api/chat/toggle-global
   * Requirement 19.5: Disable chat globally in settings
   */
  @Post('toggle-global')
  @HttpCode(HttpStatus.OK)
  async toggleGlobalChat(
    @Body() body: { enabled: boolean },
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.chatService.toggleGlobalChat(userId, body.enabled);
  }

  /**
   * Check if chat is enabled for a game
   * GET /api/chat/:gameId/enabled
   */
  @Get(':gameId/enabled')
  async isChatEnabled(
    @Param('gameId') gameId: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    const enabled = await this.chatService.isChatEnabled(userId, gameId);
    return { enabled };
  }

  /**
   * Get rate limit info
   * GET /api/chat/:gameId/rate-limit
   * Requirement 19.10: Rate limit information
   */
  @Get(':gameId/rate-limit')
  async getRateLimitInfo(
    @Param('gameId') gameId: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.chatService.getRateLimitInfo(userId, gameId);
  }
}
