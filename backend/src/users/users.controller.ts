import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CloudinaryService } from './cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UserStatsQueryDto } from './dto/user-stats-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('me')
  async getCurrentUser(@CurrentUser() user: any) {
    return this.usersService.getCurrentUser(user.userId);
  }

  @Get(':userId')
  async getUserProfile(@Param('userId') userId: string) {
    return this.usersService.getUserProfile(userId);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, updateProfileDto);
  }

  @Patch('me/settings')
  async updateSettings(
    @CurrentUser() user: any,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(user.userId, updateSettingsDto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const avatarUrl = await this.cloudinaryService.uploadAvatar(
      file,
      user.userId,
    );
    return this.usersService.updateAvatar(user.userId, avatarUrl);
  }

  @Get(':userId/stats')
  async getUserStatistics(
    @Param('userId') userId: string,
    @Query() query: UserStatsQueryDto,
  ) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.usersService.getDetailedStatistics(
      userId,
      query.timeControl,
      startDate,
      endDate,
    );
  }

  /**
   * Search for users
   * GET /api/users/search
   * Requirements: 31.11
   */
  @Get('search')
  async searchUsers(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ) {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.usersService.searchUsers(query, user?.userId, limitNum);
  }

  /**
   * Get suggested players
   * GET /api/users/suggested
   * Requirements: 31.12
   */
  @Get('suggested')
  async getSuggestedPlayers(
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.usersService.getSuggestedPlayers(user.userId, limitNum);
  }

  /**
   * Get user games
   * GET /api/users/:userId/games
   */
  @Get(':userId/games')
  async getUserGames(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('timeControl') timeControl?: string,
    @Query('result') result?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.usersService.getUserGames(
      userId,
      pageNum,
      limitNum,
      timeControl,
      result,
    );
  }

  /**
   * Get user tournaments
   * GET /api/users/:userId/tournaments
   */
  @Get(':userId/tournaments')
  async getUserTournaments(@Param('userId') userId: string) {
    return this.usersService.getUserTournaments(userId);
  }
}
