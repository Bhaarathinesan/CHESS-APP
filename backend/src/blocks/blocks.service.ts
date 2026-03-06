import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BlockResponse {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

export interface BlockedUserInfo {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Blocks Service
 * Requirements: 31.9, 31.10
 * 
 * Handles block/unblock operations and blocked user lists
 */
@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Block a user
   * Requirements: 31.9
   */
  async blockUser(
    blockerId: string,
    blockedId: string,
  ): Promise<BlockResponse> {
    // Prevent self-block
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check if user to block exists
    const userToBlock = await this.prisma.user.findUnique({
      where: { id: blockedId },
    });

    if (!userToBlock) {
      throw new NotFoundException('User not found');
    }

    // Check if already blocked
    const existingBlock = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (existingBlock) {
      throw new ConflictException('User is already blocked');
    }

    // Create block relationship
    const block = await this.prisma.block.create({
      data: {
        blockerId,
        blockedId,
      },
    });

    // Remove follow relationships if they exist
    await this.prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    });

    return {
      id: block.id,
      blockerId: block.blockerId,
      blockedId: block.blockedId,
      createdAt: block.createdAt,
    };
  }

  /**
   * Unblock a user
   * Requirements: 31.9
   */
  async unblockUser(
    blockerId: string,
    blockedId: string,
  ): Promise<{ success: boolean }> {
    // Check if block relationship exists
    const block = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (!block) {
      throw new NotFoundException('Block relationship not found');
    }

    // Delete block relationship
    await this.prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(blockerId: string): Promise<BlockedUserInfo[]> {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return blocks.map((block) => ({
      id: block.blocked.id,
      username: block.blocked.username,
      displayName: block.blocked.displayName,
      avatarUrl: block.blocked.avatarUrl,
    }));
  }

  /**
   * Check if user A has blocked user B
   * Requirements: 31.10
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    return !!block;
  }

  /**
   * Check if there's any block relationship between two users (either direction)
   * Requirements: 31.10
   */
  async hasBlockRelationship(
    userId1: string,
    userId2: string,
  ): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 },
        ],
      },
    });

    return !!block;
  }
}
