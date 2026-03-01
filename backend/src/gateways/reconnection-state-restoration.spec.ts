import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ChessEngineService } from '../chess/chess-engine.service';
import { LatencyTrackerService } from './services/latency-tracker.service';
import { Server, Socket } from 'socket.io';

describe('GameGateway - Reconnection and State Restoration (Task 14.9)', () => {
  let gateway: GameGateway;
  let redisService: RedisService;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let mockServer: Partial<Server>;

  const mockGame = {
    id: 'game-123',
    status: 'ACTIVE',
    whitePlayerId: 'player-1',
    blackPlayerId: 'player-2',
    fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moveCount: 0,
    whiteTimeRemaining: 300000,
    blackTimeRemaining: 300000,
    timeControl: 'blitz',
    initialTimeMinutes: 5,
    incrementSeconds: 0,
    isRated: true,
    result: null,
    terminationReason: null,
    pgn: null,
    spectatorCount: 0,
    startedAt: new Date(),
    completedAt: null,
    whitePlayer: {
      id: 'player-1',
      username: 'player1',
      displayName: 'Player One',
      avatarUrl: null,
    },
    blackPlayer: {
      id: 'player-2',
      username: 'player2',
      displayName: 'Player Two',
      avatarUrl: null,
    },
    moves: [],
  };

  beforeEach(async () => {
    // Mock services
    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    const mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      game: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    const mockChessEngineService = {
      validateMove: jest.fn(),
      isGameOver: jest.fn(),
    };

    const mockLatencyTrackerService = {
      recordLatency: jest.fn(),
      getStatistics: jest.fn(),
    };

    // Mock Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        sockets: new Map(),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ChessEngineService,
          useValue: mockChessEngineService,
        },
        {
          provide: LatencyTrackerService,
          useValue: mockLatencyTrackerService,
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    redisService = module.get<RedisService>(RedisService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Reconnection Detection', () => {
    it('should detect player reconnection when joining game after disconnection', async () => {
      const mockClient = {
        id: 'client-new-456',
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';
      const playerId = 'player-1';

      // Set up existing player socket (old connection)
      const playerSockets = new Map();
      playerSockets.set(playerId, 'client-old-123');
      (gateway as any).playerSockets = playerSockets;

      // Set up disconnection timeout (player was disconnected)
      const disconnectionTimeouts = new Map();
      const timeoutId = setTimeout(() => {}, 60000);
      disconnectionTimeouts.set(`disconnect:${gameId}:${playerId}`, timeoutId);
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      // Mock game data
      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      // Mock Redis clock data
      jest.spyOn(redisService, 'get').mockResolvedValue(
        JSON.stringify({
          whiteTimeRemaining: 295000,
          blackTimeRemaining: 300000,
          currentTurn: 'white',
          lastUpdate: Date.now(),
          isPaused: true,
          pausedPlayerId: playerId,
          pausedAt: Date.now() - 5000,
        }),
      );
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await gateway.handleJoinGame(mockClient, { gameId });

      // Verify reconnection was detected
      expect(result.event).toBe('joined_game');
      expect(result.data.isReconnection).toBe(true);
      expect(result.data.isPlayer).toBe(true);

      // Verify disconnection timeout was cleared
      expect(disconnectionTimeouts.has(`disconnect:${gameId}:${playerId}`)).toBe(false);

      // Verify player_reconnected event was emitted
      expect(mockClient.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockClient.emit).toHaveBeenCalledWith('initial_game_state', expect.any(Object));
    });

    it('should not detect reconnection for first-time join', async () => {
      const mockClient = {
        id: 'client-123',
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';

      // No existing player socket or disconnection timeout
      (gateway as any).playerSockets = new Map();
      (gateway as any).disconnectionTimeouts = new Map();

      // Mock game data
      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      const result = await gateway.handleJoinGame(mockClient, { gameId });

      // Verify this is not a reconnection
      expect(result.event).toBe('joined_game');
      expect(result.data.isReconnection).toBe(false);
      expect(result.data.isPlayer).toBe(true);
    });
  });

  describe('Complete Game State Restoration (Requirement 6.5)', () => {
    it('should restore complete game state within 2 seconds on reconnection', async () => {
      const mockClient = {
        id: 'client-new-456',
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';
      const playerId = 'player-1';

      // Set up reconnection scenario
      const playerSockets = new Map();
      playerSockets.set(playerId, 'client-old-123');
      (gateway as any).playerSockets = playerSockets;

      const disconnectionTimeouts = new Map();
      const timeoutId = setTimeout(() => {}, 60000);
      disconnectionTimeouts.set(`disconnect:${gameId}:${playerId}`, timeoutId);
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      // Mock complete game data with moves
      const gameWithMoves = {
        ...mockGame,
        moveCount: 5,
        fenCurrent: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3',
        moves: [
          {
            moveNumber: 1,
            color: 'white',
            san: 'e4',
            uci: 'e2e4',
            fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
            timeTakenMs: 2000,
            timeRemainingMs: 298000,
            isCheck: false,
            isCheckmate: false,
            isCapture: false,
            isCastling: false,
            isEnPassant: false,
            isPromotion: false,
            promotionPiece: null,
          },
          {
            moveNumber: 1,
            color: 'black',
            san: 'e5',
            uci: 'e7e5',
            fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
            timeTakenMs: 1500,
            timeRemainingMs: 298500,
            isCheck: false,
            isCheckmate: false,
            isCapture: false,
            isCastling: false,
            isEnPassant: false,
            isPromotion: false,
            promotionPiece: null,
          },
        ],
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(gameWithMoves as any);

      // Mock Redis clock data
      jest.spyOn(redisService, 'get').mockResolvedValue(
        JSON.stringify({
          whiteTimeRemaining: 290000,
          blackTimeRemaining: 295000,
          currentTurn: 'white',
          lastUpdate: Date.now(),
          isPaused: true,
          pausedPlayerId: playerId,
          pausedAt: Date.now() - 5000,
        }),
      );
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const startTime = Date.now();
      const result = await gateway.handleJoinGame(mockClient, { gameId });
      const elapsedTime = Date.now() - startTime;

      // Verify state restoration completed within 2 seconds (Requirement 6.5)
      expect(elapsedTime).toBeLessThan(2000);
      expect(result.data.stateRestorationTimeMs).toBeLessThan(2000);

      // Verify complete game state was sent
      expect(mockClient.emit).toHaveBeenCalledWith('initial_game_state', expect.objectContaining({
        id: gameId,
        status: 'ACTIVE',
        fenCurrent: gameWithMoves.fenCurrent,
        moveCount: 5,
        moves: expect.arrayContaining([
          expect.objectContaining({ san: 'e4' }),
          expect.objectContaining({ san: 'e5' }),
        ]),
        whiteTimeRemaining: 290000,
        blackTimeRemaining: 295000,
        currentTurn: 'white',
        isPaused: true,
      }));
    });

    it('should restore board position correctly from FEN', async () => {
      const mockClient = {
        id: 'client-new-456',
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';
      const customFen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

      // Set up reconnection
      const playerSockets = new Map();
      playerSockets.set('player-1', 'old-socket');
      (gateway as any).playerSockets = playerSockets;

      const disconnectionTimeouts = new Map();
      disconnectionTimeouts.set(`disconnect:${gameId}:player-1`, setTimeout(() => {}, 60000));
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      const gameWithCustomPosition = {
        ...mockGame,
        fenCurrent: customFen,
        moveCount: 7,
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(gameWithCustomPosition as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      await gateway.handleJoinGame(mockClient, { gameId });

      // Verify correct FEN was sent
      expect(mockClient.emit).toHaveBeenCalledWith('initial_game_state', expect.objectContaining({
        fenCurrent: customFen,
        moveCount: 7,
      }));
    });
  });

  describe('Clock State Restoration', () => {
    it('should restore clock times from Redis for active games', async () => {
      const mockClient = {
        id: 'client-new-456',
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';

      // Set up reconnection
      const playerSockets = new Map();
      playerSockets.set('player-1', 'old-socket');
      (gateway as any).playerSockets = playerSockets;

      const disconnectionTimeouts = new Map();
      disconnectionTimeouts.set(`disconnect:${gameId}:player-1`, setTimeout(() => {}, 60000));
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      // Mock Redis clock with different times than DB
      const clockState = {
        whiteTimeRemaining: 285000,
        blackTimeRemaining: 292000,
        currentTurn: 'black',
        lastUpdate: Date.now(),
        isPaused: true,
        pausedPlayerId: 'player-1',
        pausedAt: Date.now() - 3000,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockState));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      await gateway.handleJoinGame(mockClient, { gameId });

      // Verify Redis clock times were used (not DB times)
      expect(mockClient.emit).toHaveBeenCalledWith('initial_game_state', expect.objectContaining({
        whiteTimeRemaining: 285000,
        blackTimeRemaining: 292000,
        currentTurn: 'black',
        isPaused: true,
      }));
    });

    it('should resume player clock on reconnection', async () => {
      const mockClient = {
        id: 'client-new-456',
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';
      const playerId = 'player-1';

      // Set up reconnection with paused clock
      const playerSockets = new Map();
      playerSockets.set(playerId, 'old-socket');
      (gateway as any).playerSockets = playerSockets;

      const disconnectionTimeouts = new Map();
      disconnectionTimeouts.set(`disconnect:${gameId}:${playerId}`, setTimeout(() => {}, 60000));
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      const pausedClockState = {
        whiteTimeRemaining: 290000,
        blackTimeRemaining: 295000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: true,
        pausedPlayerId: playerId,
        pausedAt: Date.now() - 10000,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(pausedClockState));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      await gateway.handleJoinGame(mockClient, { gameId });

      // Verify clock was resumed (isPaused set to false)
      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${gameId}`,
        expect.stringContaining('"isPaused":false'),
      );
      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${gameId}`,
        expect.stringContaining('"pausedPlayerId":null'),
      );
    });
  });

  describe('Move History Restoration', () => {
    it('should restore complete move history on reconnection', async () => {
      const mockClient = {
        id: 'client-new-456',
        data: {
          user: {
            id: 'player-2',
            username: 'player2',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';

      // Set up reconnection
      const playerSockets = new Map();
      playerSockets.set('player-2', 'old-socket');
      (gateway as any).playerSockets = playerSockets;

      const disconnectionTimeouts = new Map();
      disconnectionTimeouts.set(`disconnect:${gameId}:player-2`, setTimeout(() => {}, 60000));
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      // Create game with extensive move history
      const moves = [];
      for (let i = 1; i <= 20; i++) {
        moves.push({
          moveNumber: i,
          color: 'white',
          san: `Move${i}`,
          uci: `a${i}b${i}`,
          fenAfter: `fen-after-${i}`,
          timeTakenMs: 2000,
          timeRemainingMs: 300000 - i * 2000,
          isCheck: false,
          isCheckmate: false,
          isCapture: i % 3 === 0,
          isCastling: false,
          isEnPassant: false,
          isPromotion: false,
          promotionPiece: null,
        });
        moves.push({
          moveNumber: i,
          color: 'black',
          san: `Move${i}b`,
          uci: `b${i}c${i}`,
          fenAfter: `fen-after-${i}b`,
          timeTakenMs: 1800,
          timeRemainingMs: 300000 - i * 1800,
          isCheck: false,
          isCheckmate: false,
          isCapture: i % 4 === 0,
          isCastling: false,
          isEnPassant: false,
          isPromotion: false,
          promotionPiece: null,
        });
      }

      const gameWithManyMoves = {
        ...mockGame,
        moveCount: 40,
        moves,
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(gameWithManyMoves as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      await gateway.handleJoinGame(mockClient, { gameId });

      // Verify all moves were included in state restoration
      expect(mockClient.emit).toHaveBeenCalledWith('initial_game_state', expect.objectContaining({
        moveCount: 40,
        moves: expect.arrayContaining([
          expect.objectContaining({ san: 'Move1' }),
          expect.objectContaining({ san: 'Move20b' }),
        ]),
      }));

      const emittedState = (mockClient.emit as jest.Mock).mock.calls.find(
        call => call[0] === 'initial_game_state'
      )[1];
      expect(emittedState.moves).toHaveLength(40);
    });

    it('should include move metadata (captures, checks, castling)', async () => {
      const mockClient = {
        id: 'client-new-456',
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';

      // Set up reconnection
      const playerSockets = new Map();
      playerSockets.set('player-1', 'old-socket');
      (gateway as any).playerSockets = playerSockets;

      const disconnectionTimeouts = new Map();
      disconnectionTimeouts.set(`disconnect:${gameId}:player-1`, setTimeout(() => {}, 60000));
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      const gameWithSpecialMoves = {
        ...mockGame,
        moves: [
          {
            moveNumber: 1,
            color: 'white',
            san: 'e4',
            uci: 'e2e4',
            fenAfter: 'fen1',
            timeTakenMs: 2000,
            timeRemainingMs: 298000,
            isCheck: false,
            isCheckmate: false,
            isCapture: false,
            isCastling: false,
            isEnPassant: false,
            isPromotion: false,
            promotionPiece: null,
          },
          {
            moveNumber: 2,
            color: 'white',
            san: 'Bxf7+',
            uci: 'f1f7',
            fenAfter: 'fen2',
            timeTakenMs: 3000,
            timeRemainingMs: 295000,
            isCheck: true,
            isCheckmate: false,
            isCapture: true,
            isCastling: false,
            isEnPassant: false,
            isPromotion: false,
            promotionPiece: null,
          },
          {
            moveNumber: 3,
            color: 'white',
            san: 'O-O',
            uci: 'e1g1',
            fenAfter: 'fen3',
            timeTakenMs: 1500,
            timeRemainingMs: 293500,
            isCheck: false,
            isCheckmate: false,
            isCapture: false,
            isCastling: true,
            isEnPassant: false,
            isPromotion: false,
            promotionPiece: null,
          },
        ],
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(gameWithSpecialMoves as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      await gateway.handleJoinGame(mockClient, { gameId });

      // Verify move metadata was preserved
      expect(mockClient.emit).toHaveBeenCalledWith('initial_game_state', expect.objectContaining({
        moves: expect.arrayContaining([
          expect.objectContaining({ san: 'Bxf7+', isCheck: true, isCapture: true }),
          expect.objectContaining({ san: 'O-O', isCastling: true }),
        ]),
      }));
    });
  });

  describe('Edge Cases', () => {
    it('should handle reconnection when game has ended during disconnection', async () => {
      const mockClient = {
        id: 'client-new-456',
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';

      // Set up reconnection
      const playerSockets = new Map();
      playerSockets.set('player-1', 'old-socket');
      (gateway as any).playerSockets = playerSockets;

      const disconnectionTimeouts = new Map();
      disconnectionTimeouts.set(`disconnect:${gameId}:player-1`, setTimeout(() => {}, 60000));
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      // Game ended while player was disconnected
      const completedGame = {
        ...mockGame,
        status: 'COMPLETED',
        result: 'black_win',
        terminationReason: 'timeout',
        completedAt: new Date(),
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(completedGame as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      await gateway.handleJoinGame(mockClient, { gameId });

      // Verify completed game state was sent
      expect(mockClient.emit).toHaveBeenCalledWith('initial_game_state', expect.objectContaining({
        status: 'COMPLETED',
        result: 'black_win',
        terminationReason: 'timeout',
      }));
    });

    it('should handle reconnection when opponent also disconnected', async () => {
      const mockClient = {
        id: 'client-new-456',
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';

      // Both players disconnected
      const playerSockets = new Map();
      playerSockets.set('player-1', 'old-socket-1');
      playerSockets.set('player-2', 'old-socket-2');
      (gateway as any).playerSockets = playerSockets;

      const disconnectionTimeouts = new Map();
      disconnectionTimeouts.set(`disconnect:${gameId}:player-1`, setTimeout(() => {}, 60000));
      disconnectionTimeouts.set(`disconnect:${gameId}:player-2`, setTimeout(() => {}, 60000));
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      // Clock paused for player-1
      jest.spyOn(redisService, 'get').mockResolvedValue(
        JSON.stringify({
          whiteTimeRemaining: 290000,
          blackTimeRemaining: 295000,
          currentTurn: 'white',
          lastUpdate: Date.now(),
          isPaused: true,
          pausedPlayerId: 'player-1',
          pausedAt: Date.now() - 5000,
        }),
      );
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      await gateway.handleJoinGame(mockClient, { gameId });

      // Verify player-1 reconnected successfully
      expect(disconnectionTimeouts.has(`disconnect:${gameId}:player-1`)).toBe(false);
      // Player-2 still disconnected
      expect(disconnectionTimeouts.has(`disconnect:${gameId}:player-2`)).toBe(true);
    });

    it('should handle spectator joining game with disconnected players', async () => {
      const mockClient = {
        id: 'spectator-123',
        data: {
          user: {
            id: 'spectator-1',
            username: 'spectator1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';

      // Players are disconnected
      const disconnectionTimeouts = new Map();
      disconnectionTimeouts.set(`disconnect:${gameId}:player-1`, setTimeout(() => {}, 60000));
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.game, 'update').mockResolvedValue(mockGame as any);

      await gateway.handleJoinGame(mockClient, { gameId });

      // Verify spectator joined successfully
      expect(mockClient.join).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockClient.emit).toHaveBeenCalledWith('initial_game_state', expect.any(Object));
      
      // Verify spectator count was updated
      expect(prismaService.game.update).toHaveBeenCalled();
    });

    it('should handle rapid reconnection (within 1 second of disconnect)', async () => {
      const mockClient = {
        id: 'client-new-456',
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';

      // Set up very recent disconnection
      const playerSockets = new Map();
      playerSockets.set('player-1', 'old-socket');
      (gateway as any).playerSockets = playerSockets;

      const disconnectionTimeouts = new Map();
      disconnectionTimeouts.set(`disconnect:${gameId}:player-1`, setTimeout(() => {}, 60000));
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      // Clock just paused
      jest.spyOn(redisService, 'get').mockResolvedValue(
        JSON.stringify({
          whiteTimeRemaining: 299000,
          blackTimeRemaining: 300000,
          currentTurn: 'white',
          lastUpdate: Date.now(),
          isPaused: true,
          pausedPlayerId: 'player-1',
          pausedAt: Date.now() - 500, // Only 500ms ago
        }),
      );
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const startTime = Date.now();
      await gateway.handleJoinGame(mockClient, { gameId });
      const elapsedTime = Date.now() - startTime;

      // Verify rapid reconnection was handled efficiently
      expect(elapsedTime).toBeLessThan(500);
      expect(mockClient.emit).toHaveBeenCalledWith('initial_game_state', expect.any(Object));
    });
  });

  describe('Performance Requirements', () => {
    it('should restore state within 2 seconds even with large move history', async () => {
      const mockClient = {
        id: 'client-new-456',
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      const gameId = 'game-123';

      // Set up reconnection
      const playerSockets = new Map();
      playerSockets.set('player-1', 'old-socket');
      (gateway as any).playerSockets = playerSockets;

      const disconnectionTimeouts = new Map();
      disconnectionTimeouts.set(`disconnect:${gameId}:player-1`, setTimeout(() => {}, 60000));
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      // Create game with 100 moves (long game)
      const moves = [];
      for (let i = 1; i <= 100; i++) {
        moves.push({
          moveNumber: i,
          color: i % 2 === 1 ? 'white' : 'black',
          san: `Move${i}`,
          uci: `a${i % 8}b${i % 8}`,
          fenAfter: `fen-${i}`,
          timeTakenMs: 2000,
          timeRemainingMs: 300000 - i * 1000,
          isCheck: false,
          isCheckmate: false,
          isCapture: false,
          isCastling: false,
          isEnPassant: false,
          isPromotion: false,
          promotionPiece: null,
        });
      }

      const longGame = {
        ...mockGame,
        moveCount: 100,
        moves,
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(longGame as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      const startTime = Date.now();
      const result = await gateway.handleJoinGame(mockClient, { gameId });
      const elapsedTime = Date.now() - startTime;

      // Verify 2-second requirement is met even with 100 moves
      expect(elapsedTime).toBeLessThan(2000);
      expect(result.data.stateRestorationTimeMs).toBeLessThan(2000);
      
      // Verify all moves were included
      const emittedState = (mockClient.emit as jest.Mock).mock.calls.find(
        call => call[0] === 'initial_game_state'
      )[1];
      expect(emittedState.moves).toHaveLength(100);
    });
  });
});
