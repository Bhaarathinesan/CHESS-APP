import { Test, TestingModule } from '@nestjs/testing';
import { PairingService } from './pairing.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { TournamentFormat, PairingResult } from '@prisma/client';

describe('PairingService', () => {
  let service: PairingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    tournament: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tournamentPlayer: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    tournamentPairing: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PairingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PairingService>(PairingService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Swiss System Pairing', () => {
    // Requirement 11.1: Pair players with same or closest score
    it('should pair players with same score', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        {
          id: 'tp1',
          userId: 'user1',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp2',
          userId: 'user2',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp3',
          userId: 'user3',
          score: 1,
          wins: 1,
          losses: 1,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp4',
          userId: 'user4',
          score: 1,
          wins: 1,
          losses: 1,
          draws: 0,
          hasBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SWISS,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });

      await service.generatePairings(tournamentId, 2);

      // Verify pairings were created
      expect(mockPrismaService.tournamentPairing.createMany).toHaveBeenCalled();
      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      // Should have 2 pairings
      expect(pairingsData).toHaveLength(2);

      // Players with score 2 should be paired together
      const pairing1 = pairingsData.find(
        (p: any) =>
          (p.whitePlayerId === 'user1' && p.blackPlayerId === 'user2') ||
          (p.whitePlayerId === 'user2' && p.blackPlayerId === 'user1'),
      );
      expect(pairing1).toBeDefined();

      // Players with score 1 should be paired together
      const pairing2 = pairingsData.find(
        (p: any) =>
          (p.whitePlayerId === 'user3' && p.blackPlayerId === 'user4') ||
          (p.whitePlayerId === 'user4' && p.blackPlayerId === 'user3'),
      );
      expect(pairing2).toBeDefined();
    });

    // Requirement 11.1: Pair players with closest score when exact match not available
    it('should pair players with closest score when necessary', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        {
          id: 'tp1',
          userId: 'user1',
          score: 3,
          wins: 3,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp2',
          userId: 'user2',
          score: 2,
          wins: 2,
          losses: 1,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp3',
          userId: 'user3',
          score: 1,
          wins: 1,
          losses: 2,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp4',
          userId: 'user4',
          score: 0,
          wins: 0,
          losses: 3,
          draws: 0,
          hasBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SWISS,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });

      await service.generatePairings(tournamentId, 2);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      // Should have 2 pairings
      expect(pairingsData).toHaveLength(2);

      // Verify players are paired with closest scores
      // user1 (3) should pair with user2 (2) - closest available
      // user3 (1) should pair with user4 (0) - closest available
      const allPlayersPaired = new Set<string>();
      pairingsData.forEach((p: any) => {
        allPlayersPaired.add(p.whitePlayerId);
        if (p.blackPlayerId) allPlayersPaired.add(p.blackPlayerId);
      });

      expect(allPlayersPaired.size).toBe(4);
    });

    // Requirement 11.2: Avoid repeat pairings
    it('should avoid repeat pairings', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        {
          id: 'tp1',
          userId: 'user1',
          score: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp2',
          userId: 'user2',
          score: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp3',
          userId: 'user3',
          score: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp4',
          userId: 'user4',
          score: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SWISS,
        players,
        pairings: [],
      });

      // user1 already played user2 in previous round
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([
        {
          whitePlayerId: 'user1',
          blackPlayerId: 'user2',
          isBye: false,
        },
      ]);

      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });

      await service.generatePairings(tournamentId, 2);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      // user1 should NOT be paired with user2 again
      const repeatPairing = pairingsData.find(
        (p: any) =>
          (p.whitePlayerId === 'user1' && p.blackPlayerId === 'user2') ||
          (p.whitePlayerId === 'user2' && p.blackPlayerId === 'user1'),
      );
      expect(repeatPairing).toBeUndefined();
    });

    // Requirement 11.2: Avoid multiple repeat pairings
    it('should avoid multiple repeat pairings when possible', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        {
          id: 'tp1',
          userId: 'user1',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp2',
          userId: 'user2',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp3',
          userId: 'user3',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp4',
          userId: 'user4',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SWISS,
        players,
        pairings: [],
      });

      // Previous pairings: user1-user2, user3-user4
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([
        {
          whitePlayerId: 'user1',
          blackPlayerId: 'user2',
          isBye: false,
        },
        {
          whitePlayerId: 'user3',
          blackPlayerId: 'user4',
          isBye: false,
        },
      ]);

      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });

      await service.generatePairings(tournamentId, 3);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      // Should have 2 pairings
      expect(pairingsData).toHaveLength(2);

      // Neither previous pairing should repeat
      const repeatPairing1 = pairingsData.find(
        (p: any) =>
          (p.whitePlayerId === 'user1' && p.blackPlayerId === 'user2') ||
          (p.whitePlayerId === 'user2' && p.blackPlayerId === 'user1'),
      );
      expect(repeatPairing1).toBeUndefined();

      const repeatPairing2 = pairingsData.find(
        (p: any) =>
          (p.whitePlayerId === 'user3' && p.blackPlayerId === 'user4') ||
          (p.whitePlayerId === 'user4' && p.blackPlayerId === 'user3'),
      );
      expect(repeatPairing2).toBeUndefined();
    });

    // Requirement 11.7: Handle odd number of players with bye
    it('should handle odd number of players with bye', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        {
          id: 'tp1',
          userId: 'user1',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp2',
          userId: 'user2',
          score: 1,
          wins: 1,
          losses: 1,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp3',
          userId: 'user3',
          score: 0,
          wins: 0,
          losses: 2,
          draws: 0,
          hasBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SWISS,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.tournamentPlayer.update.mockResolvedValue({});

      await service.generatePairings(tournamentId, 2);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      // Should have 2 pairings (1 regular + 1 bye)
      expect(pairingsData).toHaveLength(2);

      // One pairing should be a bye
      const byePairing = pairingsData.find((p: any) => p.isBye === true);
      expect(byePairing).toBeDefined();

      // Bye should go to lowest-scored player (user3)
      expect(byePairing.whitePlayerId).toBe('user3');
      expect(byePairing.blackPlayerId).toBeNull();

      // Player should be marked as having received bye
      expect(mockPrismaService.tournamentPlayer.update).toHaveBeenCalledWith({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId: 'user3',
          },
        },
        data: { hasBye: true },
      });
    });

    // Requirement 11.7: Bye should award full-point win
    it('should assign bye with full-point win to lowest-scored player', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        {
          id: 'tp1',
          userId: 'user1',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp2',
          userId: 'user2',
          score: 1.5,
          wins: 1,
          losses: 0,
          draws: 1,
          hasBye: false,
        },
        {
          id: 'tp3',
          userId: 'user3',
          score: 0.5,
          wins: 0,
          losses: 1,
          draws: 1,
          hasBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SWISS,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.tournamentPlayer.update.mockResolvedValue({});

      await service.generatePairings(tournamentId, 3);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      const byePairing = pairingsData.find((p: any) => p.isBye === true);
      expect(byePairing).toBeDefined();
      expect(byePairing.whitePlayerId).toBe('user3'); // Lowest score
      expect(byePairing.blackPlayerId).toBeNull();
    });

    // Requirement 11.8: Not assign same player bye more than once
    it('should not give bye to player who already had one', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        {
          id: 'tp1',
          userId: 'user1',
          score: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp2',
          userId: 'user2',
          score: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          hasBye: true, // Already had bye
        },
        {
          id: 'tp3',
          userId: 'user3',
          score: 0,
          wins: 0,
          losses: 1,
          draws: 0,
          hasBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SWISS,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.tournamentPlayer.update.mockResolvedValue({});

      await service.generatePairings(tournamentId, 3);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      const byePairing = pairingsData.find((p: any) => p.isBye === true);
      expect(byePairing).toBeDefined();

      // Bye should go to user3, not user2 who already had one
      expect(byePairing.whitePlayerId).toBe('user3');
    });

    // Requirement 11.8: Give bye to next lowest player if all had byes
    it('should give bye to lowest-scored player even if all had byes before', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        {
          id: 'tp1',
          userId: 'user1',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          hasBye: true,
        },
        {
          id: 'tp2',
          userId: 'user2',
          score: 1,
          wins: 1,
          losses: 1,
          draws: 0,
          hasBye: true,
        },
        {
          id: 'tp3',
          userId: 'user3',
          score: 0,
          wins: 0,
          losses: 2,
          draws: 0,
          hasBye: true,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SWISS,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.tournamentPlayer.update.mockResolvedValue({});

      await service.generatePairings(tournamentId, 4);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      const byePairing = pairingsData.find((p: any) => p.isBye === true);
      expect(byePairing).toBeDefined();

      // Should still give bye to lowest-scored player (user3)
      expect(byePairing.whitePlayerId).toBe('user3');
    });

    // Edge case: All players have same score
    it('should handle all players having same score', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        {
          id: 'tp1',
          userId: 'user1',
          score: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp2',
          userId: 'user2',
          score: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp3',
          userId: 'user3',
          score: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp4',
          userId: 'user4',
          score: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SWISS,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });

      await service.generatePairings(tournamentId, 2);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      // Should have 2 pairings
      expect(pairingsData).toHaveLength(2);

      // All players should be paired
      const allPlayersPaired = new Set<string>();
      pairingsData.forEach((p: any) => {
        allPlayersPaired.add(p.whitePlayerId);
        if (p.blackPlayerId) allPlayersPaired.add(p.blackPlayerId);
      });

      expect(allPlayersPaired.size).toBe(4);
    });

    // Edge case: Two players only
    it('should handle tournament with only two players', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        {
          id: 'tp1',
          userId: 'user1',
          score: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp2',
          userId: 'user2',
          score: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SWISS,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 1,
      });

      await service.generatePairings(tournamentId, 1);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      // Should have 1 pairing
      expect(pairingsData).toHaveLength(1);
      expect(pairingsData[0].isBye).toBe(false);
      expect(
        (pairingsData[0].whitePlayerId === 'user1' &&
          pairingsData[0].blackPlayerId === 'user2') ||
          (pairingsData[0].whitePlayerId === 'user2' &&
            pairingsData[0].blackPlayerId === 'user1'),
      ).toBe(true);
    });

    // Edge case: Board numbers should be sequential
    it('should assign sequential board numbers to pairings', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        {
          id: 'tp1',
          userId: 'user1',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp2',
          userId: 'user2',
          score: 2,
          wins: 2,
          losses: 0,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp3',
          userId: 'user3',
          score: 1,
          wins: 1,
          losses: 1,
          draws: 0,
          hasBye: false,
        },
        {
          id: 'tp4',
          userId: 'user4',
          score: 1,
          wins: 1,
          losses: 1,
          draws: 0,
          hasBye: false,
        },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SWISS,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });

      await service.generatePairings(tournamentId, 2);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      // Board numbers should be 1 and 2
      const boardNumbers = pairingsData.map((p: any) => p.boardNumber).sort();
      expect(boardNumbers).toEqual([1, 2]);
    });
  });

  describe('Round Robin Pairing', () => {
    it('should generate complete schedule on first round', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        { id: 'tp1', userId: 'user1', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
        { id: 'tp2', userId: 'user2', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
        { id: 'tp3', userId: 'user3', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
        { id: 'tp4', userId: 'user4', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.ROUND_ROBIN,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournament.update.mockResolvedValue({});
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });

      await service.generatePairings(tournamentId, 1);

      // Should update tournament with total rounds (n-1 = 3 rounds for 4 players)
      expect(mockPrismaService.tournament.update).toHaveBeenCalledWith({
        where: { id: tournamentId },
        data: { roundsTotal: 3 },
      });

      // Should create pairings for all rounds
      expect(mockPrismaService.tournamentPairing.createMany).toHaveBeenCalledTimes(3);
    });

    it('should ensure each player faces every other player once', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        { id: 'tp1', userId: 'user1', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
        { id: 'tp2', userId: 'user2', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
        { id: 'tp3', userId: 'user3', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
        { id: 'tp4', userId: 'user4', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.ROUND_ROBIN,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournament.update.mockResolvedValue({});
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });

      await service.generatePairings(tournamentId, 1);

      // Collect all pairings from all rounds
      const allPairings: any[] = [];
      mockPrismaService.tournamentPairing.createMany.mock.calls.forEach(
        (call) => {
          allPairings.push(...call[0].data);
        },
      );

      // Track all matchups
      const matchups = new Set<string>();
      allPairings.forEach((p: any) => {
        const key = [p.whitePlayerId, p.blackPlayerId].sort().join('-');
        matchups.add(key);
      });

      // With 4 players, should have 6 unique matchups (C(4,2) = 6)
      expect(matchups.size).toBe(6);

      // Verify no repeat matchups
      expect(allPairings.length).toBe(6); // 3 rounds * 2 games per round
    });
  });

  describe('Single Elimination Pairing', () => {
    it('should create bracket structure in first round', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        { id: 'tp1', userId: 'user1', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
        { id: 'tp2', userId: 'user2', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
        { id: 'tp3', userId: 'user3', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
        { id: 'tp4', userId: 'user4', score: 0, wins: 0, losses: 0, draws: 0, hasBye: false },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SINGLE_ELIMINATION,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });

      await service.generatePairings(tournamentId, 1);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      // Should have 2 pairings for 4 players
      expect(pairingsData).toHaveLength(2);

      // All pairings should be regular (not bye)
      expect(pairingsData.every((p: any) => !p.isBye)).toBe(true);
    });

    it('should pair winners in subsequent rounds', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        { id: 'tp1', userId: 'user1', score: 1, wins: 1, losses: 0, draws: 0, hasBye: false },
        { id: 'tp2', userId: 'user2', score: 1, wins: 1, losses: 0, draws: 0, hasBye: false },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SINGLE_ELIMINATION,
        players,
        pairings: [],
      });

      // Previous round results
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([
        {
          whitePlayerId: 'user1',
          blackPlayerId: 'user3',
          result: PairingResult.WHITE_WIN,
          game: { id: 'game1' },
        },
        {
          whitePlayerId: 'user2',
          blackPlayerId: 'user4',
          result: PairingResult.BLACK_WIN,
          game: { id: 'game2' },
        },
      ]);

      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 1,
      });

      await service.generatePairings(tournamentId, 2);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      // Should have 1 pairing (finals)
      expect(pairingsData).toHaveLength(1);

      // Should pair the two winners
      expect(
        (pairingsData[0].whitePlayerId === 'user1' &&
          pairingsData[0].blackPlayerId === 'user2') ||
          (pairingsData[0].whitePlayerId === 'user2' &&
            pairingsData[0].blackPlayerId === 'user1'),
      ).toBe(true);
    });

    it('should throw error if previous round not completed', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        { id: 'tp1', userId: 'user1', score: 1, wins: 1, losses: 0, draws: 0, hasBye: false },
        { id: 'tp2', userId: 'user2', score: 1, wins: 1, losses: 0, draws: 0, hasBye: false },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.SINGLE_ELIMINATION,
        players,
        pairings: [],
      });

      // Previous round not completed (no result)
      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([
        {
          whitePlayerId: 'user1',
          blackPlayerId: 'user3',
          result: null,
          game: { id: 'game1' },
        },
      ]);

      await expect(
        service.generatePairings(tournamentId, 2),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Double Elimination Pairing', () => {
    it('should maintain winners and losers brackets', async () => {
      const tournamentId = 'tournament-1';
      const players = [
        { id: 'tp1', userId: 'user1', score: 1, wins: 1, losses: 0, draws: 0, hasBye: false },
        { id: 'tp2', userId: 'user2', score: 1, wins: 1, losses: 0, draws: 0, hasBye: false },
        { id: 'tp3', userId: 'user3', score: 0, wins: 0, losses: 1, draws: 0, hasBye: false },
        { id: 'tp4', userId: 'user4', score: 0, wins: 0, losses: 1, draws: 0, hasBye: false },
      ];

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.DOUBLE_ELIMINATION,
        players,
        pairings: [],
      });

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([
        {
          whitePlayerId: 'user1',
          blackPlayerId: 'user3',
          result: PairingResult.WHITE_WIN,
          game: { id: 'game1' },
        },
        {
          whitePlayerId: 'user2',
          blackPlayerId: 'user4',
          result: PairingResult.WHITE_WIN,
          game: { id: 'game2' },
        },
      ]);

      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue(players);
      mockPrismaService.tournamentPlayer.updateMany.mockResolvedValue({
        count: 2,
      });
      mockPrismaService.tournamentPairing.deleteMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.tournamentPairing.createMany.mockResolvedValue({
        count: 2,
      });

      await service.generatePairings(tournamentId, 2);

      const pairingsData =
        mockPrismaService.tournamentPairing.createMany.mock.calls[0][0].data;

      // Should have pairings for both winners and losers brackets
      expect(pairingsData.length).toBeGreaterThan(0);

      // Losers should be marked with incremented losses
      expect(mockPrismaService.tournamentPlayer.updateMany).toHaveBeenCalled();
    });
  });

  describe('Arena Mode', () => {
    it('should find available opponent with similar rating', async () => {
      const tournamentId = 'tournament-1';
      const playerId = 'user1';

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.ARENA,
        timeControl: 'BLITZ',
        players: [
          { userId: 'user1', isActive: true },
          { userId: 'user2', isActive: true },
          { userId: 'user3', isActive: true },
        ],
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: playerId,
        ratings: [{ rating: 1500, timeControl: 'BLITZ' }],
      });

      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        {
          userId: 'user2',
          isActive: true,
          user: {
            ratings: [{ rating: 1520, timeControl: 'BLITZ' }],
            gamesAsWhite: [],
            gamesAsBlack: [],
          },
        },
        {
          userId: 'user3',
          isActive: true,
          user: {
            ratings: [{ rating: 1800, timeControl: 'BLITZ' }],
            gamesAsWhite: [],
            gamesAsBlack: [],
          },
        },
      ]);

      const opponent = await service.findArenaOpponent(tournamentId, playerId);

      // Should return user2 (closer rating: 1520 vs 1800)
      expect(opponent).toBe('user2');
    });

    it('should return null if no opponents available', async () => {
      const tournamentId = 'tournament-1';
      const playerId = 'user1';

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.ARENA,
        timeControl: 'BLITZ',
        players: [{ userId: 'user1', isActive: true }],
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: playerId,
        ratings: [{ rating: 1500, timeControl: 'BLITZ' }],
      });

      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([]);

      const opponent = await service.findArenaOpponent(tournamentId, playerId);

      expect(opponent).toBeNull();
    });

    it('should exclude players currently in games', async () => {
      const tournamentId = 'tournament-1';
      const playerId = 'user1';

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        format: TournamentFormat.ARENA,
        timeControl: 'BLITZ',
        players: [
          { userId: 'user1', isActive: true },
          { userId: 'user2', isActive: true },
        ],
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: playerId,
        ratings: [{ rating: 1500, timeControl: 'BLITZ' }],
      });

      // user2 is currently in a game
      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        {
          userId: 'user2',
          isActive: true,
          user: {
            ratings: [{ rating: 1520, timeControl: 'BLITZ' }],
            gamesAsWhite: [{ id: 'game1', status: 'ACTIVE' }],
            gamesAsBlack: [],
          },
        },
      ]);

      const opponent = await service.findArenaOpponent(tournamentId, playerId);

      // Should return null since user2 is in a game
      expect(opponent).toBeNull();
    });
  });

  describe('Manual Pairing', () => {
    it('should allow admin to create custom pairing', async () => {
      const tournamentId = 'tournament-1';
      const adminId = 'admin1';

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        creatorId: adminId,
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: adminId,
        role: 'TOURNAMENT_ADMIN',
      });

      mockPrismaService.tournamentPlayer.findMany.mockResolvedValue([
        { userId: 'user1' },
        { userId: 'user2' },
      ]);

      mockPrismaService.tournamentPairing.findMany.mockResolvedValue([]);
      mockPrismaService.tournamentPairing.create.mockResolvedValue({
        id: 'pairing1',
      });

      await service.createManualPairing(
        tournamentId,
        1,
        'user1',
        'user2',
        adminId,
      );

      expect(mockPrismaService.tournamentPairing.create).toHaveBeenCalledWith({
        data: {
          tournamentId,
          roundNumber: 1,
          whitePlayerId: 'user1',
          blackPlayerId: 'user2',
          boardNumber: 1,
          isBye: false,
        },
      });
    });

    it('should reject manual pairing from non-admin', async () => {
      const tournamentId = 'tournament-1';
      const userId = 'user1';

      mockPrismaService.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        creatorId: 'admin1',
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'PLAYER',
      });

      await expect(
        service.createManualPairing(tournamentId, 1, 'user1', 'user2', userId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
