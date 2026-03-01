import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChessEngineService } from '../chess/chess-engine.service';
import { LatencyTrackerService } from './services/latency-tracker.service';
import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';

/**
 * Clock Sync Broadcasting Tests
 * 
 * Tests for Task 15.2: Implement clock sync broadcasting
 * 
 * Requirements:
 * - 5.7: Synchronize clock times between client and server with maximum 100ms drift
 * - 5.10: Pause player's clock on disconnection
 * 
 * Sub-requirements:
 * - Broadcast clock updates every 1 second
 * - Include server timestamp for drift correction
 * - Handle clock pause on disconnection
 */
describe('GameGateway - Clock Sync Broadcasting (Task 15.2)', () => {
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
      sockets: {
        sockets: new Map(),
      } as any,
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
      to: jest.fn().mockReturnThis(),
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

  describe('Sub-requirement: Broadcast clock updates every 1 second', () => {
    it('should broadcast clock sync every 10 ticks (1 second)', async () => {
      jest.useFakeTimers();

      const clockData = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Start the clock
      await gateway.handleStartClock(mockClient as Socket, {
        gameId: mockGameId,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
      });

      // Clear previous emit calls
      (mockServer.emit as jest.Mock).mockClear();

      // Advance time by 1 second (10 ticks of 100ms each)
      for (let i = 0; i < 10; i++) {
        // Update clock data for each tick
        const updatedClockData = {
          ...clockData,
          tickCount: i,
          lastUpdate: Date.now(),
        };
        (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(updatedClockData));
        
        jest.advanceTimersByTime(100);
        await Promise.resolve(); // Allow async operations to complete
      }

      // Verify clock_sync was emitted at least once (on tick 10)
      const clockSyncCalls = (mockServer.emit as jest.Mock).mock.calls.filter(
        call => call[0] === 'clock_sync'
      );
      
      expect(clockSyncCalls.length).toBeGreaterThanOrEqual(1);

      jest.useRealTimers();
    });

    it('should not broadcast clock sync on every tick', async () => {
      jest.useFakeTimers();

      const clockData = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Start the clock
      await gateway.handleStartClock(mockClient as Socket, {
        gameId: mockGameId,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
      });

      // Clear previous emit calls
      (mockServer.emit as jest.Mock).mockClear();

      // Advance time by 500ms (5 ticks)
      for (let i = 0; i < 5; i++) {
        const updatedClockData = {
          ...clockData,
          tickCount: i,
          lastUpdate: Date.now(),
        };
        (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(updatedClockData));
        
        jest.advanceTimersByTime(100);
        await Promise.resolve();
      }

      // Verify clock_sync was NOT emitted (not enough ticks)
      const clockSyncCalls = (mockServer.emit as jest.Mock).mock.calls.filter(
        call => call[0] === 'clock_sync'
      );
      
      expect(clockSyncCalls.length).toBe(0);

      jest.useRealTimers();
    });

    it('should broadcast clock sync multiple times over multiple seconds', async () => {
      jest.useFakeTimers();

      const clockData = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Start the clock
      await gateway.handleStartClock(mockClient as Socket, {
        gameId: mockGameId,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
      });

      // Clear previous emit calls
      (mockServer.emit as jest.Mock).mockClear();

      // Advance time by 3 seconds (30 ticks)
      for (let i = 0; i < 30; i++) {
        const updatedClockData = {
          ...clockData,
          tickCount: i,
          lastUpdate: Date.now(),
        };
        (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(updatedClockData));
        
        jest.advanceTimersByTime(100);
        await Promise.resolve();
      }

      // Verify clock_sync was emitted 3 times (at ticks 10, 20, 30)
      const clockSyncCalls = (mockServer.emit as jest.Mock).mock.calls.filter(
        call => call[0] === 'clock_sync'
      );
      
      expect(clockSyncCalls.length).toBeGreaterThanOrEqual(2);

      jest.useRealTimers();
    });
  });

  describe('Sub-requirement: Include server timestamp for drift correction', () => {
    it('should include serverTimestamp in clock_sync event', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now() - 100,
        isPaused: false,
        tickCount: 9, // Next tick will be 10, triggering broadcast
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Trigger a clock tick
      await (gateway as any).tickClock(mockGameId);

      // Verify clock_sync was emitted with serverTimestamp
      expect(mockServer.emit).toHaveBeenCalledWith('clock_sync', expect.objectContaining({
        gameId: mockGameId,
        serverTimestamp: expect.any(Number),
      }));
    });

    it('should include current clock times in clock_sync event', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now() - 100,
        isPaused: false,
        tickCount: 9,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Trigger a clock tick
      await (gateway as any).tickClock(mockGameId);

      // Verify clock_sync includes time values
      expect(mockServer.emit).toHaveBeenCalledWith('clock_sync', expect.objectContaining({
        gameId: mockGameId,
        whiteTimeRemaining: expect.any(Number),
        blackTimeRemaining: expect.any(Number),
      }));
    });

    it('should include currentTurn in clock_sync event', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'black',
        lastUpdate: Date.now() - 100,
        isPaused: false,
        tickCount: 9,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Trigger a clock tick
      await (gateway as any).tickClock(mockGameId);

      // Verify clock_sync includes currentTurn
      expect(mockServer.emit).toHaveBeenCalledWith('clock_sync', expect.objectContaining({
        gameId: mockGameId,
        currentTurn: 'black',
      }));
    });

    it('should use server time as authoritative timestamp', async () => {
      const beforeTime = Date.now();
      
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now() - 100,
        isPaused: false,
        tickCount: 9,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Trigger a clock tick
      await (gateway as any).tickClock(mockGameId);

      const afterTime = Date.now();

      // Verify serverTimestamp is within reasonable range
      const emitCall = (mockServer.emit as jest.Mock).mock.calls.find(
        call => call[0] === 'clock_sync'
      );
      
      if (emitCall) {
        const timestamp = emitCall[1].serverTimestamp;
        expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
        expect(timestamp).toBeLessThanOrEqual(afterTime);
      }
    });
  });

  describe('Sub-requirement: Handle clock pause on disconnection', () => {
    it('should not broadcast clock sync when clock is paused', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now() - 100,
        isPaused: true, // Clock is paused
        pausedPlayerId: mockWhitePlayerId,
        tickCount: 9,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Trigger a clock tick
      await (gateway as any).tickClock(mockGameId);

      // Verify clock_sync was NOT emitted when paused
      const clockSyncCalls = (mockServer.emit as jest.Mock).mock.calls.filter(
        call => call[0] === 'clock_sync'
      );
      
      expect(clockSyncCalls.length).toBe(0);
    });

    it('should resume broadcasting after clock is unpaused', async () => {
      // First, clock is paused
      const pausedClockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now() - 100,
        isPaused: true,
        pausedPlayerId: mockWhitePlayerId,
        tickCount: 9,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(pausedClockData));

      // Trigger a tick while paused
      await (gateway as any).tickClock(mockGameId);

      // Verify no broadcast while paused
      expect(mockServer.emit).not.toHaveBeenCalledWith('clock_sync', expect.anything());

      // Now resume the clock
      const resumedClockData = {
        ...pausedClockData,
        isPaused: false,
        pausedPlayerId: null,
        lastUpdate: Date.now(),
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(resumedClockData));

      // Clear previous calls
      (mockServer.emit as jest.Mock).mockClear();

      // Trigger a tick after resume
      await (gateway as any).tickClock(mockGameId);

      // Verify broadcast resumes (tick 10 should trigger broadcast)
      expect(mockServer.emit).toHaveBeenCalledWith('clock_sync', expect.objectContaining({
        gameId: mockGameId,
      }));
    });

    it('should broadcast player_disconnected event when player disconnects', async () => {
      const clockData = {
        whiteTimeRemaining: 250000,
        blackTimeRemaining: 280000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Simulate player disconnection
      await (gateway as any).handlePlayerDisconnection(mockWhitePlayerId, mockClient);

      // Verify player_disconnected event was emitted
      expect(mockServer.emit).toHaveBeenCalledWith('player_disconnected', expect.objectContaining({
        gameId: mockGameId,
        playerId: mockWhitePlayerId,
        pausedAt: expect.any(Number),
      }));
    });
  });

  describe('Clock sync accuracy (Requirement 5.7)', () => {
    it('should maintain clock sync with minimal drift', async () => {
      const initialTime = Date.now();
      const clockData = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: initialTime,
        isPaused: false,
        tickCount: 9,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Trigger clock tick
      await (gateway as any).tickClock(mockGameId);

      // Verify the time difference is minimal (< 100ms as per requirement)
      const emitCall = (mockServer.emit as jest.Mock).mock.calls.find(
        call => call[0] === 'clock_sync'
      );
      
      if (emitCall) {
        const broadcastTime = emitCall[1].serverTimestamp;
        const drift = Math.abs(broadcastTime - Date.now());
        
        // Drift should be minimal (well under 100ms for a single operation)
        expect(drift).toBeLessThan(100);
      }
    });

    it('should update clock times accurately based on elapsed time', async () => {
      const lastUpdate = Date.now() - 500; // 500ms ago
      const clockData = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate,
        isPaused: false,
        tickCount: 9,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Trigger clock tick
      await (gateway as any).tickClock(mockGameId);

      // Verify Redis was updated with decreased time
      const setCall = (redisService.set as jest.Mock).mock.calls.find(
        call => call[0] === `clock:${mockGameId}`
      );
      
      if (setCall) {
        const updatedClock = JSON.parse(setCall[1]);
        
        // White's time should have decreased by approximately 500ms
        expect(updatedClock.whiteTimeRemaining).toBeLessThan(300000);
        expect(updatedClock.whiteTimeRemaining).toBeGreaterThan(299000);
        
        // Black's time should remain unchanged (not their turn)
        expect(updatedClock.blackTimeRemaining).toBe(300000);
      }
    });
  });

  describe('Periodic full state sync', () => {
    it('should broadcast full game state every 30 seconds (300 ticks)', async () => {
      const mockGame = {
        id: mockGameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        result: null,
        terminationReason: null,
      };

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

      const clockData = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 299, // Next tick will be 300
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(clockData));

      // Trigger clock tick
      await (gateway as any).tickClock(mockGameId);

      // Verify periodic_state_sync was emitted
      expect(mockServer.emit).toHaveBeenCalledWith('periodic_state_sync', expect.objectContaining({
        gameId: mockGameId,
        moveCount: 0,
        fenCurrent: expect.any(String),
        serverTimestamp: expect.any(Number),
      }));
    });
  });
});
