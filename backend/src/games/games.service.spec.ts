import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { PrismaService } from '../prisma/prisma.service';
import { PgnParserService } from '../chess/pgn-parser.service';
import { PgnFormatterService } from '../chess/pgn-formatter.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('GamesService', () => {
  let service: GamesService;
  let prismaService: PrismaService;
  let pgnParser: PgnParserService;
  let pgnFormatter: PgnFormatterService;

  const mockPrismaService = {
    game: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    gameMove: {
      createMany: jest.fn(),
    },
  };

  const mockPgnParser = {
    parseMultipleGames: jest.fn(),
    parseSingleGame: jest.fn(),
    validateGame: jest.fn(),
  };

  const mockPgnFormatter = {
    formatGame: jest.fn(),
    formatMultipleGames: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PgnParserService, useValue: mockPgnParser },
        { provide: PgnFormatterService, useValue: mockPgnFormatter },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    prismaService = module.get<PrismaService>(PrismaService);
    pgnParser = module.get<PgnParserService>(PgnParserService);
    pgnFormatter = module.get<PgnFormatterService>(PgnFormatterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('importFromPgn', () => {
    it('should successfully import a valid PGN', async () => {
      const pgnText = `[Event "Test Game"]
[Site "ChessArena"]
[Date "2024.01.01"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`;

      const parsedGame = {
        headers: {
          Event: 'Test Game',
          Site: 'ChessArena',
          Date: '2024.01.01',
          Round: '1',
          White: 'Player1',
          Black: 'Player2',
          Result: '1-0',
        },
        moves: ['e4', 'e5', 'Nf3', 'Nc6'],
        comments: {},
        variations: {},
        result: '1-0',
      };

      mockPgnParser.parseMultipleGames.mockReturnValue([parsedGame]);
      mockPgnParser.validateGame.mockReturnValue(true);
      mockPgnFormatter.formatGame.mockReturnValue(pgnText);
      mockPrismaService.game.create.mockResolvedValue({
        id: 'game-id-1',
      });
      mockPrismaService.gameMove.createMany.mockResolvedValue({ count: 4 });

      const result = await service.importFromPgn(pgnText, 'user-id-1');

      expect(result.count).toBe(1);
      expect(result.gameIds).toHaveLength(1);
      expect(mockPgnParser.parseMultipleGames).toHaveBeenCalledWith(pgnText);
      expect(mockPgnParser.validateGame).toHaveBeenCalledWith(parsedGame);
      expect(mockPrismaService.game.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid PGN', async () => {
      const invalidPgn = 'invalid pgn text';

      mockPgnParser.parseMultipleGames.mockImplementation(() => {
        throw new Error('Invalid PGN');
      });

      await expect(
        service.importFromPgn(invalidPgn, 'user-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should import multiple games from PGN', async () => {
      const pgnText = `[Event "Game 1"]
[Site "ChessArena"]
[Date "2024.01.01"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 1-0

[Event "Game 2"]
[Site "ChessArena"]
[Date "2024.01.02"]
[Round "2"]
[White "Player3"]
[Black "Player4"]
[Result "0-1"]

1. d4 d5 0-1`;

      const parsedGames = [
        {
          headers: {
            Event: 'Game 1',
            Site: 'ChessArena',
            Date: '2024.01.01',
            Round: '1',
            White: 'Player1',
            Black: 'Player2',
            Result: '1-0',
          },
          moves: ['e4', 'e5'],
          comments: {},
          variations: {},
          result: '1-0',
        },
        {
          headers: {
            Event: 'Game 2',
            Site: 'ChessArena',
            Date: '2024.01.02',
            Round: '2',
            White: 'Player3',
            Black: 'Player4',
            Result: '0-1',
          },
          moves: ['d4', 'd5'],
          comments: {},
          variations: {},
          result: '0-1',
        },
      ];

      mockPgnParser.parseMultipleGames.mockReturnValue(parsedGames);
      mockPgnParser.validateGame.mockReturnValue(true);
      mockPgnFormatter.formatGame.mockReturnValue(pgnText);
      mockPrismaService.game.create
        .mockResolvedValueOnce({ id: 'game-id-1' })
        .mockResolvedValueOnce({ id: 'game-id-2' });
      mockPrismaService.gameMove.createMany.mockResolvedValue({ count: 2 });

      const result = await service.importFromPgn(pgnText, 'user-id-1');

      expect(result.count).toBe(2);
      expect(result.gameIds).toHaveLength(2);
      expect(mockPrismaService.game.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('exportGameAsPgn', () => {
    it('should export a game as PGN', async () => {
      const gameId = 'game-id-1';
      const userId = 'user-id-1';

      const mockGame = {
        id: gameId,
        whitePlayerId: userId,
        blackPlayerId: 'user-id-2',
        status: 'COMPLETED',
        result: 'WHITE_WIN',
        pgn: null,
        timeControl: 'BLITZ',
        initialTimeMinutes: 5,
        incrementSeconds: 3,
        startedAt: new Date('2024-01-01'),
        whitePlayer: { displayName: 'Player1', username: 'player1' },
        blackPlayer: { displayName: 'Player2', username: 'player2' },
        moves: [
          { san: 'e4', color: 'white', moveNumber: 1 },
          { san: 'e5', color: 'black', moveNumber: 1 },
        ],
      };

      const expectedPgn = `[Event "Casual Game"]
[Site "ChessArena"]
[Date "2024.01.01"]
[Round "-"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 1-0`;

      mockPrismaService.game.findUnique.mockResolvedValue(mockGame);
      mockPgnFormatter.formatGame.mockReturnValue(expectedPgn);

      const result = await service.exportGameAsPgn(gameId, userId);

      expect(result).toBe(expectedPgn);
      expect(mockPrismaService.game.findUnique).toHaveBeenCalledWith({
        where: { id: gameId },
        include: {
          whitePlayer: true,
          blackPlayer: true,
          moves: {
            orderBy: [{ moveNumber: 'asc' }, { color: 'asc' }],
          },
        },
      });
    });

    it('should return stored PGN if available', async () => {
      const gameId = 'game-id-1';
      const userId = 'user-id-1';
      const storedPgn = '[Event "Test"]\n\n1. e4 e5 1-0';

      const mockGame = {
        id: gameId,
        whitePlayerId: userId,
        blackPlayerId: 'user-id-2',
        status: 'COMPLETED',
        pgn: storedPgn,
      };

      mockPrismaService.game.findUnique.mockResolvedValue(mockGame);

      const result = await service.exportGameAsPgn(gameId, userId);

      expect(result).toBe(storedPgn);
      expect(mockPgnFormatter.formatGame).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if game does not exist', async () => {
      mockPrismaService.game.findUnique.mockResolvedValue(null);

      await expect(
        service.exportGameAsPgn('non-existent-id', 'user-id-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not have access', async () => {
      const mockGame = {
        id: 'game-id-1',
        whitePlayerId: 'other-user-1',
        blackPlayerId: 'other-user-2',
        status: 'ACTIVE',
      };

      mockPrismaService.game.findUnique.mockResolvedValue(mockGame);

      await expect(
        service.exportGameAsPgn('game-id-1', 'user-id-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('exportMultipleGamesAsPgn', () => {
    it('should export multiple games as PGN', async () => {
      const gameIds = ['game-id-1', 'game-id-2'];
      const userId = 'user-id-1';

      const mockGames = [
        {
          id: 'game-id-1',
          whitePlayerId: userId,
          blackPlayerId: 'user-id-2',
          status: 'COMPLETED',
          result: 'WHITE_WIN',
          timeControl: 'BLITZ',
          initialTimeMinutes: 5,
          incrementSeconds: 3,
          startedAt: new Date('2024-01-01'),
          whitePlayer: { displayName: 'Player1', username: 'player1' },
          blackPlayer: { displayName: 'Player2', username: 'player2' },
          moves: [{ san: 'e4', color: 'white', moveNumber: 1 }],
        },
        {
          id: 'game-id-2',
          whitePlayerId: 'user-id-2',
          blackPlayerId: userId,
          status: 'COMPLETED',
          result: 'BLACK_WIN',
          timeControl: 'RAPID',
          initialTimeMinutes: 10,
          incrementSeconds: 0,
          startedAt: new Date('2024-01-02'),
          whitePlayer: { displayName: 'Player2', username: 'player2' },
          blackPlayer: { displayName: 'Player1', username: 'player1' },
          moves: [{ san: 'd4', color: 'white', moveNumber: 1 }],
        },
      ];

      const expectedPgn = '[Event "Game 1"]\n\n1. e4\n\n[Event "Game 2"]\n\n1. d4';

      mockPrismaService.game.findMany.mockResolvedValue(mockGames);
      mockPgnFormatter.formatMultipleGames.mockReturnValue(expectedPgn);

      const result = await service.exportMultipleGamesAsPgn(gameIds, userId);

      expect(result).toBe(expectedPgn);
      expect(mockPrismaService.game.findMany).toHaveBeenCalledWith({
        where: { id: { in: gameIds } },
        include: {
          whitePlayer: true,
          blackPlayer: true,
          moves: {
            orderBy: [{ moveNumber: 'asc' }, { color: 'asc' }],
          },
        },
      });
    });

    it('should throw BadRequestException if no game IDs provided', async () => {
      await expect(
        service.exportMultipleGamesAsPgn([], 'user-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if no games found', async () => {
      mockPrismaService.game.findMany.mockResolvedValue([]);

      await expect(
        service.exportMultipleGamesAsPgn(['game-id-1'], 'user-id-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user lacks access to any game', async () => {
      const mockGames = [
        {
          id: 'game-id-1',
          whitePlayerId: 'other-user-1',
          blackPlayerId: 'other-user-2',
          status: 'ACTIVE',
        },
      ];

      mockPrismaService.game.findMany.mockResolvedValue(mockGames);

      await expect(
        service.exportMultipleGamesAsPgn(['game-id-1'], 'user-id-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
