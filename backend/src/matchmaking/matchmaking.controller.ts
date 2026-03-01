import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { MatchmakingService, QueueStatus, Challenge, RematchOffer } from './matchmaking.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { CreateRematchDto } from './dto/create-rematch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Matchmaking Controller
 * Requirements: 7.1, 7.9, 7.11
 * 
 * Handles HTTP endpoints for matchmaking queue operations
 */
@Controller('matchmaking')
@UseGuards(JwtAuthGuard)
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  /**
   * Join matchmaking queue
   * POST /api/matchmaking/queue
   * Requirements: 7.1
   */
  @Post('queue')
  @HttpCode(HttpStatus.OK)
  async joinQueue(
    @CurrentUser('sub') userId: string,
    @Body() dto: JoinQueueDto,
  ): Promise<QueueStatus> {
    return this.matchmakingService.joinQueue(
      userId,
      dto.timeControl,
      dto.ratingRange,
    );
  }

  /**
   * Leave matchmaking queue
   * DELETE /api/matchmaking/queue
   * Requirements: 7.11
   */
  @Delete('queue')
  @HttpCode(HttpStatus.OK)
  async leaveQueue(
    @CurrentUser('sub') userId: string,
  ): Promise<{ success: boolean }> {
    const removed = await this.matchmakingService.leaveQueue(userId);
    return { success: removed };
  }

  /**
   * Get queue status
   * GET /api/matchmaking/status
   * Requirements: 7.9
   */
  @Get('status')
  async getStatus(@CurrentUser('sub') userId: string): Promise<QueueStatus> {
    const timeControl = await this.matchmakingService.getUserQueue(userId);
    if (!timeControl) {
      return {
        position: 0,
        waitTimeSeconds: 0,
        queueSize: 0,
      };
    }

    return this.matchmakingService.getQueueStatus(userId, timeControl as any);
  }

  /**
   * Create a direct challenge
   * POST /api/matchmaking/challenges
   * Requirements: 7.4
   */
  @Post('challenges')
  @HttpCode(HttpStatus.CREATED)
  async createChallenge(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateChallengeDto,
  ): Promise<Challenge> {
    return this.matchmakingService.createChallenge(
      userId,
      dto.receiverId,
      dto.timeControl,
      dto.initialTimeMinutes,
      dto.incrementSeconds,
      dto.isRated,
    );
  }

  /**
   * Accept a challenge
   * POST /api/matchmaking/challenges/:id/accept
   * Requirements: 7.6
   */
  @Post('challenges/:id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptChallenge(
    @CurrentUser('sub') userId: string,
    @Param('id') challengeId: string,
  ): Promise<any> {
    return this.matchmakingService.acceptChallenge(challengeId, userId);
  }

  /**
   * Decline a challenge
   * POST /api/matchmaking/challenges/:id/decline
   * Requirements: 7.6
   */
  @Post('challenges/:id/decline')
  @HttpCode(HttpStatus.OK)
  async declineChallenge(
    @CurrentUser('sub') userId: string,
    @Param('id') challengeId: string,
  ): Promise<{ success: boolean }> {
    await this.matchmakingService.declineChallenge(challengeId, userId);
    return { success: true };
  }

  /**
   * Get received challenges
   * GET /api/matchmaking/challenges/received
   * Requirements: 7.5
   */
  @Get('challenges/received')
  async getReceivedChallenges(
    @CurrentUser('sub') userId: string,
  ): Promise<Challenge[]> {
    return this.matchmakingService.getReceivedChallenges(userId);
  }

  /**
   * Get sent challenges
   * GET /api/matchmaking/challenges/sent
   * Requirements: 7.5
   */
  @Get('challenges/sent')
  async getSentChallenges(
    @CurrentUser('sub') userId: string,
  ): Promise<Challenge[]> {
    return this.matchmakingService.getSentChallenges(userId);
  }

  /**
   * Create a rematch offer
   * POST /api/games/:gameId/rematch
   * Requirements: 7.8
   */
  @Post('games/:gameId/rematch')
  @HttpCode(HttpStatus.CREATED)
  async createRematchOffer(
    @CurrentUser('sub') userId: string,
    @Param('gameId') gameId: string,
  ): Promise<RematchOffer> {
    return this.matchmakingService.createRematchOffer(gameId, userId);
  }

  /**
   * Accept a rematch offer
   * POST /api/games/:gameId/rematch/accept
   * Requirements: 7.8
   */
  @Post('games/:gameId/rematch/accept')
  @HttpCode(HttpStatus.OK)
  async acceptRematchOffer(
    @CurrentUser('sub') userId: string,
    @Body() dto: { rematchId: string },
  ): Promise<any> {
    return this.matchmakingService.acceptRematchOffer(dto.rematchId, userId);
  }

  /**
   * Decline a rematch offer
   * POST /api/games/:gameId/rematch/decline
   * Requirements: 7.8
   */
  @Post('games/:gameId/rematch/decline')
  @HttpCode(HttpStatus.OK)
  async declineRematchOffer(
    @CurrentUser('sub') userId: string,
    @Body() dto: { rematchId: string },
  ): Promise<{ success: boolean }> {
    await this.matchmakingService.declineRematchOffer(dto.rematchId, userId);
    return { success: true };
  }

  /**
   * Get received rematch offers
   * GET /api/matchmaking/rematches/received
   * Requirements: 7.8
   */
  @Get('rematches/received')
  async getReceivedRematchOffers(
    @CurrentUser('sub') userId: string,
  ): Promise<RematchOffer[]> {
    return this.matchmakingService.getReceivedRematchOffers(userId);
  }

  /**
   * Get sent rematch offers
   * GET /api/matchmaking/rematches/sent
   * Requirements: 7.8
   */
  @Get('rematches/sent')
  async getSentRematchOffers(
    @CurrentUser('sub') userId: string,
  ): Promise<RematchOffer[]> {
    return this.matchmakingService.getSentRematchOffers(userId);
  }
}
