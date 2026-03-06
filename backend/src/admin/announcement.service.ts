import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { GetAnnouncementsDto } from './dto/get-announcements.dto';
import { Announcement, AnnouncementPriority } from '@prisma/client';

/**
 * Service for managing system-wide announcements
 * Requirements: 25.11, 25.18
 */
@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Create a new announcement and broadcast to all users
   * Requirements: 25.11
   */
  async createAnnouncement(
    dto: CreateAnnouncementDto,
    createdBy: string,
  ): Promise<Announcement> {
    // Create announcement in database
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        message: dto.message,
        priority: dto.priority || AnnouncementPriority.NORMAL,
        linkUrl: dto.linkUrl,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy,
        isActive: true,
      },
    });

    this.logger.log(`Created announcement ${announcement.id}: ${announcement.title}`);

    // Create notifications for all users
    await this.notificationsService.notifyAnnouncement(
      announcement.title,
      announcement.message,
      announcement.linkUrl,
    );

    // Broadcast to all connected users via WebSocket
    await this.broadcastAnnouncement(announcement);

    return announcement;
  }

  /**
   * Get all announcements with pagination
   * Requirements: 25.11
   */
  async getAnnouncements(dto: GetAnnouncementsDto) {
    const where: any = {};

    if (dto.activeOnly) {
      where.isActive = true;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: dto.offset,
        take: dto.limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      announcements,
      total,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  /**
   * Get a single announcement by ID
   * Requirements: 25.11
   */
  async getAnnouncementById(id: string): Promise<Announcement> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  /**
   * Update an announcement
   * Requirements: 25.11
   */
  async updateAnnouncement(
    id: string,
    dto: Partial<CreateAnnouncementDto>,
  ): Promise<Announcement> {
    const announcement = await this.getAnnouncementById(id);

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        message: dto.message,
        priority: dto.priority,
        linkUrl: dto.linkUrl,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    this.logger.log(`Updated announcement ${id}`);
    return updated;
  }

  /**
   * Deactivate an announcement
   * Requirements: 25.11
   */
  async deactivateAnnouncement(id: string): Promise<void> {
    await this.getAnnouncementById(id);

    await this.prisma.announcement.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Deactivated announcement ${id}`);
  }

  /**
   * Delete an announcement
   * Requirements: 25.11
   */
  async deleteAnnouncement(id: string): Promise<void> {
    await this.getAnnouncementById(id);

    await this.prisma.announcement.delete({
      where: { id },
    });

    this.logger.log(`Deleted announcement ${id}`);
  }

  /**
   * Get active announcements for dashboard display
   * Requirements: 16.15
   */
  async getActiveAnnouncements(limit: number = 5): Promise<Announcement[]> {
    return this.prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * Broadcast announcement to all connected users
   * Private helper method
   */
  private async broadcastAnnouncement(announcement: Announcement): Promise<void> {
    // Get all connected users
    const connectedUserCount = this.notificationsGateway.getConnectedUserCount();
    
    if (connectedUserCount > 0) {
      // Broadcast via WebSocket to all connected users
      this.notificationsGateway.server.emit('announcement', {
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        priority: announcement.priority,
        linkUrl: announcement.linkUrl,
        createdAt: announcement.createdAt,
      });

      this.logger.log(
        `Broadcast announcement to ${connectedUserCount} connected users`,
      );
    }
  }

  /**
   * Clean up expired announcements (can be run as a cron job)
   */
  async cleanupExpiredAnnouncements(): Promise<number> {
    const result = await this.prisma.announcement.updateMany({
      where: {
        isActive: true,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        isActive: false,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Deactivated ${result.count} expired announcements`);
    }

    return result.count;
  }
}
