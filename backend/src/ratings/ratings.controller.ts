import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimeControl } from '@prisma/client';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get('user/:userId')
  async getUserRatings(@Param('userId') userId: string) {
    return this.ratingsService.getUserRatings(userId);
  }

  @Get('history/:userId/:timeControl')
  async getRatingHistory(
    @Param('userId') userId: string,
    @Param('timeControl') timeControl: TimeControl,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.ratingsService.getRatingHistory(userId, timeControl, limitNum);
  }

  @Get('leaderboard/:timeControl')
  async getLeaderboard(
    @Param('timeControl') timeControl: TimeControl,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.ratingsService.getLeaderboard(timeControl, limitNum);
  }
}
