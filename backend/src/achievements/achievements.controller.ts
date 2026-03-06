import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  async getAllAchievements() {
    return this.achievementsService.getAllAchievements();
  }

  @Get('my')
  async getMyAchievements(@CurrentUser() user: any) {
    return this.achievementsService.getUserAchievements(user.userId);
  }

  @Get('my/progress')
  async getMyProgress(@CurrentUser() user: any) {
    return this.achievementsService.getAchievementProgress(user.userId);
  }

  @Get('user/:userId')
  async getUserAchievements(@Param('userId') userId: string) {
    return this.achievementsService.getUserAchievements(userId);
  }

  @Get('user/:userId/progress')
  async getUserProgress(@Param('userId') userId: string) {
    return this.achievementsService.getAchievementProgress(userId);
  }
}
