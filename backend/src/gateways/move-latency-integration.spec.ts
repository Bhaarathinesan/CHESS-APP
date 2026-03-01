import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { LatencyTrackerService } from './services/latency-tracker.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ChessEngineService } from '../chess/chess-engine.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

/**
 * Integration-style test for Task 14.5: Move transmission latency
 * 
 * This test validates latency tracking and monitoring with realistic scenarios
 * 
 * Requirements tested:
 * - 6.1: Transmit moves within 100ms
 * - 26.2: Maximum 100ms latency
 */
describe('Move Transmission Latency - Realistic Scenarios (Task 14.5)', () => {
  let gateway: GameGateway;
  let latencyTracker: LatencyTrackerService;
  let prismaService: PrismaService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  const mockGameId = 'test-game-123';
  const mockWhitePlayerId = 'white-player-id';
  const mockBlackPlayerId = 'black-player-id';

  beforeEach(async () => {
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

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        sockets: new Map(),
      } as any,
    };

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
    latencyTracker = module.get<LatencyTrackerService>(LatencyTrackerService);
    prismaService = module.get<PrismaService>(PrismaService);

    gateway.server = mockServer as Server;
    latencyTracker.resetStatistics();
  });

  it('should measure realistic move latency under 100ms', async () => {
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

    const clientSendTime = Date.now();

    const result = await gateway.handleMakeMove(mockClient as Socket, {
      gameId: mockGameId,
      from: 'e2',
      to: 'e4',
      clientSendTime,
    });

    expect(result.event).toBe('move_success');
    expect(result.data.latency.totalServerTime).toBeLessThan(100);
    
    const latency = result.data.latency;
    console.log('Latency breakdown:');
    console.log(`  Validation: ${latency.validationTime}ms`);
    console.log(`  Broadcast: ${latency.broadcastTime}ms`);
    console.log(`  Total: ${latency.totalServerTime}ms`);
  });

  it('should track latency statistics across multiple moves', async () => {
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

    const moves = [
      { from: 'e2', to: 'e4' },
      { from: 'e7', to: 'e5' },
      { from: 'g1', to: 'f3' },
      { from: 'b8', to: 'c6' },
      { from: 'd2', to: 'd4' },
    ];

    for (const move of moves) {
      await gateway.handleMakeMove(mockClient as Socket, {
        gameId: mockGameId,
        ...move,
        clientSendTime: Date.now(),
      });
    }

    const stats = latencyTracker.getStatistics();
    
    console.log('Latency statistics:');
    console.log(`  Total moves: ${stats.totalMoves}`);
    console.log(`  Average: ${stats.avgLatency.toFixed(2)}ms`);
    console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
    console.log(`  Max: ${stats.max}ms`);

    expect(stats.totalMoves).toBe(moves.length);
    expect(stats.avgLatency).toBeLessThan(100);
    expect(stats.p95).toBeLessThan(100);
    expect(stats.max).toBeLessThan(100);
  });

  it('should provide latency health status', () => {
    // Track some moves first
    latencyTracker.trackMoveLatency(
      {
        serverReceiveTime: Date.now(),
        validationTime: 10,
        broadcastTime: 5,
        totalServerTime: 15,
      },
      mockGameId
    );

    const result = gateway.getLatencyHealth();

    expect(result.event).toBe('latency_health');
    expect(result.data.status).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(result.data.status);
    expect(result.data.stats).toBeDefined();
    expect(result.data.message).toBeDefined();

    console.log('Latency health:', result.data);
  });

  it('should provide detailed latency statistics', () => {
    // Track some moves first
    for (let i = 0; i < 10; i++) {
      latencyTracker.trackMoveLatency(
        {
          serverReceiveTime: Date.now(),
          validationTime: 10 + i,
          broadcastTime: 5,
          totalServerTime: 15 + i,
        },
        mockGameId
      );
    }

    const result = gateway.getLatencyStatistics();

    expect(result.event).toBe('latency_stats');
    expect(result.data.totalMoves).toBeDefined();
    expect(result.data.avgLatency).toBeDefined();
    expect(result.data.p95).toBeDefined();
    expect(result.data.p99).toBeDefined();

    console.log('Latency statistics:', result.data);
  });
});
