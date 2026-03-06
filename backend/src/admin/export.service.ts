import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createObjectCsvWriter } from 'csv-writer';
import * as PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface UserExportData {
  id: string;
  email: string;
  username: string;
  displayName: string;
  collegeName: string;
  collegeDomain: string;
  role: string;
  emailVerified: boolean;
  isOnline: boolean;
  lastOnline: Date | null;
  isBanned: boolean;
  createdAt: Date;
}

export interface AnalyticsReportData {
  totalUsers: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  totalGames: number;
  averageGameDuration: number;
  popularTimeControls: Array<{
    timeControl: string;
    count: number;
    percentage: number;
  }>;
  tournamentParticipationRate: number;
  peakUsageHours: Array<{ hour: number; count: number }>;
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export user data as CSV
   * Requirements: 25.17
   */
  async exportUsersToCSV(filters?: {
    role?: string;
    collegeDomain?: string;
    isBanned?: boolean;
  }): Promise<Buffer> {
    // Build where clause
    const where: any = {};
    if (filters?.role) {
      where.role = filters.role;
    }
    if (filters?.collegeDomain) {
      where.collegeDomain = filters.collegeDomain;
    }
    if (filters?.isBanned !== undefined) {
      where.isBanned = filters.isBanned;
    }

    // Fetch users
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        collegeName: true,
        collegeDomain: true,
        role: true,
        emailVerified: true,
        isOnline: true,
        lastOnline: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create CSV content
    const csvRows: string[] = [];
    
    // Header
    csvRows.push(
      'ID,Email,Username,Display Name,College Name,College Domain,Role,Email Verified,Is Online,Last Online,Is Banned,Ban Reason,Created At'
    );

    // Data rows
    for (const user of users) {
      const row = [
        user.id,
        user.email,
        user.username,
        user.displayName,
        user.collegeName,
        user.collegeDomain,
        user.role,
        user.emailVerified ? 'Yes' : 'No',
        user.isOnline ? 'Yes' : 'No',
        user.lastOnline ? user.lastOnline.toISOString() : 'Never',
        user.isBanned ? 'Yes' : 'No',
        user.banReason || '',
        user.createdAt.toISOString(),
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      
      csvRows.push(row);
    }

    return Buffer.from(csvRows.join('\n'), 'utf-8');
  }

  /**
   * Export analytics report as CSV
   * Requirements: 25.17
   */
  async exportAnalyticsToCSV(): Promise<Buffer> {
    const analytics = await this.getAnalyticsData();

    const csvRows: string[] = [];

    // User Metrics Section
    csvRows.push('USER METRICS');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Users,${analytics.totalUsers}`);
    csvRows.push(`Daily Active Users,${analytics.dailyActiveUsers}`);
    csvRows.push(`Weekly Active Users,${analytics.weeklyActiveUsers}`);
    csvRows.push(`Monthly Active Users,${analytics.monthlyActiveUsers}`);
    csvRows.push('');

    // Game Metrics Section
    csvRows.push('GAME METRICS');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Games,${analytics.totalGames}`);
    csvRows.push(`Average Game Duration (seconds),${analytics.averageGameDuration}`);
    csvRows.push('');

    // Popular Time Controls
    csvRows.push('POPULAR TIME CONTROLS');
    csvRows.push('Time Control,Games Played,Percentage');
    for (const tc of analytics.popularTimeControls) {
      csvRows.push(`${tc.timeControl},${tc.count},${tc.percentage}%`);
    }
    csvRows.push('');

    // Tournament Metrics
    csvRows.push('TOURNAMENT METRICS');
    csvRows.push('Metric,Value');
    csvRows.push(`Tournament Participation Rate,${analytics.tournamentParticipationRate}%`);
    csvRows.push('');

    // Peak Usage Hours
    csvRows.push('PEAK USAGE HOURS');
    csvRows.push('Hour (24h format),Games Started');
    for (const peak of analytics.peakUsageHours) {
      csvRows.push(`${peak.hour}:00,${peak.count}`);
    }

    return Buffer.from(csvRows.join('\n'), 'utf-8');
  }

  /**
   * Export user data as PDF
   * Requirements: 25.17
   */
  async exportUsersToPDF(filters?: {
    role?: string;
    collegeDomain?: string;
    isBanned?: boolean;
  }): Promise<Buffer> {
    // Build where clause
    const where: any = {};
    if (filters?.role) {
      where.role = filters.role;
    }
    if (filters?.collegeDomain) {
      where.collegeDomain = filters.collegeDomain;
    }
    if (filters?.isBanned !== undefined) {
      where.isBanned = filters.isBanned;
    }

    // Fetch users
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        collegeName: true,
        collegeDomain: true,
        role: true,
        emailVerified: true,
        isOnline: true,
        lastOnline: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit for PDF to avoid huge files
    });

    return this.generateUsersPDF(users);
  }

  /**
   * Export analytics report as PDF
   * Requirements: 25.17
   */
  async exportAnalyticsToPDF(): Promise<Buffer> {
    const analytics = await this.getAnalyticsData();
    return this.generateAnalyticsPDF(analytics);
  }

  /**
   * Get analytics data for export
   */
  private async getAnalyticsData(): Promise<AnalyticsReportData> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      totalGames,
      gamesWithDuration,
      timeControlCounts,
      tournamentPlayers,
      recentGames,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { lastOnline: { gte: oneDayAgo } } }),
      this.prisma.user.count({ where: { lastOnline: { gte: oneWeekAgo } } }),
      this.prisma.user.count({ where: { lastOnline: { gte: oneMonthAgo } } }),
      this.prisma.game.count({ where: { status: 'COMPLETED' } }),
      this.prisma.game.findMany({
        where: {
          status: 'COMPLETED',
          startedAt: { not: null },
          completedAt: { not: null },
        },
        select: { startedAt: true, completedAt: true },
      }),
      this.prisma.game.groupBy({
        by: ['timeControl'],
        where: { status: 'COMPLETED' },
        _count: { timeControl: true },
        orderBy: { _count: { timeControl: 'desc' } },
      }),
      this.prisma.tournamentPlayer.groupBy({ by: ['userId'] }),
      this.prisma.game.findMany({
        where: { createdAt: { gte: oneMonthAgo } },
        select: { createdAt: true },
      }),
    ]);

    // Calculate average game duration
    let averageDuration = 0;
    if (gamesWithDuration.length > 0) {
      const totalDuration = gamesWithDuration.reduce((sum, game) => {
        if (game.completedAt && game.startedAt) {
          return sum + (game.completedAt.getTime() - game.startedAt.getTime());
        }
        return sum;
      }, 0);
      averageDuration = Math.round(totalDuration / gamesWithDuration.length / 1000);
    }

    // Popular time controls
    const popularTimeControls = timeControlCounts.map((tc) => ({
      timeControl: tc.timeControl,
      count: tc._count.timeControl,
      percentage:
        totalGames > 0
          ? Math.round((tc._count.timeControl / totalGames) * 100 * 10) / 10
          : 0,
    }));

    // Peak usage hours
    const hourCounts = new Array(24).fill(0);
    recentGames.forEach((game) => {
      if (game.createdAt) {
        const hour = game.createdAt.getHours();
        hourCounts[hour]++;
      }
    });

    const peakUsageHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Tournament participation rate
    const tournamentParticipationRate =
      totalUsers > 0
        ? Math.round((tournamentPlayers.length / totalUsers) * 100 * 10) / 10
        : 0;

    return {
      totalUsers,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      totalGames,
      averageGameDuration: averageDuration,
      popularTimeControls,
      tournamentParticipationRate,
      peakUsageHours,
    };
  }

  /**
   * Generate PDF for users list
   */
  private generateUsersPDF(users: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text('ChessArena - User Data Export', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Total Users: ${users.length}`, { align: 'center' });
      doc.moveDown(2);

      // Table header
      doc.fontSize(9);
      const startY = doc.y;
      const colWidths = {
        username: 80,
        email: 120,
        college: 100,
        role: 60,
        status: 60,
        created: 80,
      };

      // Header row
      doc.font('Helvetica-Bold');
      let x = 50;
      doc.text('Username', x, startY, { width: colWidths.username, continued: false });
      x += colWidths.username;
      doc.text('Email', x, startY, { width: colWidths.email, continued: false });
      x += colWidths.email;
      doc.text('College', x, startY, { width: colWidths.college, continued: false });
      x += colWidths.college;
      doc.text('Role', x, startY, { width: colWidths.role, continued: false });
      x += colWidths.role;
      doc.text('Status', x, startY, { width: colWidths.status, continued: false });
      x += colWidths.status;
      doc.text('Created', x, startY, { width: colWidths.created, continued: false });

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Data rows
      doc.font('Helvetica');
      for (const user of users) {
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
          doc.fontSize(9);
        }

        const rowY = doc.y;
        x = 50;

        doc.text(user.username, x, rowY, { width: colWidths.username, continued: false });
        x += colWidths.username;
        doc.text(user.email, x, rowY, { width: colWidths.email, continued: false });
        x += colWidths.email;
        doc.text(user.collegeName, x, rowY, { width: colWidths.college, continued: false });
        x += colWidths.college;
        doc.text(user.role, x, rowY, { width: colWidths.role, continued: false });
        x += colWidths.role;
        const status = user.isBanned ? 'Banned' : user.isOnline ? 'Online' : 'Offline';
        doc.text(status, x, rowY, { width: colWidths.status, continued: false });
        x += colWidths.status;
        doc.text(user.createdAt.toLocaleDateString(), x, rowY, { width: colWidths.created, continued: false });

        doc.moveDown(0.8);
      }

      doc.end();
    });
  }

  /**
   * Generate PDF for analytics report
   */
  private generateAnalyticsPDF(analytics: AnalyticsReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(24).text('ChessArena Analytics Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // User Metrics Section
      doc.fontSize(16).text('User Metrics', { underline: true });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Total Users: ${analytics.totalUsers}`);
      doc.text(`Daily Active Users: ${analytics.dailyActiveUsers}`);
      doc.text(`Weekly Active Users: ${analytics.weeklyActiveUsers}`);
      doc.text(`Monthly Active Users: ${analytics.monthlyActiveUsers}`);
      doc.moveDown(2);

      // Game Metrics Section
      doc.fontSize(16).text('Game Metrics', { underline: true });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Total Games Played: ${analytics.totalGames}`);
      doc.text(`Average Game Duration: ${Math.floor(analytics.averageGameDuration / 60)} minutes ${analytics.averageGameDuration % 60} seconds`);
      doc.moveDown(2);

      // Popular Time Controls
      doc.fontSize(16).text('Popular Time Controls', { underline: true });
      doc.moveDown();
      doc.fontSize(12);
      for (const tc of analytics.popularTimeControls) {
        doc.text(`${tc.timeControl}: ${tc.count} games (${tc.percentage}%)`);
      }
      doc.moveDown(2);

      // Tournament Metrics
      doc.fontSize(16).text('Tournament Metrics', { underline: true });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Tournament Participation Rate: ${analytics.tournamentParticipationRate}%`);
      doc.moveDown(2);

      // Peak Usage Hours
      doc.fontSize(16).text('Peak Usage Hours', { underline: true });
      doc.moveDown();
      doc.fontSize(12);
      doc.text('Top 5 busiest hours:');
      for (const peak of analytics.peakUsageHours) {
        doc.text(`  ${peak.hour}:00 - ${peak.count} games started`);
      }

      doc.end();
    });
  }
}
