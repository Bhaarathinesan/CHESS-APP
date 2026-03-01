import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

describe('GameGateway - WebSocket Authentication', () => {
  let gateway: GameGateway;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

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
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'auth.jwt.secret') return 'test-secret';
        return null;
      }),
    };

    // Mock Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
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
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection - JWT Token Validation', () => {
    it('should authenticate valid JWT token and attach user data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'player',
        isBanned: false,
        emailVerified: true,
      };

      mockClient = {
        id: 'socket-123',
        handshake: {
          headers: {
            authorization: 'Bearer valid-token',
          },
          auth: {},
          query: {},
        } as any,
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 'user-123' });
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      await gateway.handleConnection(mockClient as Socket);

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
        userId: mockUser.id,
        username: mockUser.username,
      });
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connection when no token is provided', async () => {
      mockClient = {
        id: 'socket-123',
        handshake: {
          headers: {},
          auth: {},
          query: {},
        } as any,
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication required',
      });
      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should reject connection when JWT token is invalid', async () => {
      mockClient = {
        id: 'socket-123',
        handshake: {
          headers: {
            authorization: 'Bearer invalid-token',
          },
          auth: {},
          query: {},
        } as any,
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication failed',
      });
      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should reject connection when user does not exist', async () => {
      mockClient = {
        id: 'socket-123',
        handshake: {
          headers: {
            authorization: 'Bearer valid-token',
          },
          auth: {},
          query: {},
        } as any,
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 'user-123' });
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'User not found',
      });
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should reject connection when user is banned', async () => {
      const mockBannedUser = {
        id: 'user-123',
        email: 'banned@example.com',
        username: 'banneduser',
        displayName: 'Banned User',
        role: 'player',
        isBanned: true,
        emailVerified: true,
      };

      mockClient = {
        id: 'socket-123',
        handshake: {
          headers: {
            authorization: 'Bearer valid-token',
          },
          auth: {},
          query: {},
        } as any,
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 'user-123' });
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockBannedUser as any);

      await gateway.handleConnection(mockClient as Socket);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Account is banned',
      });
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should extract token from query parameter as fallback', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'player',
        isBanned: false,
        emailVerified: true,
      };

      mockClient = {
        id: 'socket-123',
        handshake: {
          headers: {},
          auth: {},
          query: {
            token: 'query-token',
          },
        } as any,
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 'user-123' });
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      await gateway.handleConnection(mockClient as Socket);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('query-token', {
        secret: 'test-secret',
      });
      expect(mockClient.data.user).toEqual(mockUser);
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should extract token from auth parameter as fallback', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'player',
        isBanned: false,
        emailVerified: true,
      };

      mockClient = {
        id: 'socket-123',
        handshake: {
          headers: {},
          auth: {
            token: 'auth-token',
          },
          query: {},
        } as any,
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 'user-123' });
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      await gateway.handleConnection(mockClient as Socket);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('auth-token', {
        secret: 'test-secret',
      });
      expect(mockClient.data.user).toEqual(mockUser);
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Token Extraction', () => {
    it('should prioritize Authorization header over query/auth params', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'player',
        isBanned: false,
        emailVerified: true,
      };

      mockClient = {
        id: 'socket-123',
        handshake: {
          headers: {
            authorization: 'Bearer header-token',
          },
          auth: {
            token: 'auth-token',
          },
          query: {
            token: 'query-token',
          },
        } as any,
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 'user-123' });
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      await gateway.handleConnection(mockClient as Socket);

      // Should use the header token, not query or auth
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('header-token', {
        secret: 'test-secret',
      });
    });
  });
});
