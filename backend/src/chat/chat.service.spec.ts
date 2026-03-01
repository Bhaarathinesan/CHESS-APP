import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: PrismaService;

  const mockPrismaService = {
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMessage', () => {
    const gameId = 'game-123';
    const senderId = 'user-456';
    const validContent = 'Hello, good game!';

    it('should create a message with valid content', async () => {
      const mockMessage = {
        id: 'msg-1',
        gameId,
        senderId,
        message: validContent,
        isSpectator: false,
        createdAt: new Date(),
        sender: {
          id: senderId,
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
        },
      };

      mockPrismaService.chatMessage.create.mockResolvedValue(mockMessage);

      const result = await service.createMessage(gameId, senderId, validContent);

      expect(result).toEqual(mockMessage);
      expect(mockPrismaService.chatMessage.create).toHaveBeenCalledWith({
        data: {
          gameId,
          senderId,
          message: validContent,
          isSpectator: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });
    });

    it('should trim whitespace from message content', async () => {
      const contentWithSpaces = '  Hello  ';
      const mockMessage = {
        id: 'msg-1',
        gameId,
        senderId,
        message: 'Hello',
        isSpectator: false,
        createdAt: new Date(),
        sender: {
          id: senderId,
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
        },
      };

      mockPrismaService.chatMessage.create.mockResolvedValue(mockMessage);

      await service.createMessage(gameId, senderId, contentWithSpaces);

      expect(mockPrismaService.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message: 'Hello',
          }),
        }),
      );
    });

    it('should reject empty messages', async () => {
      await expect(service.createMessage(gameId, senderId, '')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createMessage(gameId, senderId, '   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.chatMessage.create).not.toHaveBeenCalled();
    });

    it('should reject messages exceeding 200 characters (Requirement 19.9)', async () => {
      const longMessage = 'a'.repeat(201);

      await expect(
        service.createMessage(gameId, senderId, longMessage),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createMessage(gameId, senderId, longMessage),
      ).rejects.toThrow('Message cannot exceed 200 characters');
      expect(mockPrismaService.chatMessage.create).not.toHaveBeenCalled();
    });

    it('should accept messages with exactly 200 characters', async () => {
      const maxLengthMessage = 'a'.repeat(200);
      const mockMessage = {
        id: 'msg-1',
        gameId,
        senderId,
        message: maxLengthMessage,
        isSpectator: false,
        createdAt: new Date(),
        sender: {
          id: senderId,
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
        },
      };

      mockPrismaService.chatMessage.create.mockResolvedValue(mockMessage);

      const result = await service.createMessage(gameId, senderId, maxLengthMessage);

      expect(result).toEqual(mockMessage);
      expect(mockPrismaService.chatMessage.create).toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    const gameId = 'game-123';

    it('should retrieve messages for a game ordered by timestamp', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          gameId,
          senderId: 'user-1',
          message: 'First message',
          isSpectator: false,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          sender: {
            id: 'user-1',
            username: 'user1',
            displayName: 'User One',
            avatarUrl: null,
          },
        },
        {
          id: 'msg-2',
          gameId,
          senderId: 'user-2',
          message: 'Second message',
          isSpectator: false,
          createdAt: new Date('2024-01-01T10:01:00Z'),
          sender: {
            id: 'user-2',
            username: 'user2',
            displayName: 'User Two',
            avatarUrl: null,
          },
        },
      ];

      mockPrismaService.chatMessage.findMany.mockResolvedValue(mockMessages);

      const result = await service.getMessages(gameId);

      expect(result).toEqual(mockMessages);
      expect(mockPrismaService.chatMessage.findMany).toHaveBeenCalledWith({
        where: { gameId },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
    });

    it('should use default limit of 50 messages', async () => {
      mockPrismaService.chatMessage.findMany.mockResolvedValue([]);

      await service.getMessages(gameId);

      expect(mockPrismaService.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should respect custom limit parameter', async () => {
      mockPrismaService.chatMessage.findMany.mockResolvedValue([]);

      await service.getMessages(gameId, 20);

      expect(mockPrismaService.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        }),
      );
    });

    it('should return empty array when no messages exist', async () => {
      mockPrismaService.chatMessage.findMany.mockResolvedValue([]);

      const result = await service.getMessages(gameId);

      expect(result).toEqual([]);
    });
  });
});
