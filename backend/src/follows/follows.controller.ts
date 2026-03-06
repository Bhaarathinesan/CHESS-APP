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
import { FollowsService, FollowResponse, FollowerInfo } from './follows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Follows Controller
 * Requirements: 31.1, 31.2, 31.7, 31.8
 * 
 * Handles HTTP endpoints for follow/unfollow operations
 */
@Controller('follows')
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  /**
   * Follow a user
   * POST /api/follows/:userId
   * Requirements: 31.1
   */
  @Post(':userId')
  @HttpCode(HttpStatus.CREATED)
  async followUser(
    @CurrentUser('sub') currentUserId: string,
    @Param('userId') userId: string,
  ): Promise<FollowResponse> {
    return this.followsService.followUser(currentUserId, userId);
  }

  /**
   * Unfollow a user
   * DELETE /api/follows/:userId
   * Requirements: 31.2
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async unfollowUser(
    @CurrentUser('sub') currentUserId: string,
    @Param('userId') userId: string,
  ): Promise<{ success: boolean }> {
    return this.followsService.unfollowUser(currentUserId, userId);
  }

  /**
   * Get list of followers
   * GET /api/follows/followers
   * Requirements: 31.8
   */
  @Get('followers')
  async getFollowers(
    @CurrentUser('sub') currentUserId: string,
  ): Promise<FollowerInfo[]> {
    return this.followsService.getFollowers(currentUserId, currentUserId);
  }

  /**
   * Get list of users being followed
   * GET /api/follows/following
   * Requirements: 31.7
   */
  @Get('following')
  async getFollowing(
    @CurrentUser('sub') currentUserId: string,
  ): Promise<FollowerInfo[]> {
    return this.followsService.getFollowing(currentUserId, currentUserId);
  }

  /**
   * Get list of online followed players
   * GET /api/follows/online
   * Requirements: 31.3, 31.4
   */
  @Get('online')
  async getOnlineFollowing(
    @CurrentUser('sub') currentUserId: string,
  ): Promise<FollowerInfo[]> {
    return this.followsService.getOnlineFollowing(currentUserId);
  }

  /**
   * Get follower count for a user
   * GET /api/follows/:userId/followers/count
   */
  @Get(':userId/followers/count')
  async getFollowerCount(
    @Param('userId') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.followsService.getFollowerCount(userId);
    return { count };
  }

  /**
   * Get following count for a user
   * GET /api/follows/:userId/following/count
   */
  @Get(':userId/following/count')
  async getFollowingCount(
    @Param('userId') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.followsService.getFollowingCount(userId);
    return { count };
  }

  /**
   * Check if current user is following another user
   * GET /api/follows/:userId/status
   */
  @Get(':userId/status')
  async getFollowStatus(
    @CurrentUser('sub') currentUserId: string,
    @Param('userId') userId: string,
  ): Promise<{ isFollowing: boolean }> {
    const isFollowing = await this.followsService.isFollowing(
      currentUserId,
      userId,
    );
    return { isFollowing };
  }
}
