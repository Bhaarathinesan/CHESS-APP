import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakingGateway } from './matchmaking.gateway';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { TimeControl } from '@prisma/client';

describe('MatchmakingGateway', () => {
  let gateway: MatchmakingGateway;
  let matchmakingService: MatchmakingService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  beforeEach(async () => {
    const mockMatchmakingService = {
      joinQueue: jest.fn(),
      leaveQueue: jest.fn(),
      getQueueEntries: jest.fn(),
    };

    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      rating: {
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
        },
      },
      emit: jest.fn(),
      disconnect: jest.fn(),
      handshake: {
        headers: {},
        auth: {},
        query: {},
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakingGateway,
        {
          provide: MatchmakingService,
          useValue: mockMatchmakingService,
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

    gateway = module.get<MatchmakingGateway>(MatchmakingGateway);
    matchmakingService = module.get<MatchmakingService>(MatchmakingService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleJoinQueue', () => {
    it('should join queue and return status', async () => {
      const timeControl = TimeControl.BLITZ;
      const mockStatus = {
        position: 1,
        waitTimeSeconds: 0,
        queueSize: 1,
      };

      jest.spyOn(matchmakingService, 'joinQueue').mockResolvedValue(mockStatus);

      const result = await gateway.handleJoinQueue(mockClient as Socket, {
        timeControl,
        ratingRange: 200,
      });

      expect(matchmakingService.joinQueue).toHaveBeenCalledWith(
        'user-123',
        timeControl,
        200,
      );
      expect(mockClient.emit).toHaveBeenCalledWith('queue_joined', {
        timeControl,
        position: 1,
        queueSize: 1,
        waitTimeSeconds: 0,
      });
      expect(result.event).toBe('queue_joined');
    });

    it('should handle join queue error', async () => {
      const timeControl = TimeControl.BLITZ;
      const errorMessage = 'User is already in BLITZ queue';

      jest
        .spyOn(matchmakingService, 'joinQueue')
        .mockRejectedValue(new Error(errorMessage));

      const result = await gateway.handleJoinQueue(mockClient as Socket, {
        timeControl,
        ratingRange: 200,
      });

      expect(mockClient.emit).toHaveBeenCalledWith('queue_error', {
        message: errorMessage,
      });
      expect(result.event).toBe('queue_error');
    });
  });

  describe('handleLeaveQueue', () => {
    it('should leave queue successfully', async () => {
      jest.spyOn(matchmakingService, 'leaveQueue').mockResolvedValue(true);

      const result = await gateway.handleLeaveQueue(mockClient as Socket);

      expect(matchmakingService.leaveQueue).toHaveBeenCalledWith('user-123');
      expect(mockClient.emit).toHaveBeenCalledWith('queue_left', {
        success: true,
      });
      expect(result.event).toBe('queue_left');
    });

    it('should handle not in queue error', async () => {
      jest.spyOn(matchmakingService, 'leaveQueue').mockResolvedValue(false);

      const result = await gateway.handleLeaveQueue(mockClient as Socket);

      expect(mockClient.emit).toHaveBeenCalledWith('queue_error', {
        message: 'Not in queue',
      });
      expect(result.event).toBe('queue_error');
    });
  });

  describe('notifyMatchFound', () => {
    it('should notify both players when match is found', async () => {
      const player1Id = 'player-1';
      const player2Id = 'player-2';
      const gameId = 'game-123';
      const timeControl = TimeControl.BLITZ;

      const mockPlayer1 = {
        id: player1Id,
        username: 'player1',
        displayName: 'Player One',
        avatarUrl: null,
      };

      const mockPlayer2 = {
        id: player2Id,
        username: 'player2',
        displayName: 'Player Two',
        avatarUrl: null,
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce(mockPlayer1 as any)
        .mockResolvedValueOnce(mockPlayer2 as any);

      jest
        .spyOn(prismaService.rating, 'findUnique')
        .mockResolvedValueOnce({ rating: 1500 } as any)
        .mockResolvedValueOnce({ rating: 1450 } as any);

      // Set up socket tracking
      gateway['userSockets'].set(player1Id, 'socket-1');
      gateway['userSockets'].set(player2Id, 'socket-2');

      await gateway.notifyMatchFound(
        player1Id,
        player2Id,
        gameId,
        timeControl,
        player1Id, // player1 is white
        player2Id, // player2 is black
      );

      expect(mockServer.to).toHaveBeenCalledWith('socket-1');
      expect(mockServer.to).toHaveBeenCalledWith('socket-2');
      expect(mockServer.emit).toHaveBeenCalledTimes(2);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'match_found',
        expect.objectContaining({
          gameId,
          color: 'white',
          timeControl,
        }),
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        'match_found',
        expect.objectContaining({
          gameId,
          color: 'black',
          timeControl,
        }),
      );
    });
  });
});
