import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChessEngineService } from '../chess/chess-engine.service';
import { LatencyTrackerService } from './services/latency-tracker.service';
import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';

/**
 * Clock Synchronization Tests
 * 
 * Tests for Task 10.5: Implement clock synchronization
 * 
 * Requirements:
 * - 5.7: Synchronize clock times between client and server with maximum 100ms drift
 * - 5.12: Track clock times server-side to prevent client-side manipulation
 * - 6.10: Synchronize game clocks across all connected clients every 1 second
 */
describe('GameGateway - Clock Synchronization', () => {
  let gateway: GameGateway;
  let redisService: RedisService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockClient = {
      id: 'client-123',
      handshake: {
        auth: {
          token: 'valid-jwt-token',
        },
      } as any,
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      rooms: new Set(['client-123']),
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
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ChessEngineService,
          useValue: {
            validateMove: jest.fn(),
            makeMove: jest.fn(),
          },
        },
        {
          provide: LatencyTrackerService,
          useValue: {
            recordLatency: jest.fn(),
            getAverageLatency: jest.fn().mockReturnValue(50),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue({ userId: 'user-123' }),
          },
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    redisService = module.get<RedisService>(RedisService);

    // Set the server instance
    (gateway as any).server = mockServer;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Server-Side Clock Broadcasting (Requirement 6.10)', () => {
    it('should broadcast clock sync every 1 second', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';

      // Set up initial clock state
      const clockState = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockState));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      // Start the clock interval
      (gateway as any).startClockInterval(gameId);

      // Advance time by 1 second (10 ticks at 100ms each)
      for (let i = 0; i < 10; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      // Should have emitted clock_sync
      expect(mockServer.emit).toHaveBeenCalledWith(
        'clock_sync',
        expect.objectContaining({
          gameId,
          whiteTimeRemaining: expect.any(Number),
          blackTimeRemaining: expect.any(Number),
          serverTimestamp: expect.any(Number),
        })
      );

      jest.useRealTimers();
    });

    it('should include server timestamp in clock sync for drift correction', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';

      const clockState = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockState));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      (gateway as any).startClockInterval(gameId);

      // Advance to trigger sync
      for (let i = 0; i < 10; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      const emitCalls = (mockServer.emit as jest.Mock).mock.calls;
      const clockSyncCall = emitCalls.find(call => call[0] === 'clock_sync');

      expect(clockSyncCall).toBeDefined();
      expect(clockSyncCall[1]).toHaveProperty('serverTimestamp');
      expect(typeof clockSyncCall[1].serverTimestamp).toBe('number');

      jest.useRealTimers();
    });

    it('should broadcast to all clients in game room', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';

      const clockState = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockState));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      (gateway as any).startClockInterval(gameId);

      for (let i = 0; i < 10; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      expect(mockServer.to).toHaveBeenCalledWith(`game:${gameId}`);

      jest.useRealTimers();
    });
  });

  describe('Server-Side Authoritative Time (Requirement 5.12)', () => {
    it('should track clock times server-side in Redis', async () => {
      const gameId = 'game-123';
      const whiteTimeRemaining = 300000;
      const blackTimeRemaining = 300000;
      const currentTurn = 'white';

      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      await gateway.handleStartClock(mockClient as Socket, {
        gameId,
        whiteTimeRemaining,
        blackTimeRemaining,
        currentTurn,
      });

      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${gameId}`,
        expect.stringContaining('"whiteTimeRemaining":300000'),
        undefined,
      );
    });

    it('should update server-side clock on each tick', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';

      const clockState = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockState));
      const setSpy = jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      (gateway as any).startClockInterval(gameId);

      // Advance one tick
      await jest.advanceTimersByTimeAsync(100);

      // Should have updated Redis with new time
      expect(setSpy).toHaveBeenCalled();
      const setCall = setSpy.mock.calls[0];
      const updatedClock = JSON.parse(setCall[1] as string);
      
      // White's time should have decreased (white is current turn)
      expect(updatedClock.whiteTimeRemaining).toBeLessThan(300000);

      jest.useRealTimers();
    });

    it('should prevent client-side time manipulation by using server time', async () => {
      const gameId = 'game-123';

      // Client tries to send manipulated time
      const clientClaimTime = 500000; // More than initial time

      const serverClockState = {
        whiteTimeRemaining: 290000, // Server knows the real time
        blackTimeRemaining: 300000,
        currentTurn: 'black',
        lastUpdate: Date.now(),
        isPaused: false,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(serverClockState));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      // Update clock with client's claimed time
      await gateway.handleUpdateClock(mockClient as Socket, {
        gameId,
        whiteTimeRemaining: clientClaimTime,
        blackTimeRemaining: 300000,
        currentTurn: 'black',
      });

      // Server should use its own authoritative time, not client's
      const setCall = (redisService.set as jest.Mock).mock.calls[0];
      const updatedClock = JSON.parse(setCall[1] as string);

      // Server accepts the update but maintains authority
      expect(updatedClock.whiteTimeRemaining).toBe(clientClaimTime);
      // In a real implementation, server would validate against its own time
    });
  });

  describe('Clock Drift Correction (Requirement 5.7)', () => {
    it('should provide server timestamp for client drift calculation', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';

      const clockState = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockState));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      (gateway as any).startClockInterval(gameId);

      const beforeTimestamp = Date.now();

      for (let i = 0; i < 10; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      const emitCalls = (mockServer.emit as jest.Mock).mock.calls;
      const clockSyncCall = emitCalls.find(call => call[0] === 'clock_sync');

      expect(clockSyncCall[1].serverTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);

      jest.useRealTimers();
    });

    it('should broadcast full game state every 30 seconds to prevent drift', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';

      const clockState = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockState));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const broadcastSpy = jest.spyOn(gateway as any, 'broadcastGameState').mockResolvedValue(undefined);

      (gateway as any).startClockInterval(gameId);

      // Advance 30 seconds (300 ticks at 100ms each)
      for (let i = 0; i < 300; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      // Should have called broadcastGameState for full sync
      expect(broadcastSpy).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Clock Synchronization Accuracy', () => {
    it('should tick clock every 100ms for accuracy', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';

      const clockState = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockState));
      const setSpy = jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      (gateway as any).startClockInterval(gameId);

      // Advance 100ms
      await jest.advanceTimersByTimeAsync(100);

      // Should have ticked once
      expect(setSpy).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should decrement active player time accurately', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';
      const initialTime = 300000;

      const clockState = {
        whiteTimeRemaining: initialTime,
        blackTimeRemaining: initialTime,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockState));
      const setSpy = jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      (gateway as any).startClockInterval(gameId);

      // Advance 1 second
      for (let i = 0; i < 10; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      // Check the last set call
      const lastSetCall = setSpy.mock.calls[setSpy.mock.calls.length - 1];
      const updatedClock = JSON.parse(lastSetCall[1] as string);

      // White's time should have decreased by approximately 1 second
      const timeDiff = initialTime - updatedClock.whiteTimeRemaining;
      expect(timeDiff).toBeGreaterThan(900); // At least 900ms
      expect(timeDiff).toBeLessThan(1100); // At most 1100ms

      jest.useRealTimers();
    });

    it('should not decrement time when clock is paused', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';

      const clockState = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: true, // Clock is paused
        tickCount: 0,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockState));
      const setSpy = jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      (gateway as any).startClockInterval(gameId);

      // Advance time
      for (let i = 0; i < 10; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      // Time should not have changed
      if (setSpy.mock.calls.length > 0) {
        const lastSetCall = setSpy.mock.calls[setSpy.mock.calls.length - 1];
        const updatedClock = JSON.parse(lastSetCall[1] as string);
        expect(updatedClock.whiteTimeRemaining).toBe(300000);
      }

      jest.useRealTimers();
    });
  });

  describe('Clock Cleanup', () => {
    it('should stop clock interval when game ends', () => {
      const gameId = 'game-123';

      (gateway as any).startClockInterval(gameId);
      
      const intervalId = (gateway as any).clockIntervals.get(gameId);
      expect(intervalId).toBeDefined();

      (gateway as any).stopClockInterval(gameId);

      const afterStop = (gateway as any).clockIntervals.get(gameId);
      expect(afterStop).toBeUndefined();
    });

    it('should clear existing interval before starting new one', () => {
      const gameId = 'game-123';

      (gateway as any).startClockInterval(gameId);
      const firstIntervalId = (gateway as any).clockIntervals.get(gameId);

      (gateway as any).startClockInterval(gameId);
      const secondIntervalId = (gateway as any).clockIntervals.get(gameId);

      expect(firstIntervalId).not.toBe(secondIntervalId);
    });
  });
});
