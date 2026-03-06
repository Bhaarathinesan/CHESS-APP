import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Header,
  Put,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadPgnDto } from './dto/upload-pgn.dto';
import { DownloadMultiplePgnDto } from './dto/download-multiple-pgn.dto';
import { CreateGameDto } from './dto/create-game.dto';
import { RecordGameResultDto } from './dto/record-game-result.dto';
import { GameHistoryQueryDto } from './dto/game-history-query.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  /**
   * Get a game by ID (public endpoint for completed games)
   * GET /api/games/:id/public
   * Requirements: 14.11
   */
  @Get(':id/public')
  async getPublicGame(@Param('id') gameId: string) {
    const game = await this.gamesService.getPublicGame(gameId);
    return game;
  }

  /**
   * Get moves for a game (public endpoint)
   * GET /api/games/:id/public/moves
   * Requirements: 14.11
   */
  @Get(':id/public/moves')
  async getPublicGameMoves(@Param('id') gameId: string) {
    const moves = await this.gamesService.getPublicGameMoves(gameId);
    return moves;
  }

  /**
   * Create a new game
   * POST /api/games
   * Requirements: 7.3
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createGame(@Body() createGameDto: CreateGameDto, @Req() req: any) {
    const userId = req.user.userId;
    const game = await this.gamesService.createGame(createGameDto, userId);
    return game;
  }

  /**
   * Get a game by ID
   * GET /api/games/:id
   * Requirements: 14.7
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getGame(@Param('id') gameId: string, @Req() req: any) {
    const userId = req.user?.userId;
    const game = await this.gamesService.getGameById(gameId, userId);
    return game;
  }

  /**
   * Get moves for a game
   * GET /api/games/:id/moves
   * Requirements: 14.9
   */
  @Get(':id/moves')
  @UseGuards(JwtAuthGuard)
  async getGameMoves(@Param('id') gameId: string, @Req() req: any) {
    const moves = await this.gamesService.getGameMoves(gameId);
    return moves;
  }

  /**
   * Get active games for the current user
   * GET /api/games/active
   * Requirements: 14.7
   */
  @Get('active/me')
  @UseGuards(JwtAuthGuard)
  async getActiveGames(@Req() req: any) {
    const userId = req.user.userId;
    const games = await this.gamesService.getActiveGames(userId);
    return games;
  }

  /**
   * Record game result
   * PUT /api/games/:id/result
   * Requirements: 6.12, 4.12
   */
  @Put(':id/result')
  async recordGameResult(
    @Param('id') gameId: string,
    @Body() recordGameResultDto: RecordGameResultDto,
    @Req() req: any,
  ) {
    const game = await this.gamesService.recordGameResult(
      gameId,
      recordGameResultDto,
    );
    return game;
  }

  /**
   * Get game history for a user
   * GET /api/users/:userId/games
   * Requirements: 14.8
   */
  @Get('users/:userId/history')
  async getUserGameHistory(
    @Param('userId') userId: string,
    @Query() query: GameHistoryQueryDto,
  ) {
    const history = await this.gamesService.getUserGameHistory(userId, query);
    return history;
  }

  /**
   * Upload PGN file to import games
   * POST /api/games/import-pgn
   * Requirements: 28.11
   */
  @Post('import-pgn')
  @HttpCode(HttpStatus.CREATED)
  async uploadPgn(@Body() uploadPgnDto: UploadPgnDto, @Req() req: any) {
    const userId = req.user.userId;
    const result = await this.gamesService.importFromPgn(
      uploadPgnDto.pgnText,
      userId,
    );

    return {
      message: `Successfully imported ${result.count} game(s)`,
      gameIds: result.gameIds,
      count: result.count,
    };
  }

  /**
   * Download a single game as PGN
   * GET /api/games/:id/pgn
   * Requirements: 28.12
   */
  @Get(':id/pgn')
  @Header('Content-Type', 'application/x-chess-pgn')
  @Header('Content-Disposition', 'attachment; filename="game.pgn"')
  async downloadGamePgn(@Param('id') gameId: string, @Req() req: any) {
    const userId = req.user.userId;
    const pgn = await this.gamesService.exportGameAsPgn(gameId, userId);
    return pgn;
  }

  /**
   * Download multiple games as a single PGN file
   * POST /api/games/export-pgn
   * Requirements: 28.13
   */
  @Post('export-pgn')
  @Header('Content-Type', 'application/x-chess-pgn')
  @Header('Content-Disposition', 'attachment; filename="games.pgn"')
  async downloadMultipleGamesPgn(
    @Body() downloadMultiplePgnDto: DownloadMultiplePgnDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const pgn = await this.gamesService.exportMultipleGamesAsPgn(
      downloadMultiplePgnDto.gameIds,
      userId,
    );
    return pgn;
  }

  /**
   * Alternative endpoint using query parameters for multiple games
   * GET /api/games/export-pgn?gameIds=id1,id2,id3
   * Requirements: 28.13
   */
  @Get('export-pgn')
  @Header('Content-Type', 'application/x-chess-pgn')
  @Header('Content-Disposition', 'attachment; filename="games.pgn"')
  async downloadMultipleGamesPgnQuery(
    @Query('gameIds') gameIds: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const gameIdArray = gameIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    const pgn = await this.gamesService.exportMultipleGamesAsPgn(
      gameIdArray,
      userId,
    );
    return pgn;
  }

  /**
   * Request game analysis
   * POST /api/games/:id/analyze
   * Requirements: 15.2
   * Note: Analysis is performed client-side, this endpoint queues the request
   */
  @Post(':id/analyze')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async requestAnalysis(@Param('id') gameId: string, @Req() req: any) {
    const userId = req.user.userId;
    const result = await this.gamesService.requestAnalysis(gameId, userId);
    return result;
  }

  /**
   * Get game analysis status
   * GET /api/games/:id/analysis
   * Requirements: 15.2
   */
  @Get(':id/analysis')
  @UseGuards(JwtAuthGuard)
  async getAnalysis(@Param('id') gameId: string, @Req() req: any) {
    const userId = req.user.userId;
    const analysis = await this.gamesService.getAnalysis(gameId, userId);
    return analysis;
  }

  /**
   * Save game analysis results
   * PUT /api/games/:id/analysis
   * Requirements: 15.2
   */
  @Put(':id/analysis')
  @UseGuards(JwtAuthGuard)
  async saveAnalysis(
    @Param('id') gameId: string,
    @Body() analysisData: any,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const result = await this.gamesService.saveAnalysis(gameId, userId, analysisData);
    return result;
  }

}
