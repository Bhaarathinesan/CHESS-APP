import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from '../chat/chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: ChatService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  beforeEach(async () => {
    const mockChatService = {
      createMessage: jest.fn(),
      getMessages: jest.fn(),
    };

    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      game: {
        findUnique: jest.fn(),
      },
    };

    const mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockClient = {
      id: 'test-client-id',
      data: {
        user: {
          id: 'user-123',
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
        },
      },
      emit: jest.fn(),
      disconnect: jest.fn(),
      to: jest.fn().mockReturnThis(),
      join: jest.fn(),
      leave: jest.fn(),
      handshake: {
        headers: {},
        auth: {},
        query: {},
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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

    gateway = module.get<ChatGateway>(ChatGateway);
    chatService = module.get<ChatService>(ChatService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should authenticate and accept valid connection', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        isBanned: false,
      };

      const clientWithToken = {
        ...mockClient,
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
          auth: {},
          query: {},
        } as any,
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 'user-123' });
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      await gateway.handleConnection(clientWithToken as Socket);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isBanned: true,
        },
      });
      expect(clientWithToken.data.user).toEqual(mockUser);
      expect(clientWithToken.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connection without token', async () => {
      const clientWithoutToken = {
        ...mockClient,
        handshake: {
          headers: {},
          auth: {},
          query: {},
        } as any,
      };

      await gateway.handleConnection(clientWithoutToken as Socket);

      expect(clientWithoutToken.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication required',
      });
      expect(clientWithoutToken.disconnect).toHaveBeenCalled();
    });

    it('should reject connection for banned user', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: null,
        isBanned: true,
      };

      const clientWithToken = {
        ...mockClient,
        handshake: {
          headers: { authorization: 'Bearer valid-token' },
          auth: {},
          query: {},
        } as any,
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 'user-123' });
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      await gateway.handleConnection(clientWithToken as Socket);

      expect(clientWithToken.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication failed',
      });
      expect(clientWithToken.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleSendMessage', () => {
    it('should send message and broadcast to game room', async () => {
      const gameId = 'game-123';
      const message = 'Hello, opponent!';
      const mockGame = {
        id: gameId,
        whitePlayerId: 'user-123',
        blackPlayerId: 'user-456',
        status: 'active',
      };
      const mockChatMessage = {
        id: 'msg-123',
        gameId,
        senderId: 'user-123',
        message,
        createdAt: new Date(),
        sender: {
          id: 'user-123',
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
        },
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(chatService, 'createMessage').mockResolvedValue(mockChatMessage as any);

      const result = await gateway.handleSendMessage(mockClient as Socket, {
        gameId,
        message,
      });

      expect(prismaService.game.findUnique).toHaveBeenCalledWith({
        where: { id: gameId },
        select: {
          id: true,
          whitePlayerId: true,
          blackPlayerId: true,
          status: true,
        },
      });
      expect(chatService.createMessage).toHaveBeenCalledWith(
        gameId,
        'user-123',
        message,
      );
      expect(mockServer.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('message_received', {
        id: mockChatMessage.id,
        gameId: mockChatMessage.gameId,
        sender: {
          id: mockChatMessage.sender.id,
          username: mockChatMessage.sender.username,
          displayName: mockChatMessage.sender.displayName,
          avatarUrl: mockChatMessage.sender.avatarUrl,
        },
        message: mockChatMessage.message,
        createdAt: mockChatMessage.createdAt,
      });
      expect(result.event).toBe('message_sent');
      expect(result.data.success).toBe(true);
    });

    it('should reject message if game not found', async () => {
      const gameId = 'game-123';
      const message = 'Hello!';

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(null);

      const result = await gateway.handleSendMessage(mockClient as Socket, {
        gameId,
        message,
      });

      expect(mockClient.emit).toHaveBeenCalledWith('chat_error', {
        message: 'Game not found',
      });
      expect(result.event).toBe('chat_error');
    });

    it('should reject message if user not in game', async () => {
      const gameId = 'game-123';
      const message = 'Hello!';
      const mockGame = {
        id: gameId,
        whitePlayerId: 'user-456',
        blackPlayerId: 'user-789',
        status: 'active',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      const result = await gateway.handleSendMessage(mockClient as Socket, {
        gameId,
        message,
      });

      expect(mockClient.emit).toHaveBeenCalledWith('chat_error', {
        message: 'You are not a player in this game',
      });
      expect(result.event).toBe('chat_error');
    });
  });

  describe('handleTypingStart', () => {
    it('should broadcast typing indicator to game room', async () => {
      const gameId = 'game-123';
      const mockGame = {
        whitePlayerId: 'user-123',
        blackPlayerId: 'user-456',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      const result = await gateway.handleTypingStart(mockClient as Socket, {
        gameId,
      });

      expect(prismaService.game.findUnique).toHaveBeenCalledWith({
        where: { id: gameId },
        select: {
          whitePlayerId: true,
          blackPlayerId: true,
        },
      });
      expect(mockClient.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockClient.emit).toHaveBeenCalledWith('user_typing', {
        gameId,
        userId: 'user-123',
        username: 'testuser',
      });
      expect(result.event).toBe('typing_started');
    });

    it('should not broadcast if user not in game', async () => {
      const gameId = 'game-123';
      const mockGame = {
        whitePlayerId: 'user-456',
        blackPlayerId: 'user-789',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      await gateway.handleTypingStart(mockClient as Socket, { gameId });

      expect(mockClient.to).not.toHaveBeenCalled();
    });
  });

  describe('handleTypingStop', () => {
    it('should broadcast typing stopped to game room', async () => {
      const gameId = 'game-123';
      const mockGame = {
        whitePlayerId: 'user-123',
        blackPlayerId: 'user-456',
      };

      jest.spyOn(prismaService.game, 'findUnique').mockResolvedValue(mockGame as any);

      const result = await gateway.handleTypingStop(mockClient as Socket, {
        gameId,
      });

      expect(prismaService.game.findUnique).toHaveBeenCalledWith({
        where: { id: gameId },
        select: {
          whitePlayerId: true,
          blackPlayerId: true,
        },
      });
      expect(mockClient.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockClient.emit).toHaveBeenCalledWith('user_stopped_typing', {
        gameId,
        userId: 'user-123',
      });
      expect(result.event).toBe('typing_stopped');
    });
  });

  describe('joinGameRoom', () => {
    it('should join client to game room', async () => {
      const gameId = 'game-123';

      await gateway.joinGameRoom(mockClient as Socket, gameId);

      expect(mockClient.join).toHaveBeenCalledWith(`game:${gameId}`);
    });
  });

  describe('leaveGameRoom', () => {
    it('should remove client from game room', async () => {
      const gameId = 'game-123';

      await gateway.leaveGameRoom(mockClient as Socket, gameId);

      expect(mockClient.leave).toHaveBeenCalledWith(`game:${gameId}`);
    });
  });
});
