import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

/**
 * ReportsController
 * REST API endpoints for report submission and management
 * Requirements: 19.7 (chat reports), 24.14 (suspicious behavior reports)
 */
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Submit a new report
   * POST /api/reports
   * Requirements: 19.7, 24.14
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReport(@Body() createReportDto: CreateReportDto, @Request() req: any) {
    const reporterId = req.user.sub;
    return this.reportsService.createReport(reporterId, createReportDto);
  }

  /**
   * Get all reports (admin only)
   * GET /api/reports
   * Requirement: 25.12
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ADMIN)
  async getReports(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.reportsService.getReports(status, limitNum, offsetNum);
  }

  /**
   * Get a single report by ID (admin only)
   * GET /api/reports/:id
   * Requirement: 25.12
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ADMIN)
  async getReportById(@Param('id') id: string) {
    return this.reportsService.getReportById(id);
  }

  /**
   * Update report status (admin only)
   * PATCH /api/reports/:id/status
   * Requirement: 25.12
   */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateReportStatus(
    @Param('id') id: string,
    @Body() body: { status: string; adminNotes?: string },
    @Request() req: any,
  ) {
    const reviewerId = req.user.sub;
    return this.reportsService.updateReportStatus(
      id,
      body.status,
      reviewerId,
      body.adminNotes,
    );
  }
}
