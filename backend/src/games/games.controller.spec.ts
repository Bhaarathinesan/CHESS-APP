import { Test, TestingModule } from '@nestjs/testing';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('GamesController', () => {
  let controller: GamesController;
  let service: GamesService;

  const mockGamesService = {
    importFromPgn: jest.fn(),
    exportGameAsPgn: jest.fn(),
    exportMultipleGamesAsPgn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamesController],
      providers: [{ provide: GamesService, useValue: mockGamesService }],
    }).compile();

    controller = module.get<GamesController>(GamesController);
    service = module.get<GamesService>(GamesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadPgn', () => {
    it('should successfully upload and import PGN', async () => {
      const pgnText = `[Event "Test"]
[Site "ChessArena"]
[Date "2024.01.01"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 1-0`;

      const uploadDto = { pgnText };
      const mockRequest = { user: { userId: 'user-id-1' } };

      mockGamesService.importFromPgn.mockResolvedValue({
        gameIds: ['game-id-1'],
        count: 1,
      });

      const result = await controller.uploadPgn(uploadDto, mockRequest);

      expect(result).toEqual({
        message: 'Successfully imported 1 game(s)',
        gameIds: ['game-id-1'],
        count: 1,
      });
      expect(mockGamesService.importFromPgn).toHaveBeenCalledWith(
        pgnText,
        'user-id-1',
      );
    });

    it('should handle multiple games import', async () => {
      const pgnText = 'multiple games pgn text';
      const uploadDto = { pgnText };
      const mockRequest = { user: { userId: 'user-id-1' } };

      mockGamesService.importFromPgn.mockResolvedValue({
        gameIds: ['game-id-1', 'game-id-2', 'game-id-3'],
        count: 3,
      });

      const result = await controller.uploadPgn(uploadDto, mockRequest);

      expect(result.count).toBe(3);
      expect(result.gameIds).toHaveLength(3);
      expect(result.message).toContain('3 game(s)');
    });

    it('should throw BadRequestException for invalid PGN', async () => {
      const uploadDto = { pgnText: 'invalid pgn' };
      const mockRequest = { user: { userId: 'user-id-1' } };

      mockGamesService.importFromPgn.mockRejectedValue(
        new BadRequestException('PGN parsing failed'),
      );

      await expect(controller.uploadPgn(uploadDto, mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('downloadGamePgn', () => {
    it('should download a single game as PGN', async () => {
      const gameId = 'game-id-1';
      const mockRequest = { user: { userId: 'user-id-1' } };
      const expectedPgn = `[Event "Test Game"]
[Site "ChessArena"]
[Date "2024.01.01"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 1-0`;

      mockGamesService.exportGameAsPgn.mockResolvedValue(expectedPgn);

      const result = await controller.downloadGamePgn(gameId, mockRequest);

      expect(result).toBe(expectedPgn);
      expect(mockGamesService.exportGameAsPgn).toHaveBeenCalledWith(
        gameId,
        'user-id-1',
      );
    });

    it('should throw NotFoundException if game does not exist', async () => {
      const gameId = 'non-existent-id';
      const mockRequest = { user: { userId: 'user-id-1' } };

      mockGamesService.exportGameAsPgn.mockRejectedValue(
        new NotFoundException('Game not found'),
      );

      await expect(
        controller.downloadGamePgn(gameId, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user lacks access', async () => {
      const gameId = 'game-id-1';
      const mockRequest = { user: { userId: 'user-id-1' } };

      mockGamesService.exportGameAsPgn.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(
        controller.downloadGamePgn(gameId, mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('downloadMultipleGamesPgn', () => {
    it('should download multiple games as PGN using POST', async () => {
      const downloadDto = {
        gameIds: ['game-id-1', 'game-id-2'],
      };
      const mockRequest = { user: { userId: 'user-id-1' } };
      const expectedPgn = '[Event "Game 1"]\n\n1. e4\n\n[Event "Game 2"]\n\n1. d4';

      mockGamesService.exportMultipleGamesAsPgn.mockResolvedValue(expectedPgn);

      const result = await controller.downloadMultipleGamesPgn(
        downloadDto,
        mockRequest,
      );

      expect(result).toBe(expectedPgn);
      expect(mockGamesService.exportMultipleGamesAsPgn).toHaveBeenCalledWith(
        downloadDto.gameIds,
        'user-id-1',
      );
    });

    it('should throw BadRequestException if no game IDs provided', async () => {
      const downloadDto = { gameIds: [] };
      const mockRequest = { user: { userId: 'user-id-1' } };

      mockGamesService.exportMultipleGamesAsPgn.mockRejectedValue(
        new BadRequestException('No game IDs provided'),
      );

      await expect(
        controller.downloadMultipleGamesPgn(downloadDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('downloadMultipleGamesPgnQuery', () => {
    it('should download multiple games as PGN using GET with query params', async () => {
      const gameIds = 'game-id-1,game-id-2,game-id-3';
      const mockRequest = { user: { userId: 'user-id-1' } };
      const expectedPgn = '[Event "Game 1"]\n\n1. e4';

      mockGamesService.exportMultipleGamesAsPgn.mockResolvedValue(expectedPgn);

      const result = await controller.downloadMultipleGamesPgnQuery(
        gameIds,
        mockRequest,
      );

      expect(result).toBe(expectedPgn);
      expect(mockGamesService.exportMultipleGamesAsPgn).toHaveBeenCalledWith(
        ['game-id-1', 'game-id-2', 'game-id-3'],
        'user-id-1',
      );
    });

    it('should handle query string with spaces', async () => {
      const gameIds = 'game-id-1, game-id-2 , game-id-3';
      const mockRequest = { user: { userId: 'user-id-1' } };
      const expectedPgn = '[Event "Game 1"]\n\n1. e4';

      mockGamesService.exportMultipleGamesAsPgn.mockResolvedValue(expectedPgn);

      await controller.downloadMultipleGamesPgnQuery(gameIds, mockRequest);

      // Should filter out empty strings from split
      expect(mockGamesService.exportMultipleGamesAsPgn).toHaveBeenCalledWith(
        expect.arrayContaining(['game-id-1', 'game-id-2', 'game-id-3']),
        'user-id-1',
      );
    });

    it('should handle single game ID in query', async () => {
      const gameIds = 'game-id-1';
      const mockRequest = { user: { userId: 'user-id-1' } };
      const expectedPgn = '[Event "Game 1"]\n\n1. e4';

      mockGamesService.exportMultipleGamesAsPgn.mockResolvedValue(expectedPgn);

      const result = await controller.downloadMultipleGamesPgnQuery(
        gameIds,
        mockRequest,
      );

      expect(result).toBe(expectedPgn);
      expect(mockGamesService.exportMultipleGamesAsPgn).toHaveBeenCalledWith(
        ['game-id-1'],
        'user-id-1',
      );
    });
  });
});
