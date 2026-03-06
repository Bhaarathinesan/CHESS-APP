import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto, ReportType } from './dto/create-report.dto';

/**
 * ReportsService
 * Handles report submission and storage for moderation
 * Requirements: 19.7 (chat reports), 24.14 (suspicious behavior reports)
 */
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new report
   * @param reporterId - The user ID of the reporter
   * @param createReportDto - The report data
   * @returns The created report
   */
  async createReport(reporterId: string, createReportDto: CreateReportDto) {
    const { reportType, description, reportedUserId, gameId, chatMessageId } = createReportDto;

    // Validate that required fields are provided based on report type
    this.validateReportData(reportType, reportedUserId, gameId, chatMessageId);

    // Prevent self-reporting for user reports
    if (reportType === ReportType.USER && reportedUserId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }

    // Verify reported user exists if provided
    if (reportedUserId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: reportedUserId },
        select: { id: true },
      });

      if (!userExists) {
        throw new NotFoundException('Reported user not found');
      }
    }

    // Verify game exists if provided
    if (gameId) {
      const gameExists = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: { id: true },
      });

      if (!gameExists) {
        throw new NotFoundException('Game not found');
      }
    }

    // Verify chat message exists if provided
    if (chatMessageId) {
      const messageExists = await this.prisma.chatMessage.findUnique({
        where: { id: chatMessageId },
        select: { id: true, senderId: true },
      });

      if (!messageExists) {
        throw new NotFoundException('Chat message not found');
      }

      // Prevent reporting own messages
      if (messageExists.senderId === reporterId) {
        throw new BadRequestException('You cannot report your own messages');
      }
    }

    // Map report type to database report_type format
    const dbReportType = this.mapReportType(reportType, chatMessageId);

    // Create the report
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        gameId,
        reportType: dbReportType,
        description: description.trim(),
        status: 'PENDING',
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        reportedUser: reportedUserId
          ? {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            }
          : undefined,
      },
    });

    return report;
  }

  /**
   * Validate report data based on report type
   */
  private validateReportData(
    reportType: ReportType,
    reportedUserId?: string,
    gameId?: string,
    chatMessageId?: string,
  ) {
    switch (reportType) {
      case ReportType.USER:
        if (!reportedUserId) {
          throw new BadRequestException('reportedUserId is required for user reports');
        }
        break;

      case ReportType.GAME:
        if (!gameId) {
          throw new BadRequestException('gameId is required for game reports');
        }
        if (!reportedUserId) {
          throw new BadRequestException('reportedUserId is required for game reports (suspected cheater)');
        }
        break;

      case ReportType.CHAT:
        if (!chatMessageId) {
          throw new BadRequestException('chatMessageId is required for chat reports');
        }
        break;

      default:
        throw new BadRequestException('Invalid report type');
    }
  }

  /**
   * Map report type to database format
   */
  private mapReportType(reportType: ReportType, chatMessageId?: string): string {
    switch (reportType) {
      case ReportType.USER:
        return 'harassment';
      case ReportType.GAME:
        return 'cheating';
      case ReportType.CHAT:
        return 'inappropriate_chat';
      default:
        return 'other';
    }
  }

  /**
   * Get reports for admin review
   * @param status - Optional filter by status
   * @param limit - Number of reports to return
   * @param offset - Pagination offset
   * @returns Array of reports
   */
  async getReports(status?: string, limit: number = 50, offset: number = 0) {
    const where = status ? { status: status.toUpperCase() as any } : {};

    return this.prisma.report.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get a single report by ID
   * @param reportId - The report ID
   * @returns The report
   */
  async getReportById(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  /**
   * Update report status (admin only)
   * @param reportId - The report ID
   * @param status - The new status
   * @param reviewerId - The admin user ID
   * @param adminNotes - Optional admin notes
   * @returns The updated report
   */
  async updateReportStatus(
    reportId: string,
    status: string,
    reviewerId: string,
    adminNotes?: string,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: status.toUpperCase() as any,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        adminNotes: adminNotes?.trim(),
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
  }
}
