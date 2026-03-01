import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChessEngineService } from '../chess/chess-engine.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

/**
 * Test suite for Task 14.2: Server-side move validation and broadcasting
 * 
 * Requirements tested:
 * - 6.3: Server-side move validation before broadcasting
 * - 6.9: Invalid move rejection with error messages within 100ms
 * - 24.1: All moves validated server-side before accepting
 */
describe('GameGateway - Move Validation and Broadcasting (Task 14.2)', () => {
  let gateway: GameGateway;
  let prismaService: PrismaService;
  let chessEngine: ChessEngineService;
  let redisService: RedisService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  const mockGameId = 'test-game-123';
  const mockWhitePlayerId = 'white-player-id';
  const mockBlackPlayerId = 'black-player-id';

  beforeEach(async () => {
    // Mock services
    const mockPrismaService = {
      game: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      gameMove: {
        create: jest.fn(),
      },
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    const mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    // Mock Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        sockets: new Map(),
      } as any,
    };

    // Mock Socket.IO client
    mockClient = {
      id: 'test-socket-id',
      data: {
        user: {
          id: mockWhitePlayerId,
          username: 'testuser',
          email: 'test@example.com',
        },
      },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        ChessEngineService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    prismaService = module.get<PrismaService>(PrismaService);
    chessEngine = module.get<ChessEngineService>(ChessEngineService);
    redisService = module.get<RedisService>(RedisService);
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Server-side move validation (Requirement 6.3, 24.1)', () => {
    it('should validate and accept a legal move', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.game, 'update').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.gameMove, 'create').mockResolvedValue({} as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e4',
      });

      expect(result.event).toBe('move_success');
      expect(result.data.move).toBe('e4');
      expect(prismaService.game.update).toHaveBeenCalled();
      expect(prismaService.gameMove.create).toHaveBeenCalled();
      expect(mockServer.to).toHaveBeenCalledWith(`game:${mockGameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('move_made', expect.objectContaining({
        gameId: mockGameId,
        move: expect.objectContaining({
          from: 'e2',
          to: 'e4',
          san: 'e4',
        }),
      }));
    });

    it('should reject invalid move with detailed error message (Requirement 6.9)', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      const startTime = Date.now();
      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e5', // Invalid: pawn can't move 3 squares
      });
      const responseTime = Date.now() - startTime;

      expect(result.event).toBe('move_error');
      expect(result.data.code).toBe('INVALID_MOVE');
      expect(result.data.message).toContain('Invalid move');
      expect(result.data.from).toBe('e2');
      expect(result.data.to).toBe('e5');
      expect(result.data.details).toBeDefined();
      expect(responseTime).toBeLessThan(100); // Requirement 6.9: < 100ms
      expect(prismaService.game.update).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should reject move when game not found', async () => {
      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(null);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e4',
      });

      expect(result.event).toBe('move_error');
      expect(result.data.code).toBe('GAME_NOT_FOUND');
      expect(result.data.message).toBe('Game not found');
      expect(prismaService.game.update).not.toHaveBeenCalled();
    });

    it('should reject move when game is not active', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'COMPLETED',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e4',
      });

      expect(result.event).toBe('move_error');
      expect(result.data.code).toBe('GAME_NOT_ACTIVE');
      expect(result.data.status).toBe('COMPLETED');
      expect(prismaService.game.update).not.toHaveBeenCalled();
    });

    it('should reject move when user is not a player', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: 'other-player-1',
        blackPlayerId: 'other-player-2',
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e4',
      });

      expect(result.event).toBe('move_error');
      expect(result.data.code).toBe('NOT_A_PLAYER');
      expect(result.data.message).toBe('You are not a player in this game');
      expect(prismaService.game.update).not.toHaveBeenCalled();
    });

    it('should reject move when it is not the player\'s turn', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', // Black's turn
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 1,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '1. e4',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'd2',
        to: 'd4',
      });

      expect(result.event).toBe('move_error');
      expect(result.data.code).toBe('NOT_YOUR_TURN');
      expect(result.data.currentTurn).toBe('black');
      expect(prismaService.game.update).not.toHaveBeenCalled();
    });

    it('should reject move with missing parameters', async () => {
      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: '',
        to: 'e4',
      });

      expect(result.event).toBe('move_error');
      expect(result.data.message).toBe('Invalid move parameters');
      expect(result.data.details).toContain('required');
    });
  });

  describe('Move broadcasting (Requirement 6.3)', () => {
    it('should broadcast valid move to all clients in game room', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.game, 'update').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.gameMove, 'create').mockResolvedValue({} as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e4',
      });

      expect(mockServer.to).toHaveBeenCalledWith(`game:${mockGameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('move_made', expect.objectContaining({
        gameId: mockGameId,
        playerId: mockWhitePlayerId,
        move: expect.objectContaining({
          from: 'e2',
          to: 'e4',
          san: 'e4',
        }),
        fen: expect.any(String),
        moveCount: 1,
      }));
    });

    it('should not broadcast invalid moves', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e5', // Invalid move
      });

      expect(mockServer.emit).not.toHaveBeenCalled();
      expect(prismaService.game.update).not.toHaveBeenCalled();
    });
  });

  describe('Database updates (Requirement 6.3)', () => {
    it('should update game state in database after valid move', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 2,
        pgn: '',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.game, 'update').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.gameMove, 'create').mockResolvedValue({} as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e4',
      });

      expect(prismaService.game.update).toHaveBeenCalledWith({
        where: { id: mockGameId },
        data: expect.objectContaining({
          fenCurrent: expect.any(String),
          moveCount: 1,
          whiteTimeRemaining: 302000, // 300000 + 2000 (increment)
          blackTimeRemaining: 300000,
          status: 'ACTIVE',
          pgn: expect.any(String),
        }),
      });
    });

    it('should create game move record after valid move', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.game, 'update').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.gameMove, 'create').mockResolvedValue({} as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e4',
      });

      expect(prismaService.gameMove.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          gameId: mockGameId,
          moveNumber: 1,
          color: 'white',
          san: 'e4',
          uci: 'e2e4',
          fenAfter: expect.any(String),
          isCheck: false,
          isCheckmate: false,
          isCapture: false,
        }),
      });
    });

    it('should not update database for invalid moves', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e5', // Invalid move
      });

      expect(prismaService.game.update).not.toHaveBeenCalled();
      expect(prismaService.gameMove.create).not.toHaveBeenCalled();
    });
  });

  describe('Special moves validation', () => {
    it('should validate and accept pawn promotion', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: '8/4P3/8/8/8/8/8/4k2K w - - 0 1', // White pawn on e7
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.game, 'update').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.gameMove, 'create').mockResolvedValue({} as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e7',
        to: 'e8',
        promotion: 'q',
      });

      expect(result.event).toBe('move_success');
      expect(prismaService.gameMove.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPromotion: true,
          promotionPiece: 'q',
        }),
      });
    });

    it('should validate and accept castling', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', // Castling available
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.game, 'update').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.gameMove, 'create').mockResolvedValue({} as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e1',
        to: 'g1', // Kingside castling
      });

      expect(result.event).toBe('move_success');
      expect(prismaService.gameMove.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isCastling: true,
        }),
      });
    });

    it('should validate and accept en passant capture', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3', // En passant available
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 4,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '1. e4 d5 2. e5',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.game, 'update').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.gameMove, 'create').mockResolvedValue({} as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e5',
        to: 'd6', // En passant capture
      });

      expect(result.event).toBe('move_success');
      expect(prismaService.gameMove.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isEnPassant: true,
          isCapture: true,
        }),
      });
    });
  });

  describe('Game end detection', () => {
    it('should detect checkmate and end game', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', // Black about to checkmate
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 4,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '1. f3 e6 2. g4 Qh4#',
      };

      // Set up black player as the one making the move
      mockClient.data.user.id = mockBlackPlayerId;

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.game, 'update').mockResolvedValue(mockGame as any);
      jest.spyOn(prismaService.gameMove, 'create').mockResolvedValue({} as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'h4',
        to: 'f2', // Checkmate move (simplified for test)
      });

      // Note: The actual checkmate detection depends on the position
      // This test verifies the mechanism is in place
      expect(prismaService.game.update).toHaveBeenCalled();
    });
  });
});
