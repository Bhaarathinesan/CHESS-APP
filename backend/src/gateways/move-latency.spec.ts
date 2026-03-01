import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChessEngineService } from '../chess/chess-engine.service';
import { LatencyTrackerService } from './services/latency-tracker.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

/**
 * Test suite for Task 14.5: Move transmission with latency optimization
 * 
 * Requirements tested:
 * - 6.1: Transmit moves between players within 100 milliseconds
 * - 26.2: Maximum 100 milliseconds latency for move transmission
 * 
 * This test suite validates:
 * 1. Move transmission latency is under 100ms
 * 2. Optimized message payloads reduce transmission time
 * 3. Latency tracking and monitoring works correctly
 * 4. Binary encoding utilities work correctly
 */
describe('GameGateway - Move Transmission Latency Optimization (Task 14.5)', () => {
  let gateway: GameGateway;
  let prismaService: PrismaService;
  let chessEngine: ChessEngineService;
  let latencyTracker: LatencyTrackerService;
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

    // Mock Socket.IO server with emit timing
    let emitTime = 0;
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn().mockImplementation(() => {
        emitTime = Date.now();
        return true;
      }),
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
        LatencyTrackerService,
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
    latencyTracker = module.get<LatencyTrackerService>(LatencyTrackerService);

    // Set the mock server
    gateway.server = mockServer as Server;

    // Reset latency tracker statistics
    latencyTracker.resetStatistics();
  });

  describe('Requirement 6.1 & 26.2: Sub-100ms Move Transmission', () => {
    it('should transmit a valid move within 100ms', async () => {
      // Arrange
      const startTime = Date.now();
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

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.game.update as jest.Mock).mockResolvedValue({
        ...mockGame,
        moveCount: 1,
      });
      (prismaService.gameMove.create as jest.Mock).mockResolvedValue({});

      // Act
      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e4',
        clientSendTime: startTime,
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Assert
      expect(result.event).toBe('move_success');
      expect(result.data.latency).toBeDefined();
      expect(result.data.latency.totalServerTime).toBeLessThan(100);
      expect(totalTime).toBeLessThan(100);
      
      // Verify latency breakdown
      const latency = result.data.latency;
      expect(latency.validationTime).toBeGreaterThan(0);
      expect(latency.broadcastTime).toBeGreaterThan(0);
      expect(latency.totalServerTime).toBe(
        latency.validationTime + latency.broadcastTime
      );
    });

    it('should track latency for multiple moves', async () => {
      // Arrange
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

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.game.update as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.gameMove.create as jest.Mock).mockResolvedValue({});

      // Act - Make multiple moves
      const moves = [
        { from: 'e2', to: 'e4' },
        { from: 'e7', to: 'e5' },
        { from: 'g1', to: 'f3' },
      ];

      for (const move of moves) {
        await gateway.handleMakeMove(mockClient as Socket, {
          gameId: mockGameId,
          ...move,
          clientSendTime: Date.now(),
        });
      }

      // Assert
      const stats = latencyTracker.getStatistics();
      expect(stats.totalMoves).toBe(moves.length);
      expect(stats.avgLatency).toBeLessThan(100);
      expect(stats.p95).toBeLessThan(100);
      expect(stats.max).toBeLessThan(100);
    });

    it('should warn when move latency approaches threshold', async () => {
      // Arrange
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

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.game.update as jest.Mock).mockImplementation(async () => {
        // Simulate slow database operation
        await new Promise(resolve => setTimeout(resolve, 85));
        return mockGame;
      });
      (prismaService.gameMove.create as jest.Mock).mockResolvedValue({});

      // Act
      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e4',
        clientSendTime: Date.now(),
      });

      // Assert
      expect(result.event).toBe('move_success');
      const stats = latencyTracker.getStatistics();
      expect(stats.warningMoves).toBeGreaterThan(0);
    });
  });

  describe('Optimized Message Payload', () => {
    it('should use optimized payload format for move broadcasts', async () => {
      // Arrange
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

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.game.update as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.gameMove.create as jest.Mock).mockResolvedValue({});

      // Act
      await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'e2',
        to: 'e4',
      });

      // Assert
      expect(mockServer.emit).toHaveBeenCalledWith(
        'move_made',
        expect.objectContaining({
          g: mockGameId, // Optimized: 'g' instead of 'gameId'
          m: expect.any(String), // Optimized: 'm' instead of 'move'
          f: 'e2', // Optimized: 'f' instead of 'from'
          t: 'e4', // Optimized: 't' instead of 'to'
          fen: expect.any(String),
          mc: expect.any(Number), // Optimized: 'mc' instead of 'moveCount'
          wt: expect.any(Number), // Optimized: 'wt' instead of 'whiteTimeRemaining'
          bt: expect.any(Number), // Optimized: 'bt' instead of 'blackTimeRemaining'
          pid: mockWhitePlayerId,
          ts: expect.any(Number), // Server timestamp
        })
      );
    });

    it('should only include optional fields when necessary', async () => {
      // Arrange
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

      (prismaService.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.game.update as jest.Mock).mockResolvedValue(mockGame);
      (prismaService.gameMove.create as jest.Mock).mockResolvedValue({});

      // Act - Make a move that doesn't result in check
      await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        from: 'b1',
        to: 'c3',
      });

      // Assert - Check and checkmate flags should be undefined (not false)
      const emitCall = (mockServer.emit as jest.Mock).mock.calls[0];
      const payload = emitCall[1];
      
      // These should be undefined to save bytes, not false
      expect(payload.ch).toBeUndefined();
      expect(payload.cm).toBeUndefined();
      expect(payload.p).toBeUndefined(); // No promotion
    });
  });

  describe('Latency Tracking and Monitoring', () => {
    it('should provide latency statistics', () => {
      // Arrange - Track some latencies
      latencyTracker.trackMoveLatency(
        {
          serverReceiveTime: Date.now(),
          validationTime: 10,
          broadcastTime: 5,
          totalServerTime: 15,
        },
        mockGameId
      );
      latencyTracker.trackMoveLatency(
        {
          serverReceiveTime: Date.now(),
          validationTime: 20,
          broadcastTime: 10,
          totalServerTime: 30,
        },
        mockGameId
      );

      // Act
      const stats = latencyTracker.getStatistics();

      // Assert
      expect(stats.totalMoves).toBe(2);
      expect(stats.avgLatency).toBe(22.5);
      expect(stats.min).toBe(15);
      expect(stats.max).toBe(30);
      expect(stats.p50).toBeGreaterThan(0);
      expect(stats.p95).toBeGreaterThan(0);
    });

    it('should report healthy status when latency is good', () => {
      // Arrange - Track good latencies
      for (let i = 0; i < 10; i++) {
        latencyTracker.trackMoveLatency(
          {
            serverReceiveTime: Date.now(),
            validationTime: 10,
            broadcastTime: 5,
            totalServerTime: 15,
          },
          mockGameId
        );
      }

      // Act
      const health = latencyTracker.getHealthStatus();

      // Assert
      expect(health.status).toBe('healthy');
      expect(health.stats.avgLatency).toBeLessThan(100);
    });

    it('should report degraded status when p95 exceeds warning threshold', () => {
      // Arrange - Track mostly good latencies with some slow ones
      for (let i = 0; i < 95; i++) {
        latencyTracker.trackMoveLatency(
          {
            serverReceiveTime: Date.now(),
            validationTime: 10,
            broadcastTime: 5,
            totalServerTime: 15,
          },
          mockGameId
        );
      }
      for (let i = 0; i < 5; i++) {
        latencyTracker.trackMoveLatency(
          {
            serverReceiveTime: Date.now(),
            validationTime: 70,
            broadcastTime: 15,
            totalServerTime: 85,
          },
          mockGameId
        );
      }

      // Act
      const health = latencyTracker.getHealthStatus();

      // Assert
      expect(health.status).toBe('degraded');
      expect(health.stats.p95).toBeGreaterThan(80);
    });

    it('should report unhealthy status when >10% of moves are slow', () => {
      // Arrange - Track many slow moves
      for (let i = 0; i < 85; i++) {
        latencyTracker.trackMoveLatency(
          {
            serverReceiveTime: Date.now(),
            validationTime: 10,
            broadcastTime: 5,
            totalServerTime: 15,
          },
          mockGameId
        );
      }
      for (let i = 0; i < 15; i++) {
        latencyTracker.trackMoveLatency(
          {
            serverReceiveTime: Date.now(),
            validationTime: 90,
            broadcastTime: 15,
            totalServerTime: 105,
          },
          mockGameId
        );
      }

      // Act
      const health = latencyTracker.getHealthStatus();

      // Assert
      expect(health.status).toBe('unhealthy');
      expect(health.stats.slowMovePercentage).toBeGreaterThan(10);
    });

    it('should expose latency statistics via WebSocket event', () => {
      // Arrange
      latencyTracker.trackMoveLatency(
        {
          serverReceiveTime: Date.now(),
          validationTime: 10,
          broadcastTime: 5,
          totalServerTime: 15,
        },
        mockGameId
      );

      // Act
      const result = gateway.getLatencyStatistics();

      // Assert
      expect(result.event).toBe('latency_stats');
      expect(result.data).toBeDefined();
      expect(result.data.totalMoves).toBeGreaterThan(0);
    });

    it('should expose latency health via WebSocket event', () => {
      // Arrange
      latencyTracker.trackMoveLatency(
        {
          serverReceiveTime: Date.now(),
          validationTime: 10,
          broadcastTime: 5,
          totalServerTime: 15,
        },
        mockGameId
      );

      // Act
      const result = gateway.getLatencyHealth();

      // Assert
      expect(result.event).toBe('latency_health');
      expect(result.data).toBeDefined();
      expect(result.data.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.data.status);
    });
  });

  describe('Binary Move Encoding (Future Optimization)', () => {
    it('should encode and decode squares correctly', () => {
      const squares = ['a1', 'h8', 'e4', 'd5', 'a8', 'h1'];
      
      for (const square of squares) {
        const encoded = require('./dto/move-message.dto').BinaryMoveEncoder.encodeSquare(square);
        const decoded = require('./dto/move-message.dto').BinaryMoveEncoder.decodeSquare(encoded);
        expect(decoded).toBe(square);
      }
    });

    it('should encode and decode promotion pieces correctly', () => {
      const pieces = ['q', 'r', 'b', 'n'];
      
      for (const piece of pieces) {
        const encoded = require('./dto/move-message.dto').BinaryMoveEncoder.encodePromotion(piece);
        const decoded = require('./dto/move-message.dto').BinaryMoveEncoder.decodePromotion(encoded);
        expect(decoded).toBe(piece);
      }
    });

    it('should encode and decode complete moves correctly', () => {
      const moves = [
        { from: 'e2', to: 'e4' },
        { from: 'e7', to: 'e8', promotion: 'q' },
        { from: 'a1', to: 'h8', promotion: 'n' },
      ];
      
      for (const move of moves) {
        const encoded = require('./dto/move-message.dto').BinaryMoveEncoder.encodeMove(
          move.from,
          move.to,
          move.promotion
        );
        const decoded = require('./dto/move-message.dto').BinaryMoveEncoder.decodeMove(encoded);
        
        expect(decoded.from).toBe(move.from);
        expect(decoded.to).toBe(move.to);
        expect(decoded.promotion).toBe(move.promotion);
      }
    });

    it('should use only 2 bytes for move encoding', () => {
      const encoded = require('./dto/move-message.dto').BinaryMoveEncoder.encodeMove('e2', 'e4');
      expect(encoded.length).toBe(2);
    });
  });
});
