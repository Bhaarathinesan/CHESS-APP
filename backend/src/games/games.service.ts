import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PgnParserService,
  ParsedGame,
  PgnParseError,
} from '../chess/pgn-parser.service';
import { PgnFormatterService } from '../chess/pgn-formatter.service';
import { RatingsService } from '../ratings/ratings.service';
import { CreateGameDto } from './dto/create-game.dto';
import { GameResponseDto, PlayerDto } from './dto/game-response.dto';
import { RecordGameResultDto } from './dto/record-game-result.dto';
import {
  GameHistoryQueryDto,
  GameHistoryResponseDto,
} from './dto/game-history-query.dto';
import { TimeControl } from '@prisma/client';

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pgnParser: PgnParserService,
    private readonly pgnFormatter: PgnFormatterService,
    private readonly ratingsService: RatingsService,
  ) {}

  /**
   * Create a new game
   * @param createGameDto Game creation data
   * @param creatorId User ID of the creator
   * @returns Created game with player details
   */
  async createGame(
    createGameDto: CreateGameDto,
    creatorId: string,
  ): Promise<GameResponseDto> {
    const {
      whitePlayerId,
      blackPlayerId,
      timeControl,
      initialTimeMinutes,
      incrementSeconds,
      isRated = true,
      tournamentId,
    } = createGameDto;

    // Validate time control settings
    this.validateTimeControl(timeControl, initialTimeMinutes, incrementSeconds);

    // Determine players
    const white = whitePlayerId || creatorId;
    const black = blackPlayerId || null;

    // Validate players exist
    if (white) {
      const whitePlayer = await this.prisma.user.findUnique({
        where: { id: white },
      });
      if (!whitePlayer) {
        throw new BadRequestException('White player not found');
      }
    }

    if (black) {
      const blackPlayer = await this.prisma.user.findUnique({
        where: { id: black },
      });
      if (!blackPlayer) {
        throw new BadRequestException('Black player not found');
      }

      // Prevent playing against yourself
      if (white === black) {
        throw new BadRequestException('Cannot create game against yourself');
      }
    }

    // Validate tournament if specified
    if (tournamentId) {
      const tournament = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
      });
      if (!tournament) {
        throw new BadRequestException('Tournament not found');
      }
    }

    // Get current ratings for both players if rated game
    let whiteRating = null;
    let blackRating = null;

    if (isRated && white && black) {
      const whiteRatingRecord = await this.prisma.rating.findUnique({
        where: {
          userId_timeControl: {
            userId: white,
            timeControl,
          },
        },
      });
      whiteRating = whiteRatingRecord?.rating || 1200;

      const blackRatingRecord = await this.prisma.rating.findUnique({
        where: {
          userId_timeControl: {
            userId: black,
            timeControl,
          },
        },
      });
      blackRating = blackRatingRecord?.rating || 1200;
    }

    // Calculate initial time in milliseconds
    const initialTimeMs = initialTimeMinutes * 60 * 1000;

    // Create the game
    const game = await this.prisma.game.create({
      data: {
        whitePlayerId: white,
        blackPlayerId: black || white, // Temporary placeholder if no black player
        timeControl,
        initialTimeMinutes,
        incrementSeconds,
        isRated,
        tournamentId,
        status: black ? 'PENDING' : 'PENDING', // PENDING until both players join
        whiteTimeRemaining: initialTimeMs,
        blackTimeRemaining: initialTimeMs,
        whiteRatingBefore: whiteRating,
        blackRatingBefore: blackRating,
      },
      include: {
        whitePlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.mapGameToResponse(game, whiteRating, blackRating);
  }

  /**
   * Get a game by ID with full details
   * @param gameId Game ID
   * @param userId User ID requesting the game (for authorization)
   * @returns Game with moves and player details
   */
  async getGameById(
    gameId: string,
    userId?: string,
  ): Promise<GameResponseDto> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        whitePlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        moves: {
          orderBy: [{ moveNumber: 'asc' }, { color: 'asc' }],
        },
      },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    // Get current ratings
    const whiteRating = await this.getCurrentRating(
      game.whitePlayerId,
      game.timeControl,
    );
    const blackRating = await this.getCurrentRating(
      game.blackPlayerId,
      game.timeControl,
    );

    return this.mapGameToResponse(game, whiteRating, blackRating);
  }

  /**
   * Get active games for a user
   * @param userId User ID
   * @returns List of active games
   */
  async getActiveGames(userId: string): Promise<GameResponseDto[]> {
    const games = await this.prisma.game.findMany({
      where: {
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        status: {
          in: ['PENDING', 'ACTIVE'],
        },
      },
      include: {
        whitePlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Promise.all(
      games.map(async (game) => {
        const whiteRating = await this.getCurrentRating(
          game.whitePlayerId,
          game.timeControl,
        );
        const blackRating = await this.getCurrentRating(
          game.blackPlayerId,
          game.timeControl,
        );
        return this.mapGameToResponse(game, whiteRating, blackRating);
      }),
    );
  }

  /**
   * Record game result and save complete game record
   * Requirements: 6.12, 4.12
   * @param gameId Game ID
   * @param recordGameResultDto Game result data with moves
   * @returns Updated game
   */
  async recordGameResult(
    gameId: string,
    recordGameResultDto: RecordGameResultDto,
  ): Promise<GameResponseDto> {
    const { result, terminationReason, moves, finalFen, openingName } =
      recordGameResultDto;

    // Get the game
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        whitePlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    if (game.status === 'COMPLETED') {
      throw new BadRequestException('Game is already completed');
    }

    // Save all moves with timestamps
    if (moves && moves.length > 0) {
      await this.prisma.gameMove.createMany({
        data: moves.map((move) => ({
          gameId,
          moveNumber: move.moveNumber,
          color: move.color,
          san: move.san,
          uci: move.uci,
          fenAfter: move.fenAfter,
          timeTakenMs: move.timeTakenMs,
          timeRemainingMs: move.timeRemainingMs,
          isCheck: move.isCheck || false,
          isCheckmate: move.isCheckmate || false,
          isCapture: move.isCapture || false,
          isCastling: move.isCastling || false,
          isEnPassant: move.isEnPassant || false,
          isPromotion: move.isPromotion || false,
          promotionPiece: move.promotionPiece || null,
        })),
        skipDuplicates: true,
      });
    }

    // Generate PGN from game data
    const pgn = await this.generatePgnForGame(game, moves);

    // Update game with result
    const updatedGame = await this.prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'COMPLETED',
        result,
        terminationReason,
        pgn,
        fenCurrent: finalFen || game.fenCurrent,
        moveCount: moves.length,
        openingName: openingName || game.openingName,
        completedAt: new Date(),
      },
      include: {
        whitePlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update ratings if the game is rated
    if (updatedGame.isRated && result) {
      try {
        // Update ratings for both players
        await this.ratingsService.updateRatingsAfterGame({
          userId: updatedGame.whitePlayerId,
          opponentId: updatedGame.blackPlayerId,
          timeControl: updatedGame.timeControl,
          result,
          gameId: updatedGame.id,
        });
      } catch (error) {
        // Log error but don't fail the game completion
        console.error('Failed to update ratings:', error);
      }
    }

    const whiteRating = await this.getCurrentRating(
      updatedGame.whitePlayerId,
      updatedGame.timeControl,
    );
    const blackRating = await this.getCurrentRating(
      updatedGame.blackPlayerId,
      updatedGame.timeControl,
    );

    return this.mapGameToResponse(updatedGame, whiteRating, blackRating);
  }

  /**
   * Generate PGN for a game
   */
  private async generatePgnForGame(
    game: any,
    moves: any[],
  ): Promise<string> {
    const headers: Record<string, string> = {
      Event: game.tournament?.name || 'Casual Game',
      Site: 'ChessArena',
      Date: game.startedAt
        ? game.startedAt.toISOString().split('T')[0].replace(/-/g, '.')
        : new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      Round: game.tournament ? '?' : '-',
      White: game.whitePlayer.displayName || game.whitePlayer.username,
      Black: game.blackPlayer.displayName || game.blackPlayer.username,
      Result: this.mapGameResultToPgnResult(game.result),
    };

    // Add optional headers
    if (game.whiteRatingBefore) {
      headers['WhiteElo'] = game.whiteRatingBefore.toString();
    }
    if (game.blackRatingBefore) {
      headers['BlackElo'] = game.blackRatingBefore.toString();
    }
    if (game.openingName) {
      headers['Opening'] = game.openingName;
    }
    if (game.timeControl) {
      headers['TimeControl'] =
        `${game.initialTimeMinutes * 60}+${game.incrementSeconds}`;
    }

    const parsedGame: ParsedGame = {
      headers,
      moves: moves.map((m) => m.san),
      comments: {},
      variations: {},
      result: headers['Result'],
    };

    return this.pgnFormatter.formatGame(parsedGame);
  }

  /**
   * Validate time control settings
   */
  private validateTimeControl(
    timeControl: TimeControl,
    initialTimeMinutes: number,
    incrementSeconds: number,
  ): void {
    // Validate time control ranges
    const validTimeControls: Record<
      TimeControl,
      { minTime: number; maxTime: number }
    > = {
      BULLET: { minTime: 1, maxTime: 3 },
      BLITZ: { minTime: 3, maxTime: 10 },
      RAPID: { minTime: 10, maxTime: 30 },
      CLASSICAL: { minTime: 30, maxTime: 180 },
    };

    const range = validTimeControls[timeControl];
    if (
      initialTimeMinutes < range.minTime ||
      initialTimeMinutes > range.maxTime
    ) {
      throw new BadRequestException(
        `Invalid time for ${timeControl}: must be between ${range.minTime} and ${range.maxTime} minutes`,
      );
    }

    if (incrementSeconds < 0 || incrementSeconds > 60) {
      throw new BadRequestException(
        'Increment must be between 0 and 60 seconds',
      );
    }
  }

  /**
   * Get current rating for a user and time control
   */
  private async getCurrentRating(
    userId: string,
    timeControl: TimeControl,
  ): Promise<number | null> {
    const rating = await this.prisma.rating.findUnique({
      where: {
        userId_timeControl: {
          userId,
          timeControl,
        },
      },
    });
    return rating?.rating || null;
  }

  /**
   * Map database game to response DTO
   */
  private mapGameToResponse(
    game: any,
    whiteRating: number | null,
    blackRating: number | null,
  ): GameResponseDto {
    return {
      id: game.id,
      whitePlayer: {
        id: game.whitePlayer.id,
        username: game.whitePlayer.username,
        displayName: game.whitePlayer.displayName,
        avatarUrl: game.whitePlayer.avatarUrl,
        rating: whiteRating,
      },
      blackPlayer: {
        id: game.blackPlayer.id,
        username: game.blackPlayer.username,
        displayName: game.blackPlayer.displayName,
        avatarUrl: game.blackPlayer.avatarUrl,
        rating: blackRating,
      },
      timeControl: game.timeControl,
      initialTimeMinutes: game.initialTimeMinutes,
      incrementSeconds: game.incrementSeconds,
      isRated: game.isRated,
      status: game.status,
      result: game.result,
      terminationReason: game.terminationReason,
      fenCurrent: game.fenCurrent,
      moveCount: game.moveCount,
      whiteTimeRemaining: game.whiteTimeRemaining,
      blackTimeRemaining: game.blackTimeRemaining,
      whiteRatingBefore: game.whiteRatingBefore,
      blackRatingBefore: game.blackRatingBefore,
      whiteRatingAfter: game.whiteRatingAfter,
      blackRatingAfter: game.blackRatingAfter,
      openingName: game.openingName,
      spectatorCount: game.spectatorCount,
      startedAt: game.startedAt,
      completedAt: game.completedAt,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }

  /**
   * Get game history for a user with pagination and filtering
   * Requirements: 14.8
   * @param userId User ID
   * @param query Query parameters for filtering and pagination
   * @returns Paginated game history
   */
  async getUserGameHistory(
    userId: string,
    query: GameHistoryQueryDto,
  ): Promise<GameHistoryResponseDto> {
    const {
      page = 1,
      limit = 20,
      opponentId,
      result,
      timeControl,
      dateFrom,
      dateTo,
    } = query;

    // Build where clause
    const where: any = {
      OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      status: 'COMPLETED',
    };

    // Filter by opponent
    if (opponentId) {
      where.OR = [
        { whitePlayerId: userId, blackPlayerId: opponentId },
        { blackPlayerId: userId, whitePlayerId: opponentId },
      ];
    }

    // Filter by result (from user's perspective)
    if (result) {
      if (result === 'WHITE_WIN') {
        where.OR = [
          { whitePlayerId: userId, result: 'WHITE_WIN' },
          { blackPlayerId: userId, result: 'BLACK_WIN' },
        ];
      } else if (result === 'BLACK_WIN') {
        where.OR = [
          { whitePlayerId: userId, result: 'BLACK_WIN' },
          { blackPlayerId: userId, result: 'WHITE_WIN' },
        ];
      } else if (result === 'DRAW') {
        where.result = 'DRAW';
      }
    }

    // Filter by time control
    if (timeControl) {
      where.timeControl = timeControl;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      where.completedAt = {};
      if (dateFrom) {
        where.completedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.completedAt.lte = new Date(dateTo);
      }
    }

    // Get total count
    const total = await this.prisma.game.count({ where });

    // Get paginated games
    const games = await this.prisma.game.findMany({
      where,
      include: {
        whitePlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Map games to response format
    const gamesWithRatings = await Promise.all(
      games.map(async (game) => {
        const whiteRating = await this.getCurrentRating(
          game.whitePlayerId,
          game.timeControl,
        );
        const blackRating = await this.getCurrentRating(
          game.blackPlayerId,
          game.timeControl,
        );
        return this.mapGameToResponse(game, whiteRating, blackRating);
      }),
    );

    return {
      games: gamesWithRatings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Import games from PGN text
   * Parses PGN and creates game records in the database
   * @param pgnText PGN text containing one or more games
   * @param userId User ID of the uploader
   * @returns Array of created game IDs
   */
  async importFromPgn(
    pgnText: string,
    userId: string,
  ): Promise<{ gameIds: string[]; count: number }> {
    try {
      // Parse the PGN text
      const parsedGames = this.pgnParser.parseMultipleGames(pgnText);

      // Validate all games before importing
      for (const game of parsedGames) {
        this.pgnParser.validateGame(game);
      }

      // Create game records in database
      const gameIds: string[] = [];

      for (const parsedGame of parsedGames) {
        const gameId = await this.createGameFromParsedPgn(parsedGame, userId);
        gameIds.push(gameId);
      }

      return {
        gameIds,
        count: gameIds.length,
      };
    } catch (error) {
      if (error instanceof PgnParseError) {
        throw new BadRequestException(
          `PGN parsing failed: ${error.message}`,
        );
      }
      // Wrap any other error in BadRequestException
      throw new BadRequestException(
        `Failed to import PGN: ${error.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Export a single game as PGN
   * @param gameId Game ID to export
   * @param userId User ID requesting the export (for authorization)
   * @returns PGN formatted string
   */
  async exportGameAsPgn(gameId: string, userId: string): Promise<string> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        whitePlayer: true,
        blackPlayer: true,
        moves: {
          orderBy: [{ moveNumber: 'asc' }, { color: 'asc' }],
        },
      },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    // Check if user has access to this game
    // Users can view their own games or any completed game
    if (
      game.status !== 'COMPLETED' &&
      game.whitePlayerId !== userId &&
      game.blackPlayerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to export this game',
      );
    }

    // If game already has PGN stored, return it
    if (game.pgn) {
      return game.pgn;
    }

    // Otherwise, generate PGN from game data
    const parsedGame = this.convertGameToParsedGame(game);
    return this.pgnFormatter.formatGame(parsedGame);
  }

  /**
   * Export multiple games as a single PGN file
   * @param gameIds Array of game IDs to export
   * @param userId User ID requesting the export (for authorization)
   * @returns PGN formatted string with all games
   */
  async exportMultipleGamesAsPgn(
    gameIds: string[],
    userId: string,
  ): Promise<string> {
    if (gameIds.length === 0) {
      throw new BadRequestException('No game IDs provided');
    }

    const games = await this.prisma.game.findMany({
      where: {
        id: { in: gameIds },
      },
      include: {
        whitePlayer: true,
        blackPlayer: true,
        moves: {
          orderBy: [{ moveNumber: 'asc' }, { color: 'asc' }],
        },
      },
    });

    if (games.length === 0) {
      throw new NotFoundException('No games found with the provided IDs');
    }

    // Check authorization for each game
    for (const game of games) {
      if (
        game.status !== 'COMPLETED' &&
        game.whitePlayerId !== userId &&
        game.blackPlayerId !== userId
      ) {
        throw new ForbiddenException(
          `You do not have permission to export game ${game.id}`,
        );
      }
    }

    // Convert games to ParsedGame format
    const parsedGames = games.map((game) =>
      this.convertGameToParsedGame(game),
    );

    // Format all games as a single PGN
    return this.pgnFormatter.formatMultipleGames(parsedGames);
  }

  /**
   * Create a game record from parsed PGN data
   * @param parsedGame Parsed PGN game object
   * @param uploaderId User ID of the uploader
   * @returns Created game ID
   */
  private async createGameFromParsedPgn(
    parsedGame: ParsedGame,
    uploaderId: string,
  ): Promise<string> {
    const headers = parsedGame.headers;

    // Determine time control from headers or use default
    const timeControl = this.extractTimeControl(headers);

    // Determine result
    const result = this.mapPgnResultToGameResult(
      headers['Result'] || parsedGame.result,
    );

    // For imported games, we'll use the uploader as both players if actual players don't exist
    // In a real implementation, you might want to create placeholder users or link to existing users
    const whitePlayerId = uploaderId;
    const blackPlayerId = uploaderId;

    // Create the game record
    const game = await this.prisma.game.create({
      data: {
        whitePlayerId,
        blackPlayerId,
        timeControl,
        initialTimeMinutes: 10, // Default values for imported games
        incrementSeconds: 0,
        isRated: false, // Imported games are not rated
        status: 'COMPLETED',
        result,
        terminationReason: 'imported',
        pgn: this.pgnFormatter.formatGame(parsedGame),
        moveCount: parsedGame.moves.length,
        startedAt: this.parsePgnDate(headers['Date']),
        completedAt: this.parsePgnDate(headers['Date']),
      },
    });

    // Create move records
    await this.createMovesFromParsedGame(game.id, parsedGame);

    return game.id;
  }

  /**
   * Convert a database game record to ParsedGame format
   */
  private convertGameToParsedGame(game: any): ParsedGame {
    const headers: Record<string, string> = {
      Event: game.tournament?.name || 'Casual Game',
      Site: 'ChessArena',
      Date: game.startedAt
        ? game.startedAt.toISOString().split('T')[0].replace(/-/g, '.')
        : '????.??.??',
      Round: game.tournament ? '?' : '-',
      White: game.whitePlayer.displayName || game.whitePlayer.username,
      Black: game.blackPlayer.displayName || game.blackPlayer.username,
      Result: this.mapGameResultToPgnResult(game.result),
    };

    // Add optional headers
    if (game.whiteRatingBefore) {
      headers['WhiteElo'] = game.whiteRatingBefore.toString();
    }
    if (game.blackRatingBefore) {
      headers['BlackElo'] = game.blackRatingBefore.toString();
    }
    if (game.openingName) {
      headers['Opening'] = game.openingName;
    }
    if (game.timeControl) {
      headers['TimeControl'] =
        `${game.initialTimeMinutes * 60}+${game.incrementSeconds}`;
    }

    // Extract moves from game moves
    const moves = game.moves.map((move: any) => move.san);

    return {
      headers,
      moves,
      comments: {},
      variations: {},
      result: headers['Result'],
    };
  }

  /**
   * Create move records from parsed PGN game
   */
  private async createMovesFromParsedGame(
    gameId: string,
    parsedGame: ParsedGame,
  ): Promise<void> {
    const moveRecords = [];
    let moveNumber = 1;
    let isWhiteMove = true;

    for (let i = 0; i < parsedGame.moves.length; i++) {
      const san = parsedGame.moves[i];

      moveRecords.push({
        gameId,
        moveNumber,
        color: isWhiteMove ? 'white' : 'black',
        san,
        uci: '', // Would need chess.js to convert SAN to UCI
        fenAfter: '', // Would need to replay game to get FEN
        timeTakenMs: 0,
        timeRemainingMs: 0,
        isCheck: san.includes('+'),
        isCheckmate: san.includes('#'),
        isCapture: san.includes('x'),
        isCastling: san === 'O-O' || san === 'O-O-O',
        isEnPassant: false,
        isPromotion: san.includes('='),
        promotionPiece: san.includes('=')
          ? san.split('=')[1].toLowerCase()
          : null,
      });

      if (!isWhiteMove) {
        moveNumber++;
      }
      isWhiteMove = !isWhiteMove;
    }

    // Batch create all moves
    if (moveRecords.length > 0) {
      await this.prisma.gameMove.createMany({
        data: moveRecords,
      });
    }
  }

  /**
   * Extract time control from PGN headers
   */
  private extractTimeControl(headers: Record<string, string>): TimeControl {
    // Try to determine from TimeControl header if present
    if (headers['TimeControl']) {
      const timeControl = headers['TimeControl'];
      const [baseTime] = timeControl.split('+');
      const minutes = parseInt(baseTime) / 60;

      if (minutes <= 3) return TimeControl.BULLET;
      if (minutes <= 10) return TimeControl.BLITZ;
      if (minutes <= 30) return TimeControl.RAPID;
      return TimeControl.CLASSICAL;
    }

    // Default to RAPID
    return TimeControl.RAPID;
  }

  /**
   * Map PGN result string to database GameResult enum
   */
  private mapPgnResultToGameResult(
    pgnResult: string | undefined,
  ): 'WHITE_WIN' | 'BLACK_WIN' | 'DRAW' | null {
    switch (pgnResult) {
      case '1-0':
        return 'WHITE_WIN';
      case '0-1':
        return 'BLACK_WIN';
      case '1/2-1/2':
        return 'DRAW';
      case '*':
      default:
        return null;
    }
  }

  /**
   * Map database GameResult enum to PGN result string
   */
  private mapGameResultToPgnResult(result: string | null): string {
    switch (result) {
      case 'WHITE_WIN':
        return '1-0';
      case 'BLACK_WIN':
        return '0-1';
      case 'DRAW':
        return '1/2-1/2';
      default:
        return '*';
    }
  }

  /**
   * Parse PGN date string to Date object
   */
  private parsePgnDate(dateStr: string): Date | null {
    if (!dateStr || dateStr === '????.??.??') {
      return null;
    }

    try {
      const [year, month, day] = dateStr.split('.').map((s) => parseInt(s));
      if (year && month && day) {
        return new Date(year, month - 1, day);
      }
    } catch (error) {
      // Invalid date format
    }

    return null;
  }
}
