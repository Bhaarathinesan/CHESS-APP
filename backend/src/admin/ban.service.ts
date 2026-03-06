import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BanType } from '@prisma/client';

export interface IssueBanDto {
  userId: string;
  banType: BanType;
  reason: string;
  expiresAt?: Date;
  issuedBy: string;
}

export interface RevokeBanDto {
  banId: string;
  revokedBy: string;
  revokeReason: string;
}

@Injectable()
export class BanService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Issue a warning to a user
   * Requirements: 24.16
   */
  async issueWarning(
    userId: string,
    reason: string,
    issuedBy: string,
  ): Promise<any> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create warning record
    const warning = await this.prisma.userBan.create({
      data: {
        userId,
        banType: BanType.WARNING,
        reason,
        issuedBy,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
        issuer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    return warning;
  }

  /**
   * Issue a temporary ban to a user
   * Requirements: 24.16
   */
  async issueTemporaryBan(
    userId: string,
    reason: string,
    expiresAt: Date,
    issuedBy: string,
  ): Promise<any> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate expiration date
    if (expiresAt <= new Date()) {
      throw new BadRequestException('Expiration date must be in the future');
    }

    // Create ban record
    const ban = await this.prisma.userBan.create({
      data: {
        userId,
        banType: BanType.TEMPORARY,
        reason,
        expiresAt,
        issuedBy,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
        issuer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // Update user ban status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason,
        banExpires: expiresAt,
      },
    });

    return ban;
  }

  /**
   * Issue a permanent ban to a user
   * Requirements: 24.16
   */
  async issuePermanentBan(
    userId: string,
    reason: string,
    issuedBy: string,
  ): Promise<any> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create ban record
    const ban = await this.prisma.userBan.create({
      data: {
        userId,
        banType: BanType.PERMANENT,
        reason,
        issuedBy,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
        issuer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // Update user ban status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason,
        banExpires: null, // Permanent ban has no expiration
      },
    });

    return ban;
  }

  /**
   * Revoke a ban (unban a user)
   * Requirements: 24.16
   */
  async revokeBan(
    banId: string,
    revokedBy: string,
    revokeReason: string,
  ): Promise<any> {
    // Find the ban
    const ban = await this.prisma.userBan.findUnique({
      where: { id: banId },
      include: {
        user: true,
      },
    });

    if (!ban) {
      throw new NotFoundException('Ban not found');
    }

    if (!ban.isActive) {
      throw new BadRequestException('Ban is already revoked');
    }

    // Update ban record
    const updatedBan = await this.prisma.userBan.update({
      where: { id: banId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
        revokeReason,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
        issuer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        revoker: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // Check if user has any other active bans
    const activeBans = await this.prisma.userBan.findMany({
      where: {
        userId: ban.userId,
        isActive: true,
        banType: {
          in: [BanType.TEMPORARY, BanType.PERMANENT],
        },
      },
    });

    // If no active bans, unban the user
    if (activeBans.length === 0) {
      await this.prisma.user.update({
        where: { id: ban.userId },
        data: {
          isBanned: false,
          banReason: null,
          banExpires: null,
        },
      });
    }

    return updatedBan;
  }

  /**
   * Get all bans for a user
   * Requirements: 24.16
   */
  async getUserBans(userId: string): Promise<any> {
    const bans = await this.prisma.userBan.findMany({
      where: { userId },
      include: {
        issuer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        revoker: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return bans;
  }

  /**
   * Get active ban for a user
   * Requirements: 24.16
   */
  async getActiveBan(userId: string): Promise<any> {
    const activeBan = await this.prisma.userBan.findFirst({
      where: {
        userId,
        isActive: true,
        banType: {
          in: [BanType.TEMPORARY, BanType.PERMANENT],
        },
      },
      include: {
        issuer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return activeBan;
  }

  /**
   * Check if a user is currently banned
   * Requirements: 24.16
   */
  async isUserBanned(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isBanned: true, banExpires: true },
    });

    if (!user) {
      return false;
    }

    // Check if temporary ban has expired
    if (user.isBanned && user.banExpires && user.banExpires <= new Date()) {
      // Auto-unban expired temporary bans
      await this.autoUnbanExpiredBans(userId);
      return false;
    }

    return user.isBanned;
  }

  /**
   * Auto-unban users with expired temporary bans
   * Requirements: 24.16
   */
  private async autoUnbanExpiredBans(userId: string): Promise<void> {
    // Deactivate expired bans
    await this.prisma.userBan.updateMany({
      where: {
        userId,
        isActive: true,
        banType: BanType.TEMPORARY,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        isActive: false,
      },
    });

    // Update user status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        banReason: null,
        banExpires: null,
      },
    });
  }
}
