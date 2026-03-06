import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BlocksService, BlockResponse, BlockedUserInfo } from './blocks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Blocks Controller
 * Requirements: 31.9, 31.10
 * 
 * Handles HTTP endpoints for block/unblock operations
 */
@Controller('blocks')
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  /**
   * Block a user
   * POST /api/blocks/:userId
   * Requirements: 31.9
   */
  @Post(':userId')
  @HttpCode(HttpStatus.CREATED)
  async blockUser(
    @CurrentUser('sub') currentUserId: string,
    @Param('userId') userId: string,
  ): Promise<BlockResponse> {
    return this.blocksService.blockUser(currentUserId, userId);
  }

  /**
   * Unblock a user
   * DELETE /api/blocks/:userId
   * Requirements: 31.9
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async unblockUser(
    @CurrentUser('sub') currentUserId: string,
    @Param('userId') userId: string,
  ): Promise<{ success: boolean }> {
    return this.blocksService.unblockUser(currentUserId, userId);
  }

  /**
   * Get list of blocked users
   * GET /api/blocks
   */
  @Get()
  async getBlockedUsers(
    @CurrentUser('sub') currentUserId: string,
  ): Promise<BlockedUserInfo[]> {
    return this.blocksService.getBlockedUsers(currentUserId);
  }

  /**
   * Check if a user is blocked
   * GET /api/blocks/:userId/status
   */
  @Get(':userId/status')
  async getBlockStatus(
    @CurrentUser('sub') currentUserId: string,
    @Param('userId') userId: string,
  ): Promise<{ isBlocked: boolean }> {
    const isBlocked = await this.blocksService.isBlocked(currentUserId, userId);
    return { isBlocked };
  }
}
