import { Test, TestingModule } from '@nestjs/testing';
import { StandingsService, PlayerStanding } from './standings.service';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('StandingsService', () => {
  let service: StandingsService;
  let prisma: PrismaService;

  const mockPrismaService = {
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
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StandingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StandingsService>(StandingsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateStandings', () => {
    it('should calculate total points correctly (1 for win, 0.5 for draw, 0 for loss)', async () => {
      const tournamentId = 'tournament-1';

      // Mock tournament
      mockPrismaService.tournament.findUnique.mockResolvedValue({
        tiebreakCriteria: 'buchholz',
      });

      // Mock players
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        {
          userId: 'player-1',
          user: {
            id: 'player-1',
            username: 'player1',
            displayName: 'Player 1',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-2',
          user: {
            id: 'player-2',
            username: 'player2',
            displayName: 'Player 2',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-3',
          user: {
            id: 'player-3',
            username: 'player3',
            displayName: 'Player 3',
            avatarUrl: null,
          },
        },
      ]);

      // Mock pairings: player-1 wins, player-2 draws, player-3 loses
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([
        {
          whitePlayerId: 'player-1',
          blackPlayerId: 'player-3',
          result: 'WHITE_WIN',
          isBye: false,
        },
        {
          whitePlayerId: 'player-2',
          blackPlayerId: 'player-1',
          result: 'DRAW',
          isBye: false,
        },
      ]);

      mockPrismaService.$transaction.mockResolvedValue([]);

      const standings = await service.calculateStandings(tournamentId);

      // Player 1: 1 win + 0.5 draw = 1.5 points
      // Player 2: 0.5 draw = 0.5 points
      // Player 3: 1 loss = 0 points
      expect(standings[0].userId).toBe('player-1');
      expect(standings[0].score).toBe(1.5);
      expect(standings[0].wins).toBe(1);
      expect(standings[0].draws).toBe(1);
      expect(standings[0].losses).toBe(0);

      expect(standings[1].userId).toBe('player-2');
      expect(standings[1].score).toBe(0.5);
      expect(standings[1].draws).toBe(1);

      expect(standings[2].userId).toBe('player-3');
      expect(standings[2].score).toBe(0);
      expect(standings[2].losses).toBe(1);
    });

    it('should calculate Buchholz tiebreak score correctly', async () => {
      const tournamentId = 'tournament-1';

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        tiebreakCriteria: 'buchholz',
      });

      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        {
          userId: 'player-1',
          user: {
            id: 'player-1',
            username: 'player1',
            displayName: 'Player 1',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-2',
          user: {
            id: 'player-2',
            username: 'player2',
            displayName: 'Player 2',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-3',
          user: {
            id: 'player-3',
            username: 'player3',
            displayName: 'Player 3',
            avatarUrl: null,
          },
        },
      ]);

      // Player 1 beats player 2 (who has 0.5 points)
      // Player 1 draws with player 3 (who has 0.5 points)
      // Buchholz for player 1 = 0.5 + 0.5 = 1.0
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([
        {
          whitePlayerId: 'player-1',
          blackPlayerId: 'player-2',
          result: 'WHITE_WIN',
          isBye: false,
        },
        {
          whitePlayerId: 'player-1',
          blackPlayerId: 'player-3',
          result: 'DRAW',
          isBye: false,
        },
        {
          whitePlayerId: 'player-2',
          blackPlayerId: 'player-3',
          result: 'DRAW',
          isBye: false,
        },
      ]);

      mockPrismaService.$transaction.mockResolvedValue([]);

      const standings = await service.calculateStandings(tournamentId);

      // Player 1: 1.5 points, Buchholz = 0.5 + 0.5 = 1.0
      expect(standings[0].userId).toBe('player-1');
      expect(standings[0].buchholzScore).toBe(1.0);
    });

    it('should calculate Sonneborn-Berger tiebreak score correctly', async () => {
      const tournamentId = 'tournament-1';

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        tiebreakCriteria: 'sonneborn_berger',
      });

      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        {
          userId: 'player-1',
          user: {
            id: 'player-1',
            username: 'player1',
            displayName: 'Player 1',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-2',
          user: {
            id: 'player-2',
            username: 'player2',
            displayName: 'Player 2',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-3',
          user: {
            id: 'player-3',
            username: 'player3',
            displayName: 'Player 3',
            avatarUrl: null,
          },
        },
      ]);

      // Player 1 beats player 2 (who has 0 points) = 0
      // Player 1 draws with player 3 (who has 0.5 points) = 0.5 * 0.5 = 0.25
      // Sonneborn-Berger for player 1 = 0 + 0.25 = 0.25
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([
        {
          whitePlayerId: 'player-1',
          blackPlayerId: 'player-2',
          result: 'WHITE_WIN',
          isBye: false,
        },
        {
          whitePlayerId: 'player-1',
          blackPlayerId: 'player-3',
          result: 'DRAW',
          isBye: false,
        },
        {
          whitePlayerId: 'player-3',
          blackPlayerId: 'player-2',
          result: 'DRAW',
          isBye: false,
        },
      ]);

      mockPrismaService.$transaction.mockResolvedValue([]);

      const standings = await service.calculateStandings(tournamentId);

      // Player 1: Sonneborn-Berger = 0 (beat player with 0) + 0.25 (drew with player with 0.5)
      expect(standings[0].userId).toBe('player-1');
      expect(standings[0].sonneborBerger).toBe(0.25);
    });

    it('should rank players by points and apply Buchholz tiebreak', async () => {
      const tournamentId = 'tournament-1';

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        tiebreakCriteria: 'buchholz',
      });

      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        {
          userId: 'player-1',
          user: {
            id: 'player-1',
            username: 'player1',
            displayName: 'Player 1',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-2',
          user: {
            id: 'player-2',
            username: 'player2',
            displayName: 'Player 2',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-3',
          user: {
            id: 'player-3',
            username: 'player3',
            displayName: 'Player 3',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-4',
          user: {
            id: 'player-4',
            username: 'player4',
            displayName: 'Player 4',
            avatarUrl: null,
          },
        },
      ]);

      // Create scenario where player-1 and player-2 both have 1 point
      // but player-1 has higher Buchholz
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([
        // Round 1
        {
          whitePlayerId: 'player-1',
          blackPlayerId: 'player-3',
          result: 'WHITE_WIN',
          isBye: false,
        },
        {
          whitePlayerId: 'player-2',
          blackPlayerId: 'player-4',
          result: 'WHITE_WIN',
          isBye: false,
        },
        // Round 2
        {
          whitePlayerId: 'player-1',
          blackPlayerId: 'player-2',
          result: 'DRAW',
          isBye: false,
        },
        {
          whitePlayerId: 'player-3',
          blackPlayerId: 'player-4',
          result: 'WHITE_WIN',
          isBye: false,
        },
      ]);

      mockPrismaService.$transaction.mockResolvedValue([]);

      const standings = await service.calculateStandings(tournamentId);

      // Both player-1 and player-2 have 1.5 points
      // Player-1 beat player-3 (1 point) and drew with player-2 (1.5 points) = Buchholz 2.5
      // Player-2 beat player-4 (0 points) and drew with player-1 (1.5 points) = Buchholz 1.5
      // Player-1 should rank higher due to better Buchholz
      expect(standings[0].userId).toBe('player-1');
      expect(standings[0].rank).toBe(1);
      expect(standings[0].score).toBe(1.5);

      expect(standings[1].userId).toBe('player-2');
      expect(standings[1].rank).toBe(2);
      expect(standings[1].score).toBe(1.5);
    });

    it('should handle bye correctly (1 point for win)', async () => {
      const tournamentId = 'tournament-1';

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        tiebreakCriteria: 'buchholz',
      });

      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        {
          userId: 'player-1',
          user: {
            id: 'player-1',
            username: 'player1',
            displayName: 'Player 1',
            avatarUrl: null,
          },
        },
        {
          userId: 'player-2',
          user: {
            id: 'player-2',
            username: 'player2',
            displayName: 'Player 2',
            avatarUrl: null,
          },
        },
      ]);

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([
        {
          whitePlayerId: 'player-1',
          blackPlayerId: null,
          result: 'BYE',
          isBye: true,
        },
        {
          whitePlayerId: 'player-1',
          blackPlayerId: 'player-2',
          result: 'WHITE_WIN',
          isBye: false,
        },
      ]);

      mockPrismaService.$transaction.mockResolvedValue([]);

      const standings = await service.calculateStandings(tournamentId);

      // Player 1: 1 bye + 1 win = 2 points
      expect(standings[0].userId).toBe('player-1');
      expect(standings[0].score).toBe(2);
      expect(standings[0].wins).toBe(2);
    });

    it('should update database with calculated standings', async () => {
      const tournamentId = 'tournament-1';

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        tiebreakCriteria: 'buchholz',
      });

      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        {
          userId: 'player-1',
          user: {
            id: 'player-1',
            username: 'player1',
            displayName: 'Player 1',
            avatarUrl: null,
          },
        },
      ]);

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);

      mockPrismaService.$transaction.mockResolvedValue([]);

      await service.calculateStandings(tournamentId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('getStandings', () => {
    it('should retrieve current standings from database', async () => {
      const tournamentId = 'tournament-1';

      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        {
          userId: 'player-1',
          score: new Decimal(2.5),
          wins: 2,
          losses: 0,
          draws: 1,
          buchholzScore: new Decimal(3.5),
          sonneborBerger: new Decimal(2.0),
          rank: 1,
          user: {
            id: 'player-1',
            username: 'player1',
            displayName: 'Player 1',
            avatarUrl: 'avatar1.jpg',
          },
        },
        {
          userId: 'player-2',
          score: new Decimal(1.5),
          wins: 1,
          losses: 1,
          draws: 1,
          buchholzScore: new Decimal(2.5),
          sonneborBerger: new Decimal(1.5),
          rank: 2,
          user: {
            id: 'player-2',
            username: 'player2',
            displayName: 'Player 2',
            avatarUrl: null,
          },
        },
      ]);

      const standings = await service.getStandings(tournamentId);

      expect(standings).toHaveLength(2);
      expect(standings[0].userId).toBe('player-1');
      expect(standings[0].score).toBe(2.5);
      expect(standings[0].rank).toBe(1);
      expect(standings[0].gamesPlayed).toBe(3);

      expect(standings[1].userId).toBe('player-2');
      expect(standings[1].score).toBe(1.5);
      expect(standings[1].rank).toBe(2);
      expect(standings[1].gamesPlayed).toBe(3);
    });
  });
});
