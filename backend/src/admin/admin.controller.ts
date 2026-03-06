import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AnnouncementService } from './announcement.service';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AddCollegeDomainDto } from './dto/add-college-domain.dto';
import { AdminTournamentQueryDto } from './dto/admin-tournament-query.dto';
import { AdminUpdateTournamentDto } from './dto/admin-update-tournament.dto';
import { CancelTournamentDto } from './dto/cancel-tournament.dto';
import { AdminReportQueryDto } from './dto/admin-report-query.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { IssueBanDto } from './dto/issue-ban.dto';
import { RevokeBanDto } from './dto/revoke-ban.dto';
import { RollbackRatingsDto } from './dto/rollback-ratings.dto';
import { AdjustRatingDto } from './dto/adjust-rating.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { GetAnnouncementsDto } from './dto/get-announcements.dto';

import { LoggingService } from './logging.service';
import { LogQueryDto } from './dto/log-query.dto';
import { Response } from 'express';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly announcementService: AnnouncementService,
    private readonly loggingService: LoggingService,
    private readonly exportService: ExportService,
  ) {}

  /**
   * GET /api/admin/dashboard
   * Get comprehensive admin dashboard metrics
   * Requirements: 25.1, 25.2, 25.3, 25.4, 25.18
   * Access: super_admin only
   */
  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getDashboard() {
    return this.adminService.getDashboardMetrics();
  }

  /**
   * GET /api/admin/users
   * Get paginated list of users with search and filters
   * Requirements: 25.5, 25.18
   * Access: super_admin only
   */
  @Get('users')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUsers(@Query() query: UserQueryDto) {
    return this.adminService.getUsers(query);
  }

  /**
   * PATCH /api/admin/users/:userId
   * Update user profile, role, or ban status
   * Requirements: 25.6, 25.7, 25.8, 25.18
   * Access: super_admin only
   */
  @Patch('users/:userId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateData: UpdateUserDto,
  ) {
    await this.adminService.updateUser(userId, updateData);
    return { message: 'User updated successfully' };
  }

  /**
   * POST /api/admin/users/:userId/reset-password
   * Reset user password and return new password
   * Requirements: 25.6, 25.18
   * Access: super_admin only
   */
  @Post('users/:userId/reset-password')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async resetUserPassword(@Param('userId') userId: string) {
    const newPassword = await this.adminService.resetUserPassword(userId);
    return {
      message: 'Password reset successfully',
      newPassword,
    };
  }

  /**
   * GET /api/admin/college-domains
   * Get list of approved college domains
   * Requirements: 25.16, 25.18
   * Access: super_admin only
   */
  @Get('college-domains')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getCollegeDomains() {
    return this.adminService.getCollegeDomains();
  }

  /**
   * POST /api/admin/college-domains
   * Add a new approved college domain
   * Requirements: 25.16, 25.18
   * Access: super_admin only
   */
  @Post('college-domains')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addCollegeDomain(@Body() dto: AddCollegeDomainDto) {
    await this.adminService.addCollegeDomain(dto.domain, dto.collegeName);
    return { message: 'College domain added successfully' };
  }

  /**
   * DELETE /api/admin/college-domains/:domainId
   * Remove an approved college domain
   * Requirements: 25.16, 25.18
   * Access: super_admin only
   */
  @Delete('college-domains/:domainId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeCollegeDomain(@Param('domainId') domainId: string) {
    await this.adminService.removeCollegeDomain(domainId);
    return { message: 'College domain removed successfully' };
  }

  /**
   * PATCH /api/admin/college-domains/:domainId/toggle
   * Toggle college domain active status
   * Requirements: 25.16, 25.18
   * Access: super_admin only
   */
  @Patch('college-domains/:domainId/toggle')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async toggleCollegeDomainStatus(@Param('domainId') domainId: string) {
    await this.adminService.toggleCollegeDomainStatus(domainId);
    return { message: 'College domain status updated successfully' };
  }

  /**
   * GET /api/admin/tournaments
   * Get all tournaments with admin filters and pagination
   * Requirements: 25.9, 25.18
   * Access: super_admin only
   */
  @Get('tournaments')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getTournaments(@Query() query: AdminTournamentQueryDto) {
    return this.adminService.getTournaments(query);
  }

  /**
   * PATCH /api/admin/tournaments/:tournamentId
   * Update any tournament as admin
   * Requirements: 25.10, 25.18
   * Access: super_admin only
   */
  @Patch('tournaments/:tournamentId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateTournament(
    @Param('tournamentId') tournamentId: string,
    @Body() updateData: AdminUpdateTournamentDto,
  ) {
    await this.adminService.updateTournamentAsAdmin(tournamentId, updateData);
    return { message: 'Tournament updated successfully' };
  }

  /**
   * POST /api/admin/tournaments/:tournamentId/cancel
   * Cancel any tournament as admin
   * Requirements: 25.10, 25.18
   * Access: super_admin only
   */
  @Post('tournaments/:tournamentId/cancel')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async cancelTournament(
    @Param('tournamentId') tournamentId: string,
    @Body() body: CancelTournamentDto,
  ) {
    await this.adminService.cancelTournamentAsAdmin(
      tournamentId,
      body.reason,
    );
    return { message: 'Tournament cancelled successfully' };
  }

  /**
   * GET /api/admin/reports
   * Get all reports with filters for moderation
   * Requirements: 25.12, 25.18
   * Access: super_admin only
   */
  @Get('reports')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getReports(@Query() query: AdminReportQueryDto) {
    return this.adminService.getReports(query);
  }

  /**
   * GET /api/admin/reports/:reportId
   * Get a single report with full details
   * Requirements: 25.12, 25.18
   * Access: super_admin only
   */
  @Get('reports/:reportId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getReportById(@Param('reportId') reportId: string) {
    return this.adminService.getReportById(reportId);
  }

  /**
   * PATCH /api/admin/reports/:reportId
   * Update report status and add admin notes
   * Requirements: 25.12, 25.18
   * Access: super_admin only
   */
  @Patch('reports/:reportId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateReportStatus(
    @Param('reportId') reportId: string,
    @Body() updateData: UpdateReportStatusDto,
    @Request() req: any,
  ) {
    const reviewerId = req.user.sub;
    const report = await this.adminService.updateReportStatus(
      reportId,
      updateData.status,
      reviewerId,
      updateData.adminNotes,
    );
    return {
      message: 'Report status updated successfully',
      report,
    };
  }

  /**
   * GET /api/admin/reports/chat-logs/:gameId
   * Get chat logs for a specific game for moderation
   * Requirements: 25.13, 25.18
   * Access: super_admin only
   */
  @Get('reports/chat-logs/:gameId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getChatLogs(@Param('gameId') gameId: string) {
    return this.adminService.getChatLogs(gameId);
  }

  /**
   * GET /api/admin/anti-cheat/flags
   * Get all anti-cheat flags with pagination
   * Requirements: 24.15, 25.18
   * Access: super_admin only
   */
  @Get('anti-cheat/flags')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAntiCheatFlags(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getAntiCheatFlags(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  /**
   * GET /api/admin/anti-cheat/users/:userId
   * Get anti-cheat flags for a specific user
   * Requirements: 24.15, 25.18
   * Access: super_admin only
   */
  @Get('anti-cheat/users/:userId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUserAntiCheatFlags(@Param('userId') userId: string) {
    return this.adminService.getUserAntiCheatFlags(userId);
  }

  /**
   * GET /api/admin/anti-cheat/users/:userId/statistics
   * Get anti-cheat statistics for a specific user
   * Requirements: 24.15, 25.18
   * Access: super_admin only
   */
  @Get('anti-cheat/users/:userId/statistics')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUserAntiCheatStatistics(@Param('userId') userId: string) {
    return this.adminService.getUserAntiCheatStatistics(userId);
  }

  /**
   * PATCH /api/admin/anti-cheat/flags/:flagId
   * Update anti-cheat flag status
   * Requirements: 24.15, 25.18
   * Access: super_admin only
   */
  @Patch('anti-cheat/flags/:flagId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateAntiCheatFlag(
    @Param('flagId') flagId: string,
    @Body() updateData: { status: string; adminNotes?: string },
    @Request() req: any,
  ) {
    const reviewerId = req.user.sub;
    return this.adminService.updateAntiCheatFlag(
      flagId,
      updateData.status as any,
      reviewerId,
      updateData.adminNotes,
    );
  }

  /**
   * POST /api/admin/users/:userId/ban
   * Issue a ban (warning, temporary, or permanent) to a user
   * Requirements: 24.16, 25.18
   * Access: super_admin only
   */
  @Post('users/:userId/ban')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async issueBan(
    @Param('userId') userId: string,
    @Body() dto: IssueBanDto,
    @Request() req: any,
  ) {
    const issuedBy = req.user.sub;
    return this.adminService.issueBan(userId, dto, issuedBy);
  }

  /**
   * DELETE /api/admin/users/:userId/ban/:banId
   * Revoke a ban (unban a user)
   * Requirements: 24.16, 25.18
   * Access: super_admin only
   */
  @Delete('users/:userId/ban/:banId')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async revokeBan(
    @Param('userId') userId: string,
    @Param('banId') banId: string,
    @Body() dto: RevokeBanDto,
    @Request() req: any,
  ) {
    const revokedBy = req.user.sub;
    return this.adminService.revokeBan(banId, revokedBy, dto.revokeReason);
  }

  /**
   * GET /api/admin/users/:userId/bans
   * Get all bans for a user
   * Requirements: 24.16, 25.18
   * Access: super_admin only
   */
  @Get('users/:userId/bans')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUserBans(@Param('userId') userId: string) {
    return this.adminService.getUserBans(userId);
  }

  /**
   * POST /api/admin/users/:userId/rollback-ratings
   * Rollback rating changes from affected games
   * Requirements: 24.17, 25.18
   * Access: super_admin only
   */
  @Post('users/:userId/rollback-ratings')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async rollbackRatings(
    @Param('userId') userId: string,
    @Body() dto: RollbackRatingsDto,
  ) {
    return this.adminService.rollbackRatings(userId, dto);
  }

  /**
   * POST /api/admin/users/:userId/rollback-ratings/preview
   * Preview rating rollback without applying changes
   * Requirements: 24.17, 25.18
   * Access: super_admin only
   */
  @Post('users/:userId/rollback-ratings/preview')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async previewRollback(
    @Param('userId') userId: string,
    @Body() dto: RollbackRatingsDto,
  ) {
    return this.adminService.previewRollback(userId, dto);
  }

  /**
   * POST /api/admin/ratings/:userId/adjust
   * Manually adjust a user's rating
   * Requirements: 25.14, 25.18
   * Access: super_admin only
   */
  @Post('ratings/:userId/adjust')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async adjustRating(
    @Param('userId') userId: string,
    @Body() dto: AdjustRatingDto,
    @Request() req: any,
  ) {
    const adjustedBy = req.user.sub;
    return this.adminService.adjustRating(
      userId,
      dto.timeControl,
      dto.newRating,
      dto.reason,
      adjustedBy,
    );
  }

  /**
   * POST /api/admin/announcements
   * Create a new system-wide announcement
   * Requirements: 25.11, 25.18
   * Access: super_admin only
   */
  @Post('announcements')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createAnnouncement(
    @Body() dto: CreateAnnouncementDto,
    @Request() req: any,
  ) {
    const createdBy = req.user.sub;
    const announcement = await this.announcementService.createAnnouncement(dto, createdBy);
    return {
      message: 'Announcement created and broadcast successfully',
      announcement,
    };
  }

  /**
   * GET /api/admin/announcements
   * Get all announcements with pagination
   * Requirements: 25.11, 25.18
   * Access: super_admin only
   */
  @Get('announcements')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAnnouncements(@Query() query: GetAnnouncementsDto) {
    return this.announcementService.getAnnouncements(query);
  }

  /**
   * GET /api/admin/announcements/:id
   * Get a single announcement by ID
   * Requirements: 25.11, 25.18
   * Access: super_admin only
   */
  @Get('announcements/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAnnouncementById(@Param('id') id: string) {
    return this.announcementService.getAnnouncementById(id);
  }

  /**
   * PATCH /api/admin/announcements/:id
   * Update an announcement
   * Requirements: 25.11, 25.18
   * Access: super_admin only
   */
  @Patch('announcements/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateAnnouncement(
    @Param('id') id: string,
    @Body() dto: Partial<CreateAnnouncementDto>,
  ) {
    const announcement = await this.announcementService.updateAnnouncement(id, dto);
    return {
      message: 'Announcement updated successfully',
      announcement,
    };
  }

  /**
   * DELETE /api/admin/announcements/:id
   * Delete an announcement
   * Requirements: 25.11, 25.18
   * Access: super_admin only
   */
  @Delete('announcements/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteAnnouncement(@Param('id') id: string) {
    await this.announcementService.deleteAnnouncement(id);
    return { message: 'Announcement deleted successfully' };
  }

  /**
   * POST /api/admin/announcements/:id/deactivate
   * Deactivate an announcement
   * Requirements: 25.11, 25.18
   * Access: super_admin only
   */
  @Post('announcements/:id/deactivate')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deactivateAnnouncement(@Param('id') id: string) {
    await this.announcementService.deactivateAnnouncement(id);
    return { message: 'Announcement deactivated successfully' };
  }

  /**
   * GET /api/admin/logs
   * Get system logs with filtering and pagination
   * Requirements: 25.15, 25.18
   * Access: super_admin only
   */
  @Get('logs')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getLogs(@Query() query: LogQueryDto) {
    return this.loggingService.getLogs(query);
  }

  /**
   * GET /api/admin/logs/statistics
   * Get log statistics
   * Requirements: 25.15, 25.18
   * Access: super_admin only
   */
  @Get('logs/statistics')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getLogStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.loggingService.getLogStatistics(start, end);
  }

  /**
   * GET /api/admin/logs/recent-errors
   * Get recent error logs
   * Requirements: 25.15, 25.18
   * Access: super_admin only
   */
  @Get('logs/recent-errors')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getRecentErrors(@Query('limit') limit?: number) {
    return this.loggingService.getRecentErrors(limit ? parseInt(limit.toString()) : 10);
  }

  /**
   * GET /api/admin/export/users/csv
   * Export user data as CSV
   * Requirements: 25.17, 25.18
   * Access: super_admin only
   */
  @Get('export/users/csv')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async exportUsersCSV(
    @Query('role') role?: string,
    @Query('collegeDomain') collegeDomain?: string,
    @Query('isBanned') isBanned?: string,
  ) {
    const filters: any = {};
    if (role) filters.role = role;
    if (collegeDomain) filters.collegeDomain = collegeDomain;
    if (isBanned !== undefined) filters.isBanned = isBanned === 'true';

    const csvBuffer = await this.exportService.exportUsersToCSV(filters);
    
    return {
      filename: `users-export-${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv',
      data: csvBuffer.toString('base64'),
    };
  }

  /**
   * GET /api/admin/export/users/pdf
   * Export user data as PDF
   * Requirements: 25.17, 25.18
   * Access: super_admin only
   */
  @Get('export/users/pdf')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async exportUsersPDF(
    @Query('role') role?: string,
    @Query('collegeDomain') collegeDomain?: string,
    @Query('isBanned') isBanned?: string,
  ) {
    const filters: any = {};
    if (role) filters.role = role;
    if (collegeDomain) filters.collegeDomain = collegeDomain;
    if (isBanned !== undefined) filters.isBanned = isBanned === 'true';

    const pdfBuffer = await this.exportService.exportUsersToPDF(filters);
    
    return {
      filename: `users-export-${new Date().toISOString().split('T')[0]}.pdf`,
      contentType: 'application/pdf',
      data: pdfBuffer.toString('base64'),
    };
  }

  /**
   * GET /api/admin/export/analytics/csv
   * Export analytics report as CSV
   * Requirements: 25.17, 25.18
   * Access: super_admin only
   */
  @Get('export/analytics/csv')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async exportAnalyticsCSV() {
    const csvBuffer = await this.exportService.exportAnalyticsToCSV();
    
    return {
      filename: `analytics-report-${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv',
      data: csvBuffer.toString('base64'),
    };
  }

  /**
   * GET /api/admin/export/analytics/pdf
   * Export analytics report as PDF
   * Requirements: 25.17, 25.18
   * Access: super_admin only
   */
  @Get('export/analytics/pdf')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async exportAnalyticsPDF() {
    const pdfBuffer = await this.exportService.exportAnalyticsToPDF();
    
    return {
      filename: `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`,
      contentType: 'application/pdf',
      data: pdfBuffer.toString('base64'),
    };
  }
}
