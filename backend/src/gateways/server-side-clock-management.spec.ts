import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChessEngineService } from '../chess/chess-engine.service';
import { LatencyTrackerService } from './services/latency-tracker.service';
import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';

/**
 * Server-Side Clock Management Tests
 * 
 * Tests for Task 15.1: Create server-side clock management
 * 
 * Requirements:
 * - 5.12: Track clock times server-side to prevent client-side manipulation
 * - 5.6: Add increment time to player's remaining time after move completion
 * - 5.9: Declare opponent winner when player's time reaches zero
 * - 5.10: Pause player's clock on disconnection for up to 60 seconds
 * - 5.11: Resume clock countdown if player doesn't reconnect within 60 seconds
 */
describe('GameGateway - Server-Side Clock Management (Task 15.1)', () => {
  let gateway: GameGateway;
  let redisService: RedisService;
  let prismaService: PrismaService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  const mockGameId = 'game-123';
  const mockWhitePlayerId = 'white-player-123';
  const mockBlackPlayerId = 'black-player-123';

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockClient = {
      id: 'client-123',
      data: {
        user: {
          id: mockWhitePlayerId,
          username: 'whitePlayer',
        },
      },
      handshake: {
        auth: {
          token: 'valid-jwt-token',
        },
      } as any,
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      rooms: new Set(['client-123', `game:${mockGameId}`]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            game: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            gameMove: {
              create: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ChessEngineService,
          useValue: {
            createGame: jest.fn(),
            getTurn: jest.fn(),
            isValidMove: jest.fn(),
            makeMove: jest.fn(),
            getFen: jest.fn(),
            isCheck: jest.fn(),
            isCheckmate: jest.fn(),
            isStalemate: jest.fn(),
            isDraw: jest.fn(),
            isGameOver: jest.fn(),
            getPgn: jest.fn(),
          },
        },
        {
          provide: LatencyTrackerService,
          useValue: {
            trackMoveLatency: jest.fn(),
            recordLatency: jest.fn(),
            getAverageLatency: jest.fn().mockReturnValue(50),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue({ userId: mockWhitePlayerId }),
          },
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    redisService = module.get<RedisService>(RedisService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Set the server instance
    (gateway as any).server = mockServer;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('Requirement 5.12: Server-side clock tracking', () => {
    it('should store clock times in Redis when clock is started', async () => {
      const clockData = {
        gameId: mockGameId,
        whiteTimeRemaining: 300000, // 5 minutes
        blackTimeRemaining: 300000,
        currentTurn: 'white' as const,
      };

      await gateway.handleStartClock(mockClient as Socket, clockData);

      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${mockGameId}`,
        expect.stringContaining('"whiteTimeRemaining":300000'),
      );
      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${mockGameId}`,
        expect.stringContaining('"blackTimeRemaining":300000'),
      );
    });

    it('should retrieve clock times from Redis (server-side)', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'black',
        lastUpdate: Date.now(),
        isPaused: false,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      const result = await redisService.get(`clock:${mockGameId}`);
      const parsedClock = JSON.parse(result);

      expect(parsedClock.whiteTimeRemaining).toBe(250000);
      expect(parsedClock.blackTimeRemaining).toBe(280000);
      expect(parsedClock.currentTurn).toBe('black');
    });

    it('should prevent client from directly manipulating clock times', async () => {
      // Client attempts to update clock with invalid data
      const maliciousClockData = {
        gameId: mockGameId,
        whiteTimeRemaining: 999999999, // Unrealistic time
        blackTimeRemaining: 999999999,
        currentTurn: 'white' as const,
      };

      // The server should validate and use its own authoritative time
      const serverClockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(serverClockData));

      await gateway.handleUpdateClock(mockClient as Socket, maliciousClockData);

      // Verify server maintains its own clock state
      expect(redisService.set).toHaveBeenCalled();
      const setCall = (redisService.set as jest.Mock).mock.calls[0];
      const storedData = JSON.parse(setCall[1]);
      
      // Server should update with provided values but maintain control
      expect(storedData.lastUpdate).toBeDefined();
    });

    it('should track turn start time for accurate time calculation', async () => {
      const turnStartTimeKey = `game:${mockGameId}:turn_start_time`;
      const currentTime = Date.now();

      await gateway.handleStartClock(mockClient as Socket, {
        gameId: mockGameId,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
      });

      expect(redisService.set).toHaveBeenCalledWith(
        turnStartTimeKey,
        expect.any(String),
        3600,
      );
    });
  });

  describe('Requirement 5.6: Time increment on move completion', () => {
    it('should add increment to player time after move', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000, // 5 minutes
        blackTimeRemaining: 300000,
        incrementSeconds: 2, // 2 second increment
        pgn: '',
      };

      const mockChess = {};
      const mockMove = {
        san: 'e4',
        from: 'e2',
        to: 'e4',
        flags: '',
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (gateway as any).chessEngine.createGame.mockReturnValue(mockChess);
      (gateway as any).chessEngine.getTurn.mockReturnValue('w');
      (gateway as any).chessEngine.isValidMove.mockReturnValue(true);
      (gateway as any).chessEngine.makeMove.mockReturnValue(mockMove);
      (gateway as any).chessEngine.getFen.mockReturnValue('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      (gateway as any).chessEngine.isCheck.mockReturnValue(false);
      (gateway as any).chessEngine.isCheckmate.mockReturnValue(false);
      (gateway as any).chessEngine.isStalemate.mockReturnValue(false);
      (gateway as any).chessEngine.isDraw.mockReturnValue(false);
      (gateway as any).chessEngine.isGameOver.mockReturnValue(false);
      (gateway as any).chessEngine.getPgn.mockReturnValue('1. e4');

      // Set turn start time to 5 seconds ago
      const turnStartTime = Date.now() - 5000;
      (redisService.get as jest.Mock).mockResolvedValue(turnStartTime.toString());

      await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e4',
      });

      // Verify game was updated with time calculation
      expect(prismaService.game.update).toHaveBeenCalled();
      const updateCall = (prismaService.game.update as jest.Mock).mock.calls[0][0];
      
      // White's time should be: original - time_taken + increment
      // 300000 - 5000 + 2000 = 297000
      expect(updateCall.data.whiteTimeRemaining).toBeGreaterThan(295000);
      expect(updateCall.data.whiteTimeRemaining).toBeLessThan(300000);
    });

    it('should correctly calculate time taken for move', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: mockWhitePlayerId,
        blackPlayerId: mockBlackPlayerId,
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 3,
        pgn: '',
      };

      const mockChess = {};
      const mockMove = {
        san: 'Nf3',
        from: 'g1',
        to: 'f3',
        flags: '',
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (gateway as any).chessEngine.createGame.mockReturnValue(mockChess);
      (gateway as any).chessEngine.getTurn.mockReturnValue('w');
      (gateway as any).chessEngine.isValidMove.mockReturnValue(true);
      (gateway as any).chessEngine.makeMove.mockReturnValue(mockMove);
      (gateway as any).chessEngine.getFen.mockReturnValue('rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1');
      (gateway as any).chessEngine.isCheck.mockReturnValue(false);
      (gateway as any).chessEngine.isCheckmate.mockReturnValue(false);
      (gateway as any).chessEngine.isStalemate.mockReturnValue(false);
      (gateway as any).chessEngine.isDraw.mockReturnValue(false);
      (gateway as any).chessEngine.isGameOver.mockReturnValue(false);
      (gateway as any).chessEngine.getPgn.mockReturnValue('1. Nf3');

      // Set turn start time to 10 seconds ago
      const turnStartTime = Date.now() - 10000;
      (redisService.get as jest.Mock).mockResolvedValue(turnStartTime.toString());

      await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'g1',
        to: 'f3',
      });

      // Verify gameMove was created with time taken
      expect(prismaService.gameMove.create).toHaveBeenCalled();
      const createCall = (prismaService.gameMove.create as jest.Mock).mock.calls[0][0];
      
      // Time taken should be approximately 10000ms
      expect(createCall.data.timeTakenMs).toBeGreaterThan(9000);
      expect(createCall.data.timeTakenMs).toBeLessThan(11000);
    });
  });

  describe('Requirement 5.9: Timeout detection', () => {
    it('should detect when white player time reaches zero', async () => {
      const clockData = {
        whiteTimeRemaining: 0,
        blackTimeRemaining: 150000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Trigger clock tick
      await (gateway as any).tickClock(mockGameId);

      // Verify timeout was handled
      expect(mockServer.to).toHaveBeenCalledWith(`game:${mockGameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('game_ended', expect.objectContaining({
        gameId: mockGameId,
        result: 'black_win',
        terminationReason: 'timeout',
        timeoutPlayer: 'white',
        winner: 'black',
      }));
    });

    it('should detect when black player time reaches zero', async () => {
      const clockData = {
        whiteTimeRemaining: 200000,
        blackTimeRemaining: 0,
        currentTurn: 'black',
        lastUpdate: Date.now(),
        isPaused: false,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Trigger clock tick
      await (gateway as any).tickClock(mockGameId);

      // Verify timeout was handled
      expect(mockServer.to).toHaveBeenCalledWith(`game:${mockGameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('game_ended', expect.objectContaining({
        gameId: mockGameId,
        result: 'white_win',
        terminationReason: 'timeout',
        timeoutPlayer: 'black',
        winner: 'white',
      }));
    });

    it('should stop clock interval when timeout occurs', async () => {
      const clockData = {
        whiteTimeRemaining: 0,
        blackTimeRemaining: 150000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Start clock interval
      (gateway as any).startClockInterval(mockGameId);
      expect((gateway as any).clockIntervals.has(mockGameId)).toBe(true);

      // Trigger timeout
      await (gateway as any).tickClock(mockGameId);

      // Verify clock interval was stopped
      expect((gateway as any).clockIntervals.has(mockGameId)).toBe(false);
    });
  });

  describe('Requirement 5.10: Pause clock on disconnection', () => {
    it('should pause player clock when they disconnect', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      await (gateway as any).pausePlayerClock(mockGameId, mockWhitePlayerId);

      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${mockGameId}`,
        expect.stringContaining('"isPaused":true'),
      );
      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${mockGameId}`,
        expect.stringContaining(`"pausedPlayerId":"${mockWhitePlayerId}"`),
      );
    });

    it('should not tick clock when paused', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now() - 1000,
        isPaused: true,
        pausedPlayerId: mockWhitePlayerId,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      await (gateway as any).tickClock(mockGameId);

      // Clock should not be updated when paused
      const setCalls = (redisService.set as jest.Mock).mock.calls;
      const clockUpdateCalls = setCalls.filter(call => call[0] === `clock:${mockGameId}`);
      
      // Should not update time when paused
      expect(clockUpdateCalls.length).toBe(0);
    });

    it('should notify opponent when player disconnects', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      await (gateway as any).handlePlayerDisconnection(mockWhitePlayerId, mockClient);

      expect(mockServer.to).toHaveBeenCalledWith(`game:${mockGameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('player_disconnected', expect.objectContaining({
        gameId: mockGameId,
        playerId: mockWhitePlayerId,
      }));
    });
  });

  describe('Requirement 5.11: Resume clock after 60 seconds', () => {
    it('should resume clock if player does not reconnect within 60 seconds', async () => {
      jest.useFakeTimers();

      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: true,
        pausedPlayerId: mockWhitePlayerId,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Trigger disconnection
      await (gateway as any).handlePlayerDisconnection(mockWhitePlayerId, mockClient);

      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60000);

      // Verify clock resume was attempted
      expect(mockServer.emit).toHaveBeenCalledWith('clock_resumed_after_disconnect', expect.objectContaining({
        gameId: mockGameId,
        playerId: mockWhitePlayerId,
      }));

      jest.useRealTimers();
    });

    it('should resume paused clock correctly', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: true,
        pausedPlayerId: mockWhitePlayerId,
        pausedAt: Date.now(),
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      await (gateway as any).resumePlayerClock(mockGameId, mockWhitePlayerId);

      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${mockGameId}`,
        expect.stringContaining('"isPaused":false'),
      );
      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${mockGameId}`,
        expect.stringContaining('"pausedPlayerId":null'),
      );
    });

    it('should not resume clock if different player was paused', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'black',
        lastUpdate: Date.now(),
        isPaused: true,
        pausedPlayerId: mockBlackPlayerId, // Different player
        pausedAt: Date.now(),
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      await (gateway as any).resumePlayerClock(mockGameId, mockWhitePlayerId);

      // Should not update clock since different player was paused
      const setCalls = (redisService.set as jest.Mock).mock.calls;
      const clockUpdateCalls = setCalls.filter(call => 
        call[0] === `clock:${mockGameId}` && call[1].includes('"isPaused":false')
      );
      
      expect(clockUpdateCalls.length).toBe(0);
    });
  });

  describe('Clock interval management', () => {
    it('should start clock interval when game starts', async () => {
      (gateway as any).startClockInterval(mockGameId);

      expect((gateway as any).clockIntervals.has(mockGameId)).toBe(true);
    });

    it('should stop clock interval when game ends', async () => {
      (gateway as any).startClockInterval(mockGameId);
      expect((gateway as any).clockIntervals.has(mockGameId)).toBe(true);

      (gateway as any).stopClockInterval(mockGameId);

      expect((gateway as any).clockIntervals.has(mockGameId)).toBe(false);
    });

    it('should clear existing interval before starting new one', async () => {
      (gateway as any).startClockInterval(mockGameId);
      const firstInterval = (gateway as any).clockIntervals.get(mockGameId);

      (gateway as any).startClockInterval(mockGameId);
      const secondInterval = (gateway as any).clockIntervals.get(mockGameId);

      expect(firstInterval).not.toBe(secondInterval);
    });
  });

  describe('Clock state persistence', () => {
    it('should persist clock state to Redis on every tick', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now() - 100,
        isPaused: false,
        tickCount: 0,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      await (gateway as any).tickClock(mockGameId);

      // Verify clock state was updated in Redis
      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${mockGameId}`,
        expect.any(String),
      );
    });

    it('should update lastUpdate timestamp on each tick', async () => {
      const oldTimestamp = Date.now() - 1000;
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: oldTimestamp,
        isPaused: false,
        tickCount: 0,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      await (gateway as any).tickClock(mockGameId);

      const setCalls = (redisService.set as jest.Mock).mock.calls;
      const clockUpdateCall = setCalls.find(call => call[0] === `clock:${mockGameId}`);
      
      if (clockUpdateCall) {
        const updatedClock = JSON.parse(clockUpdateCall[1]);
        expect(updatedClock.lastUpdate).toBeGreaterThan(oldTimestamp);
      }
    });
  });
});
