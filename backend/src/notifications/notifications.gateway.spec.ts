import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGateway } from './notifications.gateway';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Socket } from 'socket.io';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let jwtService: JwtService;
  let prisma: PrismaService;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockPrismaService = {
    notification: {
      count: jest.fn(),
    },
  };

  const mockSocket = {
    id: 'socket-1',
    handshake: {
      auth: { token: 'valid-token' },
      headers: {},
    },
    data: {},
    emit: jest.fn(),
    join: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as Socket;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    jwtService = module.get<JwtService>(JwtService);
    prisma = module.get<PrismaService>(PrismaService);

    gateway.server = mockServer as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should accept valid connection and send unread count', async () => {
      const userId = 'user-1';
      mockJwtService.verify.mockReturnValue({ sub: userId });
      mockPrismaService.notification.count.mockResolvedValue(5);

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.data.userId).toBe(userId);
      expect(mockSocket.emit).toHaveBeenCalledWith('unread_count', { count: 5 });
      expect(gateway.isUserConnected(userId)).toBe(true);
    });

    it('should disconnect client without token', async () => {
      const socketWithoutToken = {
        ...mockSocket,
        handshake: { auth: {}, headers: {} },
      } as unknown as Socket;

      await gateway.handleConnection(socketWithoutToken);

      expect(socketWithoutToken.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client with invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle token from authorization header', async () => {
      const userId = 'user-1';
      const socketWithHeader = {
        ...mockSocket,
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer valid-token' },
        },
      } as unknown as Socket;

      mockJwtService.verify.mockReturnValue({ sub: userId });
      mockPrismaService.notification.count.mockResolvedValue(0);

      await gateway.handleConnection(socketWithHeader);

      expect(socketWithHeader.data.userId).toBe(userId);
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket from user mapping', async () => {
      const userId = 'user-1';
      mockJwtService.verify.mockReturnValue({ sub: userId });
      mockPrismaService.notification.count.mockResolvedValue(0);

      await gateway.handleConnection(mockSocket);
      expect(gateway.isUserConnected(userId)).toBe(true);

      gateway.handleDisconnect(mockSocket);
      expect(gateway.isUserConnected(userId)).toBe(false);
    });

    it('should handle disconnect for socket without userId', () => {
      const socketWithoutUser = { ...mockSocket, data: {} } as unknown as Socket;

      expect(() => gateway.handleDisconnect(socketWithoutUser)).not.toThrow();
    });
  });

  describe('handleSubscribe', () => {
    it('should subscribe user to notifications', () => {
      mockSocket.data.userId = 'user-1';

      const result = gateway.handleSubscribe(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('user:user-1');
      expect(result).toEqual({ success: true });
    });

    it('should reject subscription without userId', () => {
      mockSocket.data.userId = null;

      const result = gateway.handleSubscribe(mockSocket);

      expect(result).toEqual({ error: 'Unauthorized' });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('sendNotificationToUser', () => {
    it('should send notification and update unread count', async () => {
      const userId = 'user-1';
      const notification = {
        id: 'notif-1',
        userId,
        type: 'game_challenge',
        title: 'Test',
        message: 'Test message',
        data: {},
        isRead: false,
        linkUrl: null,
        createdAt: new Date(),
        readAt: null,
      };

      mockPrismaService.notification.count.mockResolvedValue(3);

      await gateway.sendNotificationToUser(userId, notification);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('notification', { notification });
      expect(mockServer.emit).toHaveBeenCalledWith('unread_count', { count: 3 });
    });
  });

  describe('broadcastAchievementUnlocked', () => {
    it('should broadcast achievement to user', async () => {
      const userId = 'user-1';
      const achievement = {
        id: 'ach-1',
        name: 'First Victory',
        description: 'Win your first game',
        points: 10,
      };

      await gateway.broadcastAchievementUnlocked(userId, achievement);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('achievement_unlocked', { achievement });
    });
  });

  describe('broadcastFriendOnline', () => {
    it('should broadcast friend online to followers', async () => {
      const followerIds = ['follower-1', 'follower-2'];
      const user = { id: 'user-1', username: 'john' };

      await gateway.broadcastFriendOnline(followerIds, user);

      expect(mockServer.to).toHaveBeenCalledTimes(2);
      expect(mockServer.emit).toHaveBeenCalledWith('friend_online', {
        userId: user.id,
        userName: user.username,
      });
    });
  });

  describe('broadcastChallengeReceived', () => {
    it('should broadcast challenge to user', async () => {
      const userId = 'user-1';
      const challenge = {
        challengeId: 'challenge-1',
        challenger: {
          id: 'challenger-1',
          username: 'john',
          displayName: 'John Doe',
        },
        timeControl: 'blitz',
      };

      await gateway.broadcastChallengeReceived(userId, challenge);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('challenge_received', challenge);
    });
  });

  describe('broadcastTournamentStarting', () => {
    it('should broadcast tournament starting to multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const tournament = {
        id: 'tournament-1',
        name: 'Test Tournament',
        minutesUntilStart: 5,
      };

      await gateway.broadcastTournamentStarting(userIds, tournament);

      expect(mockServer.to).toHaveBeenCalledTimes(3);
      expect(mockServer.emit).toHaveBeenCalledWith('tournament_starting', tournament);
    });
  });

  describe('broadcastGameEnd', () => {
    it('should broadcast game end to user', async () => {
      const userId = 'user-1';
      const gameResult = {
        gameId: 'game-1',
        result: 'win',
        reason: 'checkmate',
        ratingChange: 20,
      };

      await gateway.broadcastGameEnd(userId, gameResult);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('game_ended', gameResult);
    });
  });

  describe('utility methods', () => {
    it('should track connected users', async () => {
      const userId = 'user-1';
      mockJwtService.verify.mockReturnValue({ sub: userId });
      mockPrismaService.notification.count.mockResolvedValue(0);

      expect(gateway.isUserConnected(userId)).toBe(false);
      expect(gateway.getConnectedUserCount()).toBe(0);

      await gateway.handleConnection(mockSocket);

      expect(gateway.isUserConnected(userId)).toBe(true);
      expect(gateway.getConnectedUserCount()).toBe(1);
      expect(gateway.getUserSocketCount(userId)).toBe(1);
    });

    it('should handle multiple sockets for same user', async () => {
      const userId = 'user-1';
      const socket2 = { ...mockSocket, id: 'socket-2', data: {} } as unknown as Socket;

      mockJwtService.verify.mockReturnValue({ sub: userId });
      mockPrismaService.notification.count.mockResolvedValue(0);

      await gateway.handleConnection(mockSocket);
      await gateway.handleConnection(socket2);

      expect(gateway.getUserSocketCount(userId)).toBe(2);
      expect(gateway.getConnectedUserCount()).toBe(1);

      gateway.handleDisconnect(mockSocket);
      expect(gateway.getUserSocketCount(userId)).toBe(1);
      expect(gateway.isUserConnected(userId)).toBe(true);

      gateway.handleDisconnect(socket2);
      expect(gateway.isUserConnected(userId)).toBe(false);
    });
  });
});
