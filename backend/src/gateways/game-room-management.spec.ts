import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

describe('GameGateway - Room Management', () => {
  let gateway: GameGateway;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn().mockResolvedValue(true),
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
    get: jest.fn((key: string) => {
      if (key === 'auth.jwt.secret') return 'test-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        { provide: RedisService, useValue: mockRedisService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);

    // Initialize the server mock
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        sockets: new Map(),
      },
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Room Join Logic', () => {
    it('should track active connections when player joins game', async () => {
      const gameId = 'game-123';
      const userId = 'user-456';
      const mockSocket = {
        id: 'socket-789',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        data: { user: { id: userId } },
      } as unknown as Socket;

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'active',
        whitePlayerId: userId,
        blackPlayerId: 'other-user',
      });

      const result = await gateway.handleJoinGame(mockSocket, { gameId });

      expect(mockSocket.join).toHaveBeenCalledWith(`game:${gameId}`);
      expect(result.event).toBe('joined_game');
      expect(result.data.connectionCount).toBe(1);
      expect(gateway.getGameConnectionCount(gameId)).toBe(1);
    });

    it('should increment connection count when multiple clients join', async () => {
      const gameId = 'game-123';
      const mockSocket1 = {
        id: 'socket-1',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        data: { user: { id: 'user-1' } },
      } as unknown as Socket;

      const mockSocket2 = {
        id: 'socket-2',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        data: { user: { id: 'user-2' } },
      } as unknown as Socket;

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'active',
        whitePlayerId: 'user-1',
        blackPlayerId: 'user-2',
      });

      await gateway.handleJoinGame(mockSocket1, { gameId });
      const result2 = await gateway.handleJoinGame(mockSocket2, { gameId });

      expect(result2.data.connectionCount).toBe(2);
      expect(gateway.getGameConnectionCount(gameId)).toBe(2);
    });

    it('should identify spectators correctly', async () => {
      const gameId = 'game-123';
      const spectatorId = 'spectator-456';
      const mockSocket = {
        id: 'socket-789',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        data: { user: { id: spectatorId } },
      } as unknown as Socket;

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'active',
        whitePlayerId: 'player-1',
        blackPlayerId: 'player-2',
      });

      mockPrismaService.game.update.mockResolvedValue({});

      const result = await gateway.handleJoinGame(mockSocket, { gameId });

      expect(result.data.isSpectator).toBe(true);
      expect(result.data.isPlayer).toBe(false);
    });

    it('should return error when joining non-existent game', async () => {
      const gameId = 'non-existent-game';
      const mockSocket = {
        id: 'socket-789',
        join: jest.fn(),
        data: { user: { id: 'user-456' } },
      } as unknown as Socket;

      mockPrismaService.game.findUnique.mockResolvedValue(null);

      const result = await gateway.handleJoinGame(mockSocket, { gameId });

      expect(result.event).toBe('join_game_error');
      expect(result.data.message).toBe('Game not found');
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('Room Leave Logic', () => {
    it('should decrement connection count when player leaves', async () => {
      const gameId = 'game-123';
      const mockSocket = {
        id: 'socket-789',
        join: jest.fn(),
        leave: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        data: { user: { id: 'user-456' } },
      } as unknown as Socket;

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'active',
        whitePlayerId: 'user-456',
        blackPlayerId: 'other-user',
      });

      mockPrismaService.game.update.mockResolvedValue({});

      // Join first
      await gateway.handleJoinGame(mockSocket, { gameId });
      expect(gateway.getGameConnectionCount(gameId)).toBe(1);

      // Then leave
      await gateway.handleLeaveGame(mockSocket, { gameId });

      expect(mockSocket.leave).toHaveBeenCalledWith(`game:${gameId}`);
      expect(gateway.getGameConnectionCount(gameId)).toBe(0);
    });

    it('should clean up room when last connection leaves', async () => {
      const gameId = 'game-123';
      const mockSocket = {
        id: 'socket-789',
        join: jest.fn(),
        leave: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        data: { user: { id: 'user-456' } },
      } as unknown as Socket;

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'active',
        whitePlayerId: 'user-456',
        blackPlayerId: 'other-user',
      });

      mockPrismaService.game.update.mockResolvedValue({});

      // Join and leave
      await gateway.handleJoinGame(mockSocket, { gameId });
      await gateway.handleLeaveGame(mockSocket, { gameId });

      expect(gateway.isGameRoomActive(gameId)).toBe(false);
    });
  });

  describe('Room Cleanup on Game End', () => {
    it('should clean up all resources when game ends', async () => {
      const gameId = 'game-123';
      
      // Set up some resources
      mockRedisService.delete.mockResolvedValue(true);

      await gateway.handleGameEnd(gameId, 'white_win', 'checkmate');

      expect(mockRedisService.delete).toHaveBeenCalledWith(`clock:${gameId}`);
      expect(mockRedisService.delete).toHaveBeenCalledWith(`draw_offer:${gameId}`);
      expect(gateway.isGameRoomActive(gameId)).toBe(false);
    });

    it('should notify all clients when game ends', async () => {
      const gameId = 'game-123';
      const emitSpy = jest.spyOn(gateway.server.to(`game:${gameId}`) as any, 'emit');

      await gateway.handleGameEnd(gameId, 'black_win', 'resignation');

      expect(gateway.server.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(emitSpy).toHaveBeenCalledWith('game_ended', {
        gameId,
        result: 'black_win',
        terminationReason: 'resignation',
      });
    });
  });

  describe('Connection Tracking', () => {
    it('should return correct connection count', async () => {
      const gameId = 'game-123';
      
      expect(gateway.getGameConnectionCount(gameId)).toBe(0);

      const mockSocket = {
        id: 'socket-789',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        data: { user: { id: 'user-456' } },
      } as unknown as Socket;

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'active',
        whitePlayerId: 'user-456',
        blackPlayerId: 'other-user',
      });

      await gateway.handleJoinGame(mockSocket, { gameId });

      expect(gateway.getGameConnectionCount(gameId)).toBe(1);
    });

    it('should correctly identify active game rooms', async () => {
      const gameId = 'game-123';
      
      expect(gateway.isGameRoomActive(gameId)).toBe(false);

      const mockSocket = {
        id: 'socket-789',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        data: { user: { id: 'user-456' } },
      } as unknown as Socket;

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'active',
        whitePlayerId: 'user-456',
        blackPlayerId: 'other-user',
      });

      await gateway.handleJoinGame(mockSocket, { gameId });

      expect(gateway.isGameRoomActive(gameId)).toBe(true);
    });
  });

  describe('Spectator Count Management', () => {
    it('should update spectator count when spectator joins', async () => {
      const gameId = 'game-123';
      const spectatorSocket = {
        id: 'socket-spectator',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        data: { user: { id: 'spectator-1' } },
      } as unknown as Socket;

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'active',
        whitePlayerId: 'player-1',
        blackPlayerId: 'player-2',
      });

      mockPrismaService.game.update.mockResolvedValue({});

      // Add socket to server's socket map
      gateway.server.sockets.sockets.set('socket-spectator', spectatorSocket);

      await gateway.handleJoinGame(spectatorSocket, { gameId });

      // Verify spectator count update was called
      expect(mockPrismaService.game.update).toHaveBeenCalled();
    });
  });

  describe('Disconnect Handling', () => {
    it('should remove socket from room on disconnect', async () => {
      const gameId = 'game-123';
      const mockSocket = {
        id: 'socket-789',
        join: jest.fn(),
        leave: jest.fn(),
        rooms: new Set([`game:${gameId}`, 'socket-789']),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        data: { user: { id: 'user-456' } },
      } as unknown as Socket;

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'active',
        whitePlayerId: 'user-456',
        blackPlayerId: 'other-user',
      });

      // Join first
      await gateway.handleJoinGame(mockSocket, { gameId });
      expect(gateway.getGameConnectionCount(gameId)).toBe(1);

      // Simulate disconnect
      gateway.handleDisconnect(mockSocket);

      expect(gateway.getGameConnectionCount(gameId)).toBe(0);
    });
  });
});
