import { Test, TestingModule } from '@nestjs/testing';
import { TournamentExportService } from './tournament-export.service';
import { PrismaService } from '../prisma/prisma.service';
import { StandingsService } from './standings.service';
import { NotFoundException } from '@nestjs/common';

describe('TournamentExportService', () => {
  let service: TournamentExportService;
  let prismaService: PrismaService;
  let standingsService: StandingsService;

  const mockTournament = {
    id: 'tournament-1',
    name: 'Test Tournament',
    description: 'A test tournament',
    format: 'SWISS',
    timeControl: 'BLITZ',
    initialTimeMinutes: 5,
    incrementSeconds: 3,
    isRated: true,
    status: 'COMPLETED',
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: new Date('2024-01-01T18:00:00Z'),
    roundsTotal: 5,
    roundsCompleted: 5,
    currentPlayers: 8,
    tiebreakCriteria: 'buchholz',
    creator: {
      id: 'user-1',
      username: 'admin',
      displayName: 'Admin User',
    },
  };

  const mockStandings = [
    {
      userId: 'user-1',
      username: 'player1',
      displayName: 'Player One',
      avatarUrl: 'avatar1.jpg',
      score: 4.5,
      wins: 4,
      losses: 0,
      draws: 1,
      buchholzScore: 18.5,
      sonneborBerger: 16.0,
      rank: 1,
      gamesPlayed: 5,
    },
    {
      userId: 'user-2',
      username: 'player2',
      displayName: 'Player Two',
      avatarUrl: 'avatar2.jpg',
      score: 4.0,
      wins: 4,
      losses: 1,
      draws: 0,
      buchholzScore: 17.0,
      sonneborBerger: 15.0,
      rank: 2,
      gamesPlayed: 5,
    },
    {
      userId: 'user-3',
      username: 'player3',
      displayName: 'Player Three',
      score: 3.5,
      wins: 3,
      losses: 1,
      draws: 1,
      buchholzScore: 16.5,
      sonneborBerger: 14.0,
      rank: 3,
      gamesPlayed: 5,
    },
  ];

  const mockPairings = [
    {
      id: 'pairing-1',
      roundNumber: 1,
      boardNumber: 1,
      whitePlayer: { id: 'user-1', username: 'player1', displayName: 'Player One' },
      blackPlayer: { id: 'user-2', username: 'player2', displayName: 'Player Two' },
      result: 'WHITE_WIN',
      isBye: false,
      game: { id: 'game-1', status: 'COMPLETED', result: 'WHITE_WIN', terminationReason: 'CHECKMATE', pgn: null },
    },
    {
      id: 'pairing-2',
      roundNumber: 1,
      boardNumber: 2,
      whitePlayer: { id: 'user-3', username: 'player3', displayName: 'Player Three' },
      blackPlayer: { id: 'user-4', username: 'player4', displayName: 'Player Four' },
      result: 'DRAW',
      isBye: false,
      game: { id: 'game-2', status: 'COMPLETED', result: 'DRAW', terminationReason: 'DRAW_AGREEMENT', pgn: null },
    },
    {
      id: 'pairing-3',
      roundNumber: 2,
      boardNumber: 1,
      whitePlayer: { id: 'user-1', username: 'player1', displayName: 'Player One' },
      blackPlayer: null,
      result: 'BYE',
      isBye: true,
      game: null,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentExportService,
        {
          provide: PrismaService,
          useValue: {
            tournament: {
              findUnique: jest.fn(),
            },
            tournamentPairing: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: StandingsService,
          useValue: {
            getStandings: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TournamentExportService>(TournamentExportService);
    prismaService = module.get<PrismaService>(PrismaService);
    standingsService = module.get<StandingsService>(StandingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateResultsReport', () => {
    it('should generate complete results report', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament as any);
      jest.spyOn(standingsService, 'getStandings').mockResolvedValue(mockStandings);
      jest.spyOn(prismaService.tournamentPairing, 'findMany').mockResolvedValue(mockPairings as any);

      const report = await service.generateResultsReport('tournament-1');

      expect(report).toBeDefined();
      expect(report.tournament.id).toBe('tournament-1');
      expect(report.tournament.name).toBe('Test Tournament');
      expect(report.standings).toHaveLength(3);
      expect(report.pairings).toHaveLength(3);
    });

    it('should throw NotFoundException for non-existent tournament', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(null);

      await expect(service.generateResultsReport('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should include tournament metadata in report', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament as any);
      jest.spyOn(standingsService, 'getStandings').mockResolvedValue(mockStandings);
      jest.spyOn(prismaService.tournamentPairing, 'findMany').mockResolvedValue(mockPairings as any);

      const report = await service.generateResultsReport('tournament-1');

      expect(report.tournament.format).toBe('SWISS');
      expect(report.tournament.timeControl).toBe('BLITZ');
      expect(report.tournament.isRated).toBe(true);
      expect(report.tournament.creator.displayName).toBe('Admin User');
    });

    it('should include all standings with correct data', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament as any);
      jest.spyOn(standingsService, 'getStandings').mockResolvedValue(mockStandings);
      jest.spyOn(prismaService.tournamentPairing, 'findMany').mockResolvedValue(mockPairings as any);

      const report = await service.generateResultsReport('tournament-1');

      expect(report.standings[0].rank).toBe(1);
      expect(report.standings[0].score).toBe(4.5);
      expect(report.standings[0].displayName).toBe('Player One');
      expect(report.standings[1].rank).toBe(2);
      expect(report.standings[2].rank).toBe(3);
    });

    it('should include all pairings with results', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament as any);
      jest.spyOn(standingsService, 'getStandings').mockResolvedValue(mockStandings);
      jest.spyOn(prismaService.tournamentPairing, 'findMany').mockResolvedValue(mockPairings as any);

      const report = await service.generateResultsReport('tournament-1');

      expect(report.pairings[0].roundNumber).toBe(1);
      expect(report.pairings[0].result).toBe('WHITE_WIN');
      expect(report.pairings[1].result).toBe('DRAW');
      expect(report.pairings[2].isBye).toBe(true);
    });
  });

  describe('exportAsCSV', () => {
    beforeEach(() => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament as any);
      jest.spyOn(standingsService, 'getStandings').mockResolvedValue(mockStandings);
      jest.spyOn(prismaService.tournamentPairing, 'findMany').mockResolvedValue(mockPairings as any);
    });

    it('should export tournament results as CSV buffer', async () => {
      const csvBuffer = await service.exportAsCSV('tournament-1');

      expect(csvBuffer).toBeInstanceOf(Buffer);
      expect(csvBuffer.length).toBeGreaterThan(0);
    });

    it('should include tournament metadata in CSV', async () => {
      const csvBuffer = await service.exportAsCSV('tournament-1');
      const csvContent = csvBuffer.toString('utf-8');

      expect(csvContent).toContain('Tournament Results Report');
      expect(csvContent).toContain('Test Tournament');
      expect(csvContent).toContain('SWISS');
      expect(csvContent).toContain('BLITZ');
      expect(csvContent).toContain('Admin User');
    });

    it('should include final standings in CSV', async () => {
      const csvBuffer = await service.exportAsCSV('tournament-1');
      const csvContent = csvBuffer.toString('utf-8');

      expect(csvContent).toContain('Final Standings');
      expect(csvContent).toContain('Rank,Player,Score,Wins,Losses,Draws');
      expect(csvContent).toContain('Player One');
      expect(csvContent).toContain('Player Two');
      expect(csvContent).toContain('Player Three');
    });

    it('should include all pairings in CSV', async () => {
      const csvBuffer = await service.exportAsCSV('tournament-1');
      const csvContent = csvBuffer.toString('utf-8');

      expect(csvContent).toContain('All Pairings and Results');
      expect(csvContent).toContain('Round,Board,White Player,Black Player,Result');
      expect(csvContent).toContain('WHITE_WIN');
      expect(csvContent).toContain('DRAW');
      expect(csvContent).toContain('BYE');
    });

    it('should properly escape CSV values with commas', async () => {
      const tournamentWithComma = {
        ...mockTournament,
        name: 'Test, Tournament',
      };
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(tournamentWithComma as any);

      const csvBuffer = await service.exportAsCSV('tournament-1');
      const csvContent = csvBuffer.toString('utf-8');

      expect(csvContent).toContain('"Test, Tournament"');
    });

    it('should properly escape CSV values with quotes', async () => {
      const standingsWithQuotes = [
        {
          ...mockStandings[0],
          displayName: 'Player "One"',
        },
      ];
      jest.spyOn(standingsService, 'getStandings').mockResolvedValue(standingsWithQuotes);

      const csvBuffer = await service.exportAsCSV('tournament-1');
      const csvContent = csvBuffer.toString('utf-8');

      expect(csvContent).toContain('Player ""One""');
    });

    it('should include tiebreak scores in CSV', async () => {
      const csvBuffer = await service.exportAsCSV('tournament-1');
      const csvContent = csvBuffer.toString('utf-8');

      expect(csvContent).toContain('Buchholz');
      expect(csvContent).toContain('Sonneborn-Berger');
      expect(csvContent).toContain('18.50');
      expect(csvContent).toContain('16.00');
    });
  });

  describe('exportAsPDF', () => {
    beforeEach(() => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament as any);
      jest.spyOn(standingsService, 'getStandings').mockResolvedValue(mockStandings);
      jest.spyOn(prismaService.tournamentPairing, 'findMany').mockResolvedValue(mockPairings as any);
    });

    it('should export tournament results as PDF buffer', async () => {
      const pdfBuffer = await service.exportAsPDF('tournament-1');

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should generate valid PDF with header', async () => {
      const pdfBuffer = await service.exportAsPDF('tournament-1');

      // PDF files start with %PDF
      expect(pdfBuffer.toString('utf-8', 0, 4)).toBe('%PDF');
      // Verify it's a valid PDF buffer
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });

    it('should handle tournaments with many players', async () => {
      // Create 50 players
      const manyStandings = Array.from({ length: 50 }, (_, i) => ({
        userId: `user-${i}`,
        username: `player${i}`,
        displayName: `Player ${i}`,
        score: 5 - i * 0.1,
        wins: 5 - i,
        losses: i,
        draws: 0,
        buchholzScore: 20 - i,
        sonneborBerger: 18 - i,
        rank: i + 1,
        gamesPlayed: 5,
      }));
      jest.spyOn(standingsService, 'getStandings').mockResolvedValue(manyStandings);

      const pdfBuffer = await service.exportAsPDF('tournament-1');

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle tournaments with many rounds', async () => {
      // Create pairings for 10 rounds
      const manyPairings = Array.from({ length: 40 }, (_, i) => ({
        id: `pairing-${i}`,
        roundNumber: Math.floor(i / 4) + 1,
        boardNumber: (i % 4) + 1,
        whitePlayer: { id: `user-${i}`, username: `player${i}`, displayName: `Player ${i}` },
        blackPlayer: { id: `user-${i + 1}`, username: `player${i + 1}`, displayName: `Player ${i + 1}` },
        result: i % 3 === 0 ? 'WHITE_WIN' : i % 3 === 1 ? 'BLACK_WIN' : 'DRAW',
        isBye: false,
        game: { id: `game-${i}`, status: 'COMPLETED', result: 'WHITE_WIN', terminationReason: 'CHECKMATE', pgn: null },
      }));
      jest.spyOn(prismaService.tournamentPairing, 'findMany').mockResolvedValue(manyPairings as any);

      const pdfBuffer = await service.exportAsPDF('tournament-1');

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle long player names by truncating', async () => {
      const standingsWithLongNames = [
        {
          ...mockStandings[0],
          displayName: 'This Is A Very Long Player Name That Should Be Truncated',
        },
      ];
      jest.spyOn(standingsService, 'getStandings').mockResolvedValue(standingsWithLongNames);

      const pdfBuffer = await service.exportAsPDF('tournament-1');

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockRejectedValue(new Error('Database error'));

      await expect(service.generateResultsReport('tournament-1')).rejects.toThrow('Database error');
    });

    it('should handle missing standings data', async () => {
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(mockTournament as any);
      jest.spyOn(standingsService, 'getStandings').mockResolvedValue([]);
      jest.spyOn(prismaService.tournamentPairing, 'findMany').mockResolvedValue([]);

      const report = await service.generateResultsReport('tournament-1');

      expect(report.standings).toHaveLength(0);
      expect(report.pairings).toHaveLength(0);
    });

    it('should handle tournaments without end time', async () => {
      const tournamentWithoutEndTime = {
        ...mockTournament,
        endTime: null,
      };
      jest.spyOn(prismaService.tournament, 'findUnique').mockResolvedValue(tournamentWithoutEndTime as any);
      jest.spyOn(standingsService, 'getStandings').mockResolvedValue(mockStandings);
      jest.spyOn(prismaService.tournamentPairing, 'findMany').mockResolvedValue(mockPairings as any);

      const csvBuffer = await service.exportAsCSV('tournament-1');
      const csvContent = csvBuffer.toString('utf-8');

      expect(csvContent).not.toContain('End Time');
    });
  });
});
