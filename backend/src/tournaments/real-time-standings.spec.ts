import { TournamentGateway } from '../gateways/tournament.gateway';
import { StandingsService } from './standings.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Test suite for real-time standings updates
 * Requirements: 12.1
 * 
 * Tests that standings are updated and broadcast in real-time after each tournament game completes
 */
describe('Real-Time Standings Updates (Requirement 12.1)', () => {
  let tournamentGateway: TournamentGateway;
  let standingsService: StandingsService;
  let mockPrismaService: any;

  beforeEach(() => {
    mockPrismaService = {
      tournament: {
        findUnique: jest.fn(),
      },
      tournamentPlayer: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      tournamentPairing: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((operations) => Promise.all(operations)),
    };

    standingsService = new StandingsService(mockPrismaService as PrismaService);
    tournamentGateway = new TournamentGateway();

    // Mock the server emit method
    tournamentGateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    jest.clearAllMocks();
  });

  describe('TournamentGateway.broadcastStandingsUpdate', () => {
    it('should broadcast standings to all tournament participants', () => {
      // Arrange
      const tournamentId = 'tournament-456';
      const standings = [
        {
          userId: 'player-1',
          username: 'player1',
          displayName: 'Player One',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          buchholzScore: 1.5,
          sonneborBerger: 2.0,
          rank: 1,
          gamesPlayed: 2,
        },
      ];

      // Act
      tournamentGateway.broadcastStandingsUpdate(tournamentId, standings);

      // Assert
      expect(tournamentGateway.server.to).toHaveBeenCalledWith(`tournament:${tournamentId}`);
      expect(tournamentGateway.server.emit).toHaveBeenCalledWith(
        'standings_updated',
        expect.objectContaining({
          tournamentId,
          standings,
          timestamp: expect.any(Number),
        }),
      );
    });

    it('should include timestamp in broadcast', () => {
      // Arrange
      const tournamentId = 'tournament-456';
      const standings = [];
      const beforeTimestamp = Date.now();

      // Act
      tournamentGateway.broadcastStandingsUpdate(tournamentId, standings);

      // Assert
      const emitCall = (tournamentGateway.server.emit as jest.Mock).mock.calls[0];
      const payload = emitCall[1];
      expect(payload.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(payload.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should broadcast to correct room format', () => {
      // Arrange
      const tournamentId = 'tournament-123';
      const standings = [];

      // Act
      tournamentGateway.broadcastStandingsUpdate(tournamentId, standings);

      // Assert
      expect(tournamentGateway.server.to).toHaveBeenCalledWith('tournament:tournament-123');
    });
  });

  describe('Integration: Standings calculation and broadcast', () => {
    it('should calculate and format standings correctly for broadcast', async () => {
      // Arrange
      const tournamentId = 'tournament-456';

      const mockTournament = {
        id: tournamentId,
        tiebreakCriteria: 'buchholz',
      };

      const mockPlayers = [
        {
          userId: 'player-1',
          user: {
            id: 'player-1',
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-2',
          user: {
            id: 'player-2',
            username: 'player2',
            displayName: 'Player Two',
            avatarUrl: null,
          },
        },
      ];

      const mockPairings = [
        {
          whitePlayerId: 'player-1',
          blackPlayerId: 'player-2',
          result: 'WHITE_WIN',
          isBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue(mockPlayers);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(mockPairings);
      mockPrismaService.tournamentPlayer.update.mockResolvedValue({});

      // Act
      const standings = await standingsService.calculateStandings(tournamentId);
      tournamentGateway.broadcastStandingsUpdate(tournamentId, standings);

      // Assert
      expect(standings).toHaveLength(2);
      expect(standings[0]).toMatchObject({
        userId: 'player-1',
        score: 1,
        wins: 1,
        losses: 0,
        rank: 1,
      });
      expect(standings[1]).toMatchObject({
        userId: 'player-2',
        score: 0,
        wins: 0,
        losses: 1,
        rank: 2,
      });

      expect(tournamentGateway.server.emit).toHaveBeenCalledWith(
        'standings_updated',
        expect.objectContaining({
          tournamentId,
          standings: expect.arrayContaining([
            expect.objectContaining({ userId: 'player-1', rank: 1 }),
            expect.objectContaining({ userId: 'player-2', rank: 2 }),
          ]),
        }),
      );
    });

    it('should handle multiple games and update standings correctly', async () => {
      // Arrange
      const tournamentId = 'tournament-789';

      const mockTournament = {
        id: tournamentId,
        tiebreakCriteria: 'buchholz',
      };

      const mockPlayers = [
        {
          userId: 'player-1',
          user: {
            id: 'player-1',
            username: 'player1',
            displayName: 'Player One',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-2',
          user: {
            id: 'player-2',
            username: 'player2',
            displayName: 'Player Two',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-3',
          user: {
            id: 'player-3',
            username: 'player3',
            displayName: 'Player Three',
            avatarUrl: null,
          },
        },
      ];

      const mockPairings = [
        // Round 1
        {
          whitePlayerId: 'player-1',
          blackPlayerId: 'player-2',
          result: 'WHITE_WIN',
          isBye: false,
        },
        // Round 2
        {
          whitePlayerId: 'player-1',
          blackPlayerId: 'player-3',
          result: 'DRAW',
          isBye: false,
        },
        {
          whitePlayerId: 'player-2',
          blackPlayerId: 'player-3',
          result: 'BLACK_WIN',
          isBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue(mockPlayers);
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue(mockPairings);
      mockPrismaService.tournamentPlayer.update.mockResolvedValue({});

      // Act
      const standings = await standingsService.calculateStandings(tournamentId);
      tournamentGateway.broadcastStandingsUpdate(tournamentId, standings);

      // Assert
      expect(standings).toHaveLength(3);
      
      // Player 1: 1 win + 1 draw = 1.5 points
      expect(standings[0]).toMatchObject({
        userId: 'player-1',
        score: 1.5,
        wins: 1,
        draws: 1,
        rank: 1,
      });

      // Player 3: 1 win + 1 draw = 1.5 points
      expect(standings[1]).toMatchObject({
        userId: 'player-3',
        score: 1.5,
        wins: 1,
        draws: 1,
        rank: 2,
      });

      // Player 2: 2 losses = 0 points
      expect(standings[2]).toMatchObject({
        userId: 'player-2',
        score: 0,
        losses: 2,
        rank: 3,
      });

      expect(tournamentGateway.server.emit).toHaveBeenCalledWith(
        'standings_updated',
        expect.objectContaining({
          tournamentId,
          standings: expect.arrayContaining([
            expect.objectContaining({ userId: 'player-1' }),
            expect.objectContaining({ userId: 'player-2' }),
            expect.objectContaining({ userId: 'player-3' }),
          ]),
        }),
      );
    });
  });
});
