import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { Public } from './auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return {
      message: 'This is your profile',
      user,
    };
  }

  // Example: Admin-only endpoint
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  getAdminData(@CurrentUser() user: any) {
    return {
      message: 'This is admin-only data',
      user,
    };
  }

  // Example: Tournament admin or super admin endpoint
  @Get('tournament-management')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ADMIN)
  getTournamentManagement(@CurrentUser() user: any) {
    return {
      message: 'Tournament management area',
      user,
    };
  }

  // Example: Player-only endpoint
  @Get('player-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLAYER)
  getPlayerStats(@CurrentUser() user: any) {
    return {
      message: 'Player statistics',
      user,
    };
  }
}
