import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

describe('GameGateway - Connection/Disconnection Handling', () => {
  let gateway: GameGateway;
  let redisService: RedisService;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let mockServer: Partial<Server>;

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

  describe('handleConnection', () => {
    it('should successfully authenticate and connect a client with valid token', async () => {
      const mockClient = {
        id: 'client-123',
        handshake: {
          headers: {
            authorization: 'Bearer valid-token',
          },
          auth: {},
          query: {},
        },
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'player',
        isBanned: false,
        emailVerified: true,
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 'user-123' });
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      await gateway.handleConnection(mockClient);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          isBanned: true,
          emailVerified: true,
        },
      });
      expect(mockClient.data.user).toEqual(mockUser);
      expect(mockClient.emit).toHaveBeenCalledWith('authenticated', {
        userId: 'user-123',
        username: 'testuser',
      });
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connection when no token is provided', async () => {
      const mockClient = {
        id: 'client-123',
        handshake: {
          headers: {},
          auth: {},
          query: {},
        },
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      await gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication required',
      });
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should reject connection when token is invalid', async () => {
      const mockClient = {
        id: 'client-123',
        handshake: {
          headers: {
            authorization: 'Bearer invalid-token',
          },
          auth: {},
          query: {},
        },
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication failed',
      });
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should reject connection when user is banned', async () => {
      const mockClient = {
        id: 'client-123',
        handshake: {
          headers: {
            authorization: 'Bearer valid-token',
          },
          auth: {},
          query: {},
        },
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'player',
        isBanned: true,
        emailVerified: true,
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 'user-123' });
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      await gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Account is banned',
      });
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should notify opponent within 3 seconds when player disconnects', async () => {
      const mockClient = {
        id: 'client-123',
        rooms: new Set(['game:game-123']),
        data: {
          user: {
            id: 'player-1',
            username: 'player1',
          },
        },
      } as unknown as Socket;

      const gameId = 'game-123';
      const playerId = 'player-1';

      // Set up tracking maps
      const gameRooms = new Map();
      gameRooms.set(gameId, new Set(['client-123', 'client-456']));
      (gateway as any).gameRooms = gameRooms;

      const socketToGame = new Map();
      socketToGame.set('client-123', gameId);
      (gateway as any).socketToGame = socketToGame;

      const playerSockets = new Map();
      playerSockets.set(playerId, 'client-123');
      (gateway as any).playerSockets = playerSockets;

      // Mock Redis clock data
      jest.spyOn(redisService, 'get').mockResolvedValue(
        JSON.stringify({
          whiteTimeRemaining: 300000,
          blackTimeRemaining: 300000,
          currentTurn: 'white',
          lastUpdate: Date.now(),
          isPaused: false,
        }),
      );
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const startTime = Date.now();
      gateway.handleDisconnect(mockClient);

      // Wait a bit to ensure notification is sent
      await new Promise((resolve) => setTimeout(resolve, 100));

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Verify notification was sent within 3 seconds (actually much faster)
      expect(elapsed).toBeLessThan(3000);
      expect(mockServer.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('player_disconnected', {
        gameId,
        playerId,
        pausedAt: expect.any(Number),
      });
    });

    it('should clean up room when last connection leaves', () => {
      const mockClient = {
        id: 'client-123',
        rooms: new Set(['game:game-123']),
        data: {
          user: {
            id: 'player-1',
          },
        },
      } as unknown as Socket;

      const gameId = 'game-123';

      // Set up tracking maps with only one connection
      const gameRooms = new Map();
      gameRooms.set(gameId, new Set(['client-123']));
      (gateway as any).gameRooms = gameRooms;

      const socketToGame = new Map();
      socketToGame.set('client-123', gameId);
      (gateway as any).socketToGame = socketToGame;

      jest.spyOn(redisService, 'delete').mockResolvedValue(undefined);

      gateway.handleDisconnect(mockClient);

      // Verify room was cleaned up
      expect((gateway as any).gameRooms.has(gameId)).toBe(false);
      expect((gateway as any).socketToGame.has('client-123')).toBe(false);
    });

    it('should not clean up room when other connections remain', () => {
      const mockClient = {
        id: 'client-123',
        rooms: new Set(['game:game-123']),
        data: {
          user: {
            id: 'player-1',
          },
        },
      } as unknown as Socket;

      const gameId = 'game-123';

      // Set up tracking maps with multiple connections
      const gameRooms = new Map();
      gameRooms.set(gameId, new Set(['client-123', 'client-456']));
      (gateway as any).gameRooms = gameRooms;

      const socketToGame = new Map();
      socketToGame.set('client-123', gameId);
      socketToGame.set('client-456', gameId);
      (gateway as any).socketToGame = socketToGame;

      gateway.handleDisconnect(mockClient);

      // Verify room still exists
      expect((gateway as any).gameRooms.has(gameId)).toBe(true);
      expect((gateway as any).gameRooms.get(gameId).size).toBe(1);
      expect((gateway as any).gameRooms.get(gameId).has('client-456')).toBe(true);
    });
  });

  describe('handleRegisterPlayer - Reconnection Logic', () => {
    it('should handle player reconnection and resume clock', async () => {
      const mockClient = {
        id: 'client-new-123',
        data: {
          user: {
            id: 'player-1',
          },
        },
      } as unknown as Socket;

      const gameId = 'game-123';
      const playerId = 'player-1';

      // Set up disconnection timeout
      const disconnectionTimeouts = new Map();
      const timeoutId = setTimeout(() => {}, 60000);
      disconnectionTimeouts.set(`disconnect:${gameId}:${playerId}`, timeoutId);
      (gateway as any).disconnectionTimeouts = disconnectionTimeouts;

      // Mock Redis clock data
      jest.spyOn(redisService, 'get').mockResolvedValue(
        JSON.stringify({
          whiteTimeRemaining: 300000,
          blackTimeRemaining: 300000,
          currentTurn: 'white',
          lastUpdate: Date.now(),
          isPaused: true,
          pausedPlayerId: playerId,
          pausedAt: Date.now() - 5000,
        }),
      );
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await gateway.handleRegisterPlayer(mockClient, {
        gameId,
        playerId,
      });

      expect(result.event).toBe('player_registered');
      expect(result.data).toEqual({ gameId, playerId });
      expect(mockServer.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('player_reconnected', {
        gameId,
        playerId,
      });
      expect(disconnectionTimeouts.has(`disconnect:${gameId}:${playerId}`)).toBe(false);
    });

    it('should register new player without reconnection logic', async () => {
      const mockClient = {
        id: 'client-123',
        data: {
          user: {
            id: 'player-1',
          },
        },
      } as unknown as Socket;

      const gameId = 'game-123';
      const playerId = 'player-1';

      // No disconnection timeout exists
      (gateway as any).disconnectionTimeouts = new Map();

      const result = await gateway.handleRegisterPlayer(mockClient, {
        gameId,
        playerId,
      });

      expect(result.event).toBe('player_registered');
      expect(result.data).toEqual({ gameId, playerId });
      expect(mockServer.emit).not.toHaveBeenCalledWith('player_reconnected', expect.any(Object));
    });
  });

  describe('Clock Pause on Disconnection', () => {
    it('should pause player clock when they disconnect', async () => {
      const mockClient = {
        id: 'client-123',
        rooms: new Set(['game:game-123']),
        data: {
          user: {
            id: 'player-1',
          },
        },
      } as unknown as Socket;

      const gameId = 'game-123';
      const playerId = 'player-1';

      // Set up tracking
      const gameRooms = new Map();
      gameRooms.set(gameId, new Set(['client-123', 'client-456']));
      (gateway as any).gameRooms = gameRooms;

      const socketToGame = new Map();
      socketToGame.set('client-123', gameId);
      (gateway as any).socketToGame = socketToGame;

      const playerSockets = new Map();
      playerSockets.set(playerId, 'client-123');
      (gateway as any).playerSockets = playerSockets;

      // Mock Redis clock data
      const clockData = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockData));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      gateway.handleDisconnect(mockClient);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify clock was paused
      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${gameId}`,
        expect.stringContaining('"isPaused":true'),
      );
      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${gameId}`,
        expect.stringContaining(`"pausedPlayerId":"${playerId}"`),
      );
    });

    it('should set up 60-second timeout for clock resume on disconnection', async () => {
      const mockClient = {
        id: 'client-123',
        rooms: new Set(['game:game-123']),
        data: {
          user: {
            id: 'player-1',
          },
        },
      } as unknown as Socket;

      const gameId = 'game-123';
      const playerId = 'player-1';

      // Set up tracking
      const gameRooms = new Map();
      gameRooms.set(gameId, new Set(['client-123', 'client-456']));
      (gateway as any).gameRooms = gameRooms;

      const socketToGame = new Map();
      socketToGame.set('client-123', gameId);
      (gateway as any).socketToGame = socketToGame;

      const playerSockets = new Map();
      playerSockets.set(playerId, 'client-123');
      (gateway as any).playerSockets = playerSockets;

      // Mock Redis clock data
      const clockData = {
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(clockData));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      gateway.handleDisconnect(mockClient);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify disconnection timeout was created
      const disconnectKey = `disconnect:${gameId}:${playerId}`;
      const disconnectionTimeouts = (gateway as any).disconnectionTimeouts;
      expect(disconnectionTimeouts.has(disconnectKey)).toBe(true);
      
      // Clean up the timeout to prevent test hanging
      const timeoutId = disconnectionTimeouts.get(disconnectKey);
      if (timeoutId) {
        clearTimeout(timeoutId);
        disconnectionTimeouts.delete(disconnectKey);
      }
    });
  });

  describe('Connection Count Tracking', () => {
    it('should return correct connection count for active game', () => {
      const gameId = 'game-123';
      const gameRooms = new Map();
      gameRooms.set(gameId, new Set(['client-1', 'client-2', 'client-3']));
      (gateway as any).gameRooms = gameRooms;

      const count = gateway.getGameConnectionCount(gameId);

      expect(count).toBe(3);
    });

    it('should return 0 for non-existent game', () => {
      const gameId = 'non-existent-game';
      (gateway as any).gameRooms = new Map();

      const count = gateway.getGameConnectionCount(gameId);

      expect(count).toBe(0);
    });

    it('should correctly identify active game room', () => {
      const gameId = 'game-123';
      const gameRooms = new Map();
      gameRooms.set(gameId, new Set(['client-1']));
      (gateway as any).gameRooms = gameRooms;

      const isActive = gateway.isGameRoomActive(gameId);

      expect(isActive).toBe(true);
    });

    it('should correctly identify inactive game room', () => {
      const gameId = 'game-123';
      (gateway as any).gameRooms = new Map();

      const isActive = gateway.isGameRoomActive(gameId);

      expect(isActive).toBe(false);
    });
  });
});
