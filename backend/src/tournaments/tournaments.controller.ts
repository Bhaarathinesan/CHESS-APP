import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { TournamentsService } from './tournaments.service';
import { StandingsService } from './standings.service';
import { TournamentExportService } from './tournament-export.service';
import { TournamentAwardsService } from './tournament-awards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentQueryDto } from './dto/tournament-query.dto';
import { AwardConfigDto } from './dto/tournament-award.dto';

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly standingsService: StandingsService,
    private readonly exportService: TournamentExportService,
    private readonly awardsService: TournamentAwardsService,
  ) {}

  /**
   * Create a new tournament
   * POST /api/tournaments
   * Requirements: 9.1-9.6, 9.16
   * Only Tournament_Admin and Super_Admin can create tournaments
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TOURNAMENT_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createTournament(
    @Body() createTournamentDto: CreateTournamentDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const tournament = await this.tournamentsService.createTournament(
      createTournamentDto,
      userId,
    );
    return tournament;
  }

  /**
   * Get all tournaments with filtering and pagination
   * GET /api/tournaments
   * Requirements: 9.1
   */
  @Get()
  async getTournaments(@Query() query: TournamentQueryDto) {
    return this.tournamentsService.getTournaments(query);
  }

  /**
   * Get tournament by ID with full details
   * GET /api/tournaments/:id
   * Requirements: 9.1
   */
  @Get(':id')
  async getTournamentById(@Param('id') tournamentId: string) {
    return this.tournamentsService.getTournamentById(tournamentId, true);
  }

  /**
   * Get tournament by share link
   * GET /api/tournaments/share/:shareLink
   * Requirements: 9.16
   */
  @Get('share/:shareLink')
  async getTournamentByShareLink(@Param('shareLink') shareLink: string) {
    return this.tournamentsService.getTournamentByShareLink(shareLink);
  }

  /**
   * Update tournament details
   * PUT /api/tournaments/:id
   * Requirements: 9.1
   * Only tournament creator or Super_Admin can update
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TOURNAMENT_ADMIN', 'SUPER_ADMIN')
  async updateTournament(
    @Param('id') tournamentId: string,
    @Body() updateTournamentDto: UpdateTournamentDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.tournamentsService.updateTournament(
      tournamentId,
      updateTournamentDto,
      userId,
    );
  }

  /**
   * Join a tournament
   * POST /api/tournaments/:id/join
   * Requirements: 10.2, 10.12
   */
  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async joinTournament(@Param('id') tournamentId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.tournamentsService.joinTournament(tournamentId, userId);
  }

  /**
   * Leave a tournament
   * DELETE /api/tournaments/:id/leave
   * Requirements: 10.2
   */
  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async leaveTournament(@Param('id') tournamentId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.tournamentsService.leaveTournament(tournamentId, userId);
  }

  /**
   * Start a tournament
   * POST /api/tournaments/:id/start
   * Requirements: 10.4, 10.13
   * Only tournament creator or Super_Admin can start
   */
  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TOURNAMENT_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async startTournament(@Param('id') tournamentId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.tournamentsService.startTournament(tournamentId, userId);
  }

  /**
   * Cancel a tournament
   * POST /api/tournaments/:id/cancel
   * Requirements: 10.8, 10.9
   * Only tournament creator or Super_Admin can cancel
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TOURNAMENT_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async cancelTournament(@Param('id') tournamentId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.tournamentsService.cancelTournament(tournamentId, userId);
  }

  /**
   * Pause a tournament round
   * POST /api/tournaments/:id/pause
   * Requirements: 10.10
   * Only tournament creator or Super_Admin can pause
   */
  @Post(':id/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TOURNAMENT_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async pauseTournament(@Param('id') tournamentId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.tournamentsService.pauseTournament(tournamentId, userId);
  }

  /**
   * Resume a paused tournament round
   * POST /api/tournaments/:id/resume
   * Requirements: 10.11
   * Only tournament creator or Super_Admin can resume
   */
  @Post(':id/resume')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TOURNAMENT_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async resumeTournament(@Param('id') tournamentId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.tournamentsService.resumeTournament(tournamentId, userId);
  }

  /**
   * Get tournament standings
   * GET /api/tournaments/:id/standings
   * Requirements: 12.1, 12.2, 12.3
   * Returns current standings ordered by rank
   */
  @Get(':id/standings')
  async getStandings(@Param('id') tournamentId: string) {
    return this.standingsService.getStandings(tournamentId);
  }

  /**
   * Get tournament pairings
   * GET /api/tournaments/:id/pairings
   * Requirements: 12.5, 12.6
   * Returns pairings for specified round or all rounds
   * Supports filtering by round number
   */
  @Get(':id/pairings')
  async getPairings(
    @Param('id') tournamentId: string,
    @Query('round') round?: string,
  ) {
    const roundNumber = round ? parseInt(round, 10) : undefined;
    return this.tournamentsService.getPairings(tournamentId, roundNumber);
  }

  /**
   * Export tournament results as CSV
   * GET /api/tournaments/:id/export/csv
   * Requirements: 12.9, 12.10
   * Returns CSV file download
   */
  @Get(':id/export/csv')
  async exportResultsAsCSV(
    @Param('id') tournamentId: string,
    @Res() res: Response,
  ) {
    const csvBuffer = await this.exportService.exportAsCSV(tournamentId);
    
    // Get tournament name for filename
    const tournament = await this.tournamentsService.getTournamentById(tournamentId, false);
    const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '_')}_results.csv`;

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': csvBuffer.length,
    });

    res.send(csvBuffer);
  }

  /**
   * Export tournament results as PDF
   * GET /api/tournaments/:id/export/pdf
   * Requirements: 12.9, 12.10
   * Returns PDF file download
   */
  @Get(':id/export/pdf')
  async exportResultsAsPDF(
    @Param('id') tournamentId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.exportService.exportAsPDF(tournamentId);
    
    // Get tournament name for filename
    const tournament = await this.tournamentsService.getTournamentById(tournamentId, false);
    const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '_')}_results.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  /**
   * Get tournament history for a player
   * GET /api/tournaments/history/:userId
   * Requirements: 12.11
   * Returns all tournaments a player has participated in with performance stats
   */
  @Get('history/:userId')
  async getTournamentHistory(
    @Param('userId') userId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const options = {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    return this.tournamentsService.getTournamentHistory(userId, options);
  }

  /**
   * Award prizes to top finishers
   * POST /api/tournaments/:id/awards
   * Requirements: 12.12
   * Only tournament creator or Super_Admin can award prizes
   */
  @Post(':id/awards')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TOURNAMENT_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async awardPrizes(
    @Param('id') tournamentId: string,
    @Body() awardConfigs: AwardConfigDto[],
    @Req() req: any,
  ) {
    return this.awardsService.awardPrizes(tournamentId, awardConfigs);
  }

  /**
   * Get tournament awards
   * GET /api/tournaments/:id/awards
   * Requirements: 12.12
   * Returns all awards for a tournament
   */
  @Get(':id/awards')
  async getTournamentAwards(@Param('id') tournamentId: string) {
    return this.awardsService.getTournamentAwards(tournamentId);
  }

  /**
   * Get user awards across all tournaments
   * GET /api/users/:userId/awards
   * Requirements: 12.12
   * Returns all awards earned by a user
   */
  @Get('users/:userId/awards')
  async getUserAwards(@Param('userId') userId: string) {
    return this.awardsService.getUserAwards(userId);
  }
}
