import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChessEngineService } from '../chess/chess-engine.service';
import { LatencyTrackerService } from './services/latency-tracker.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

describe('GameGateway - Game State Synchronization (Task 14.7)', () => {
  let gateway: GameGateway;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  const mockGameId = 'test-game-123';
  const mockUserId = 'user-123';
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

    const mockChessEngineService = {
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
    };

    const mockLatencyTrackerService = {
      trackMoveLatency: jest.fn(),
      getStatistics: jest.fn(),
      getHealthStatus: jest.fn(),
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
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      data: {
        user: {
          id: mockUserId,
          username: 'testuser',
          email: 'test@example.com',
          role: 'player',
        },
      },
      rooms: new Set([`game:${mockGameId}`]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ChessEngineService, useValue: mockChessEngineService },
        { provide: LatencyTrackerService, useValue: mockLatencyTrackerService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    prismaServi