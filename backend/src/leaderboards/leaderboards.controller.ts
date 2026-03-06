import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { LeaderboardsService } from './leaderboards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimeControl } from '@prisma/client';
import {
  LeaderboardQueryDto,
  WeeklyLeaderboardQueryDto,
} from './dto/leaderboard-query.dto';

@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private readonly leaderboardsService: LeaderboardsService) {}

  /**
   * GET /api/leaderboards/:timeControl
   * Get global leaderboard for a specific time control
   */
  @Get(':timeControl')
  @HttpCode(HttpStatus.OK)
  async getGlobalLeaderboard(
    @Param('timeControl') timeControl: TimeControl,
    @Query() query: LeaderboardQueryDto,
  ) {
    const { page = 1, limit = 100 } = query;
    return this.leaderboardsService.getGlobalLeaderboard(
      timeControl,
      page,
      limit,
    );
  }

  /**
   * GET /api/leaderboards/:timeControl/college/:domain
   * Get college-specific leaderboard
   */
  @Get(':timeControl/college/:domain')
  @HttpCode(HttpStatus.OK)
  async getCollegeLeaderboard(
    @Param('timeControl') timeControl: TimeControl,
    @Param('domain') domain: string,
    @Query() query: LeaderboardQueryDto,
  ) {
    const { page = 1, limit = 100 } = query;
    return this.leaderboardsService.getCollegeLeaderboard(
      timeControl,
      domain,
      page,
      limit,
    );
  }

  /**
   * GET /api/leaderboards/weekly
   * Get weekly leaderboard (top performers in last 7 days)
   */
  @Get('weekly')
  @HttpCode(HttpStatus.OK)
  async getWeeklyLeaderboard(@Query() query: WeeklyLeaderboardQueryDto) {
    const { timeControl, limit = 100 } = query;
    const leaderboard = await this.leaderboardsService.getWeeklyLeaderboard(
      timeControl,
      limit,
    );
    return { leaderboard };
  }

  /**
   * GET /api/leaderboards/:timeControl/search
   * Search for a player on the leaderboard
   */
  @Get(':timeControl/search')
  @HttpCode(HttpStatus.OK)
  async searchPlayer(
    @Param('timeControl') timeControl: TimeControl,
    @Query('username') username: string,
  ) {
    const player = await this.leaderboardsService.searchPlayer(
      username,
      timeControl,
    );
    return { player };
  }
}
