import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { GetAnnouncementsDto } from './dto/get-announcements.dto';

/**
 * Public controller for announcements
 * Allows users to fetch active announcements
 */
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementService: AnnouncementService) {}

  /**
   * GET /api/announcements
   * Get active announcements for display on dashboard
   * Requirements: 16.15
   * Access: Public (no authentication required)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getActiveAnnouncements(@Query() query: GetAnnouncementsDto) {
    return this.announcementService.getAnnouncements({
      ...query,
      activeOnly: true, // Force active only for public endpoint
    });
  }
}
