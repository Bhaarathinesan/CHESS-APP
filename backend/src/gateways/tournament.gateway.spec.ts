import { Test, TestingModule } from '@nestjs/testing';
import { TournamentGateway } from './tournament.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

describe('TournamentGateway', () => {
  let gateway: TournamentGateway;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    tournamentPlayer: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentGateway,
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

    gateway = module.get<TournamentGateway>(TournamentGateway);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock the server
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      in: jest.fn().mockReturnThis(),
      fetchSockets: jest.fn().mockResolvedValue([]),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should authenticate and accept valid connections', async () => {
      const mockClient = {
        id: 'socket-123',
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

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
      mockConfigService.get.mockReturnValue('secret');
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        isBanned: false,
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.data.user).toEqual({
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        isBanned: false,
      });
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connections without token', async () => {
      const mockClient = {
        id: 'socket-123',
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

    it('should reject banned users', async () => {
      const mockClient = {
        id: 'socket-123',
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

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
      mockConfigService.get.mockReturnValue('secret');
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        username: 'banneduser',
        displayName: 'Banned User',
        isBanned: true,
      });

      await gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication failed',
      });
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleJoinTournament', () => {
    it('should allow registered users to join tournament room', async () => {
      const mockClient = {
        id: 'socket-123',
        data: {
          user: {
            id: 'user-123',
            username: 'testuser',
          },
        },
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as Socket;

      mockPrismaService.tournamentPlayer.findUnique.mockResolvedValue({
        tournamentId: 'tournament-123',
        userId: 'user-123',
      });

      const result = await gateway.handleJoinTournament(mockClient, {
        tournamentId: 'tournament-123',
      });

      expect(mockClient.join).toHaveBeenCalledWith('tournament:tournament-123');
      expect(result).toEqual({
        event: 'joined_tournament',
        data: { tournamentId: 'tournament-123' },
      });
    });

    it('should reject non-registered users', async () => {
      const mockClient = {
        id: 'socket-123',
        data: {
          user: {
            id: 'user-123',
            username: 'testuser',
          },
        },
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as Socket;

      mockPrismaService.tournamentPlayer.findUnique.mockResolvedValue(null);

      const result = await gateway.handleJoinTournament(mockClient, {
        tournamentId: 'tournament-123',
      });

      expect(mockClient.join).not.toHaveBeenCalled();
      expect(mockClient.emit).toHaveBeenCalledWith('tournament_error', {
        message: 'You are not registered for this tournament',
      });
      expect(result.event).toBe('tournament_error');
    });
  });

  describe('handleLeaveTournament', () => {
    it('should allow users to leave tournament room', () => {
      const mockClient = {
        id: 'socket-123',
        data: {
          user: {
            id: 'user-123',
            username: 'testuser',
          },
        },
        leave: jest.fn(),
      } as unknown as Socket;

      const result = gateway.handleLeaveTournament(mockClient, {
        tournamentId: 'tournament-123',
      });

      expect(mockClient.leave).toHaveBeenCalledWith('tournament:tournament-123');
      expect(result).toEqual({
        event: 'left_tournament',
        data: { tournamentId: 'tournament-123' },
      });
    });
  });

  describe('broadcastTournamentStarted', () => {
    it('should broadcast tournament_started event to all participants', async () => {
      const tournament = {
        id: 'tournament-123',
        name: 'Test Tournament',
        format: 'SWISS',
        timeControl: 'BLITZ',
        status: 'IN_PROGRESS',
        roundsTotal: 5,
      };

      await gateway.broadcastTournamentStarted('tournament-123', tournament, 1);

      expect(gateway.server.to).toHaveBeenCalledWith('tournament:tournament-123');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        'tournament_started',
        expect.objectContaining({
          tournament: {
            id: 'tournament-123',
            name: 'Test Tournament',
            format: 'SWISS',
            timeControl: 'BLITZ',
            status: 'IN_PROGRESS',
            roundsTotal: 5,
          },
          currentRound: 1,
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  describe('broadcastRoundStarted', () => {
    it('should broadcast round_started event with pairings', async () => {
      const pairings = [
        {
          id: 'pairing-1',
          boardNumber: 1,
          whitePlayerId: 'user-1',
          blackPlayerId: 'user-2',
          isBye: false,
          gameId: 'game-1',
          roundNumber: 1,
        },
      ];

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-1',
          username: 'player1',
          displayName: 'Player 1',
          avatarUrl: null,
        })
        .mockResolvedValueOnce({
          id: 'user-2',
          username: 'player2',
          displayName: 'Player 2',
          avatarUrl: null,
        });

      gateway.server.in = jest.fn().mockReturnThis();
      gateway.server.fetchSockets = jest.fn().mockResolvedValue([]);

      await gateway.broadcastRoundStarted('tournament-123', 1, pairings);

      expect(gateway.server.to).toHaveBeenCalledWith('tournament:tournament-123');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        'round_started',
        expect.objectContaining({
          tournamentId: 'tournament-123',
          roundNumber: 1,
          pairings: expect.arrayContaining([
            expect.objectContaining({
              id: 'pairing-1',
              boardNumber: 1,
              whitePlayer: expect.objectContaining({
                id: 'user-1',
                username: 'player1',
              }),
              blackPlayer: expect.objectContaining({
                id: 'user-2',
                username: 'player2',
              }),
            }),
          ]),
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  describe('broadcastPairingAnnounced', () => {
    it('should send pairing announcement to individual player', async () => {
      const pairing = {
        id: 'pairing-1',
        boardNumber: 1,
        roundNumber: 1,
        whitePlayerId: 'user-1',
        blackPlayerId: 'user-2',
        gameId: 'game-1',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-2',
        username: 'opponent',
        displayName: 'Opponent',
        avatarUrl: null,
      });

      const mockSocket = {
        data: { user: { id: 'user-1' } },
        emit: jest.fn(),
      };

      gateway.server.in = jest.fn().mockReturnThis();
      gateway.server.fetchSockets = jest.fn().mockResolvedValue([mockSocket]);

      await gateway.broadcastPairingAnnounced(
        'tournament-123',
        'user-1',
        pairing,
        'white',
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'pairing_announced',
        expect.objectContaining({
          tournamentId: 'tournament-123',
          pairing: expect.objectContaining({
            id: 'pairing-1',
            boardNumber: 1,
            roundNumber: 1,
          }),
          opponent: expect.objectContaining({
            id: 'user-2',
            username: 'opponent',
          }),
          color: 'white',
          gameId: 'game-1',
          timestamp: expect.any(Number),
        }),
      );
    });

    it('should handle bye rounds gracefully', async () => {
      const pairing = {
        id: 'pairing-1',
        boardNumber: 1,
        roundNumber: 1,
        whitePlayerId: 'user-1',
        blackPlayerId: null,
        gameId: null,
      };

      await gateway.broadcastPairingAnnounced(
        'tournament-123',
        'user-1',
        pairing,
        'white',
      );

      // Should not throw error and should not fetch opponent
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('broadcastStandingsUpdate', () => {
    it('should broadcast standings_updated event', () => {
      const standings = [
        {
          userId: 'user-1',
          username: 'player1',
          displayName: 'Player 1',
          score: 3.0,
          wins: 3,
          losses: 0,
          draws: 0,
          rank: 1,
          buchholzScore: 10.5,
          sonneborBerger: 8.0,
          gamesPlayed: 3,
        },
      ];

      gateway.broadcastStandingsUpdate('tournament-123', standings);

      expect(gateway.server.to).toHaveBeenCalledWith('tournament:tournament-123');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        'standings_updated',
        expect.objectContaining({
          tournamentId: 'tournament-123',
          standings,
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  describe('broadcastTournamentCompleted', () => {
    it('should broadcast tournament_completed event with winners', async () => {
      const standings = [
        {
          userId: 'user-1',
          username: 'player1',
          displayName: 'Player 1',
          score: 5.0,
          wins: 5,
          losses: 0,
          draws: 0,
          rank: 1,
          buchholzScore: 15.0,
          sonneborBerger: 12.0,
          gamesPlayed: 5,
        },
      ];

      const winners = [
        {
          userId: 'user-1',
          rank: 1,
          score: 5.0,
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'player1',
        displayName: 'Player 1',
        avatarUrl: null,
      });

      await gateway.broadcastTournamentCompleted(
        'tournament-123',
        standings,
        winners,
      );

      expect(gateway.server.to).toHaveBeenCalledWith('tournament:tournament-123');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        'tournament_completed',
        expect.objectContaining({
          tournamentId: 'tournament-123',
          finalStandings: standings,
          winners: expect.arrayContaining([
            expect.objectContaining({
              id: 'user-1',
              username: 'player1',
              rank: 1,
              score: 5.0,
            }),
          ]),
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  describe('broadcastTournamentCancelled', () => {
    it('should broadcast tournament_cancelled event', () => {
      gateway.broadcastTournamentCancelled(
        'tournament-123',
        'Minimum players not reached',
      );

      expect(gateway.server.to).toHaveBeenCalledWith('tournament:tournament-123');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        'tournament_cancelled',
        expect.objectContaining({
          tournamentId: 'tournament-123',
          reason: 'Minimum players not reached',
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  describe('broadcastRoundCompleted', () => {
    it('should broadcast round_completed event', async () => {
      const standings = [
        {
          userId: 'user-1',
          username: 'player1',
          displayName: 'Player 1',
          score: 2.0,
          wins: 2,
          losses: 0,
          draws: 0,
          rank: 1,
          buchholzScore: 6.0,
          sonneborBerger: 4.0,
          gamesPlayed: 2,
        },
      ];

      await gateway.broadcastRoundCompleted('tournament-123', 2, standings);

      expect(gateway.server.to).toHaveBeenCalledWith('tournament:tournament-123');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        'round_completed',
        expect.objectContaining({
          tournamentId: 'tournament-123',
          roundNumber: 2,
          standings,
          timestamp: expect.any(Number),
        }),
      );
    });
  });
});
