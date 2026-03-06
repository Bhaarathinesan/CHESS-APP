import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/create-notification.dto';

export interface FollowResponse {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface FollowerInfo {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  rating: number | null;
  isMutual: boolean;
}

/**
 * Follows Service
 * Requirements: 31.1, 31.2, 31.7, 31.8
 * 
 * Handles follow/unfollow operations and follower/following lists
 */
@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Follow a user
   * Requirements: 31.1
   */
  async followUser(
    followerId: string,
    followingId: string,
  ): Promise<FollowResponse> {
    // Prevent self-follow
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if user to follow exists
    const userToFollow = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!userToFollow) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    // Create follow relationship
    const follow = await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    // Send notification to the followed user
    await this.notificationsService.create({
      userId: followingId,
      type: NotificationType.NEW_FOLLOWER,
      title: 'New Follower',
      message: `${(await this.prisma.user.findUnique({ where: { id: followerId } }))?.displayName} started following you`,
      data: { followerId },
      linkUrl: `/profile/${followerId}`,
    });

    return {
      id: follow.id,
      followerId: follow.followerId,
      followingId: follow.followingId,
      createdAt: follow.createdAt,
    };
  }

  /**
   * Unfollow a user
   * Requirements: 31.2
   */
  async unfollowUser(
    followerId: string,
    followingId: string,
  ): Promise<{ success: boolean }> {
    // Check if follow relationship exists
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow relationship not found');
    }

    // Delete follow relationship
    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Get list of followers for a user
   * Requirements: 31.8
   */
  async getFollowers(
    userId: string,
    currentUserId?: string,
  ): Promise<FollowerInfo[]> {
    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          include: {
            ratings: {
              where: { timeControl: 'BLITZ' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get mutual follows if currentUserId provided
    let mutualFollowIds: Set<string> = new Set();
    if (currentUserId) {
      const mutualFollows = await this.prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: follows.map((f) => f.followerId) },
        },
        select: { followingId: true },
      });
      mutualFollowIds = new Set(mutualFollows.map((f) => f.followingId));
    }

    return follows.map((follow) => ({
      id: follow.follower.id,
      username: follow.follower.username,
      displayName: follow.follower.displayName,
      avatarUrl: follow.follower.avatarUrl,
      isOnline: follow.follower.isOnline,
      rating: follow.follower.ratings[0]?.rating || null,
      isMutual: mutualFollowIds.has(follow.follower.id),
    }));
  }

  /**
   * Get list of users that a user is following
   * Requirements: 31.7
   */
  async getFollowing(
    userId: string,
    currentUserId?: string,
  ): Promise<FollowerInfo[]> {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          include: {
            ratings: {
              where: { timeControl: 'BLITZ' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get mutual follows
    let mutualFollowIds: Set<string> = new Set();
    if (currentUserId) {
      const mutualFollows = await this.prisma.follow.findMany({
        where: {
          followerId: { in: follows.map((f) => f.followingId) },
          followingId: currentUserId,
        },
        select: { followerId: true },
      });
      mutualFollowIds = new Set(mutualFollows.map((f) => f.followerId));
    }

    return follows.map((follow) => ({
      id: follow.following.id,
      username: follow.following.username,
      displayName: follow.following.displayName,
      avatarUrl: follow.following.avatarUrl,
      isOnline: follow.following.isOnline,
      rating: follow.following.ratings[0]?.rating || null,
      isMutual: mutualFollowIds.has(follow.following.id),
    }));
  }

  /**
   * Check if user A is following user B
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return !!follow;
  }

  /**
   * Get follower count for a user
   */
  async getFollowerCount(userId: string): Promise<number> {
    return this.prisma.follow.count({
      where: { followingId: userId },
    });
  }

  /**
   * Get following count for a user
   */
  async getFollowingCount(userId: string): Promise<number> {
    return this.prisma.follow.count({
      where: { followerId: userId },
    });
  }

  /**
   * Get list of followed players who are online
   * Requirements: 31.3, 31.4
   */
  async getOnlineFollowing(userId: string): Promise<FollowerInfo[]> {
    const follows = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        following: {
          isOnline: true,
        },
      },
      include: {
        following: {
          include: {
            ratings: {
              where: { timeControl: 'BLITZ' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get mutual follows
    const mutualFollows = await this.prisma.follow.findMany({
      where: {
        followerId: { in: follows.map((f) => f.followingId) },
        followingId: userId,
      },
      select: { followerId: true },
    });
    const mutualFollowIds = new Set(mutualFollows.map((f) => f.followerId));

    return follows.map((follow) => ({
      id: follow.following.id,
      username: follow.following.username,
      displayName: follow.following.displayName,
      avatarUrl: follow.following.avatarUrl,
      isOnline: follow.following.isOnline,
      rating: follow.following.ratings[0]?.rating || null,
      isMutual: mutualFollowIds.has(follow.following.id),
    }));
  }
}
