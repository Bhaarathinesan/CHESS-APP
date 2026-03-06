import { Test, TestingModule } from '@nestjs/testing';
import { AntiCheatService } from './anti-cheat.service';
import { PrismaService } from '../prisma/prisma.service';
import { AntiCheatFlagType, AntiCheatFlagStatus } from '@prisma/client';

describe('AntiCheatService', () => {
  let service: AntiCheatService;
  let prisma: PrismaService;

  const mockPrismaService = {
    antiCheatFlag: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    gameMove: {
      findMany: jest.fn(),
    },
    game: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntiCheatService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AntiCheatService>(AntiCheatService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackMoveTime', () => {
    it('should not flag fast moves when threshold not reached', async () => {
      const gameId = 'game-123';
      const userId = 'user-123';
      const moveNumber = 5;
      const timeTakenMs = 50;
      const fenAfter = 'rnbqkb1r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKB1R w KQkq - 0 1'; // 16 pieces (complex)

      // Return only 2 existing fast moves (not enough to trigger flag)
      mockPrismaService.gameMove.findMany.mockResolvedValue([
        { timeTakenMs: 80, game: { whitePlayerId: userId, blackPlayerId: 'other' }, color: 'white' },
        { timeTakenMs: 90, game: { whitePlayerId: userId, blackPlayerId: 'other' }, color: 'white' },
      ]);

      await service.trackMoveTime(gameId, userId, moveNumber, timeTakenMs, fenAfter);

      expect(mockPrismaService.antiCheatFlag.create).not.toHaveBeenCalled();
    });

    it('should not flag fast moves in simple positions', async () => {
      const gameId = 'game-123';
      const userId = 'user-123';
      const moveNumber = 5;
      const timeTakenMs = 50;
      const fenAfter = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // 32 pieces (simple)

      await service.trackMoveTime(gameId, userId, moveNumber, timeTakenMs, fenAfter);

      expect(mockPrismaService.antiCheatFlag.create).not.toHaveBeenCalled();
    });
  });

  describe('trackFocusLoss', () => {
    it('should flag multiple focus losses during a game', async () => {
      const gameId = 'game-123';
      const userId = 'user-123';
      const focusLostAt = new Date('2024-01-01T10:00:00Z');
      const focusRegainedAt = new Date('2024-01-01T10:00:05Z');

      mockPrismaService.antiCheatFlag.findMany.mockResolvedValue([
        { flagType: AntiCheatFlagType.TAB_FOCUS_LOSS },
        { flagType: AntiCheatFlagType.TAB_FOCUS_LOSS },
      ]);

      mockPrismaService.antiCheatFlag.create.mockResolvedValue({
        id: 'flag-123',
        userId,
        gameId,
        flagType: AntiCheatFlagType.TAB_FOCUS_LOSS,
      });

      await service.trackFocusLoss(gameId, userId, focusLostAt, focusRegainedAt);

      expect(mockPrismaService.antiCheatFlag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          gameId,
          flagType: AntiCheatFlagType.TAB_FOCUS_LOSS,
          status: AntiCheatFlagStatus.PENDING,
        }),
      });
    });
  });

  describe('detectBrowserExtension', () => {
    it('should flag detected chess analysis extensions', async () => {
      const gameId = 'game-123';
      const userId = 'user-123';
      const extensionData = {
        extensionName: 'Chess Analyzer Pro',
        extensionId: 'ext-123',
        detectionMethod: 'dom_inspection',
      };

      mockPrismaService.antiCheatFlag.create.mockResolvedValue({
        id: 'flag-123',
        userId,
        gameId,
        flagType: AntiCheatFlagType.BROWSER_EXTENSION,
      });

      await service.detectBrowserExtension(gameId, userId, extensionData);

      expect(mockPrismaService.antiCheatFlag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          gameId,
          flagType: AntiCheatFlagType.BROWSER_EXTENSION,
          severity: 3,
          status: AntiCheatFlagStatus.PENDING,
        }),
      });
    });
  });

  describe('analyzeMovePatternsForGame', () => {
    it('should analyze move patterns and flag statistical anomalies', async () => {
      const gameId = 'game-123';
      const whitePlayerId = 'white-123';
      const blackPlayerId = 'black-123';

      const moves = Array.from({ length: 30 }, (_, i) => ({
        id: `move-${i}`,
        gameId,
        moveNumber: Math.floor(i / 2) + 1,
        color: i % 2 === 0 ? 'white' : 'black',
        san: 'e4',
        uci: 'e2e4',
        fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        timeTakenMs: 80, // Consistently fast
        timeRemainingMs: 60000,
        isCheck: false,
        isCheckmate: false,
        isCapture: false,
        isCastling: false,
        isEnPassant: false,
        isPromotion: false,
        promotionPiece: null,
        createdAt: new Date(),
      }));

      mockPrismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        whitePlayerId,
        blackPlayerId,
        moves,
        whitePlayer: { id: whitePlayerId },
        blackPlayer: { id: blackPlayerId },
      });

      mockPrismaService.antiCheatFlag.create.mockResolvedValue({
        id: 'flag-123',
        flagType: AntiCheatFlagType.STATISTICAL_ANOMALY,
      });

      await service.analyzeMovePatternsForGame(gameId);

      expect(mockPrismaService.antiCheatFlag.create).toHaveBeenCalled();
    });
  });

  describe('getFlagsForUser', () => {
    it('should return all flags for a user', async () => {
      const userId = 'user-123';
      const flags = [
        {
          id: 'flag-1',
          userId,
          flagType: AntiCheatFlagType.FAST_MOVES,
          status: AntiCheatFlagStatus.PENDING,
        },
        {
          id: 'flag-2',
          userId,
          flagType: AntiCheatFlagType.TAB_FOCUS_LOSS,
          status: AntiCheatFlagStatus.REVIEWED,
        },
      ];

      mockPrismaService.antiCheatFlag.findMany.mockResolvedValue(flags);

      const result = await service.getFlagsForUser(userId);

      expect(result).toEqual(flags);
      expect(mockPrismaService.antiCheatFlag.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getPendingFlags', () => {
    it('should return pending flags with pagination', async () => {
      const flags = [
        {
          id: 'flag-1',
          flagType: AntiCheatFlagType.FAST_MOVES,
          status: AntiCheatFlagStatus.PENDING,
        },
      ];

      mockPrismaService.antiCheatFlag.findMany.mockResolvedValue(flags);

      const result = await service.getPendingFlags(10, 0);

      expect(result).toEqual(flags);
      expect(mockPrismaService.antiCheatFlag.findMany).toHaveBeenCalledWith({
        where: { status: AntiCheatFlagStatus.PENDING },
        include: expect.any(Object),
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 10,
        skip: 0,
      });
    });
  });

  describe('updateFlagStatus', () => {
    it('should update flag status with reviewer information', async () => {
      const flagId = 'flag-123';
      const status = AntiCheatFlagStatus.CONFIRMED;
      const reviewedBy = 'admin-123';
      const adminNotes = 'Confirmed cheating';

      mockPrismaService.antiCheatFlag.update.mockResolvedValue({
        id: flagId,
        status,
        reviewedBy,
        adminNotes,
      });

      const result = await service.updateFlagStatus(
        flagId,
        status,
        reviewedBy,
        adminNotes,
      );

      expect(result.status).toBe(status);
      expect(mockPrismaService.antiCheatFlag.update).toHaveBeenCalledWith({
        where: { id: flagId },
        data: {
          status,
          reviewedBy,
          reviewedAt: expect.any(Date),
          adminNotes,
        },
      });
    });
  });

  describe('getUserFlagStatistics', () => {
    it('should calculate flag statistics for a user', async () => {
      const userId = 'user-123';
      const flags = [
        {
          id: 'flag-1',
          userId,
          flagType: AntiCheatFlagType.FAST_MOVES,
          status: AntiCheatFlagStatus.PENDING,
          severity: 2,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'flag-2',
          userId,
          flagType: AntiCheatFlagType.FAST_MOVES,
          status: AntiCheatFlagStatus.CONFIRMED,
          severity: 3,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'flag-3',
          userId,
          flagType: AntiCheatFlagType.TAB_FOCUS_LOSS,
          status: AntiCheatFlagStatus.DISMISSED,
          severity: 1,
          createdAt: new Date('2024-01-03'),
        },
      ];

      mockPrismaService.antiCheatFlag.findMany.mockResolvedValue(flags);

      const result = await service.getUserFlagStatistics(userId);

      expect(result.totalFlags).toBe(3);
      expect(result.byType[AntiCheatFlagType.FAST_MOVES]).toBe(2);
      expect(result.byType[AntiCheatFlagType.TAB_FOCUS_LOSS]).toBe(1);
      expect(result.byStatus[AntiCheatFlagStatus.PENDING]).toBe(1);
      expect(result.byStatus[AntiCheatFlagStatus.CONFIRMED]).toBe(1);
      expect(result.byStatus[AntiCheatFlagStatus.DISMISSED]).toBe(1);
      expect(result.avgSeverity).toBe(2);
    });
  });
});
