import { Test, TestingModule } from '@nestjs/testing';
import { RatingsService } from './ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeControl, GameResult } from '@prisma/client';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for ELO Rating System
 * 
 * These tests validate universal properties that should hold true
 * for all possible inputs, using the fast-check library to generate
 * randomized test cases.
 */
describe('RatingsService - Property-Based Tests', () => {
  let service: RatingsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    rating: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    ratingHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    game: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 28: Initial Rating Assignment
   * **Validates: Requirements 8.1**
   * 
   * For any newly registered player, the initial ELO rating for each
   * time control should be exactly 1200.
   */
  describe('Property 28: Initial rating assignment', () => {
    it('should assign initial rating of 1200 for any new player and time control', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // userId
          fc.constantFrom(...Object.values(TimeControl)), // timeControl
          async (userId, timeControl) => {
            // Mock: rating doesn't exist yet
            mockPrismaService.rating.findUnique.mockResolvedValue(null);

            // Mock: create returns new rating with 1200
            const newRating = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId,
              timeControl,
              rating: 1200,
              peakRating: 1200,
              gamesPlayed: 0,
              wins: 0,
              losses: 0,
              draws: 0,
              isProvisional: true,
              kFactor: 40,
              updatedAt: new Date(),
            };
            mockPrismaService.rating.create.mockResolvedValue(newRating);

            // Act
            const result = await service.getOrCreateRating(userId, timeControl);

            // Assert: Initial rating must be exactly 1200
            expect(result.rating).toBe(1200);
            expect(result.peakRating).toBe(1200);
            expect(result.gamesPlayed).toBe(0);
            expect(result.isProvisional).toBe(true);
            expect(result.kFactor).toBe(40);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 29: K-Factor Selection
   * **Validates: Requirements 8.2, 8.3, 8.4**
   * 
   * For any player, the K-factor used in rating calculations should be:
   * - 40 if games < 30
   * - 20 if games >= 30 and rating < 2400
   * - 10 if rating >= 2400
   */
  describe('Property 29: K-factor selection', () => {
    it('should return K=40 for any player with fewer than 30 games', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 29 }), // gamesPlayed < 30
          fc.integer({ min: 100, max: 3000 }), // any rating
          (gamesPlayed, rating) => {
            const kFactor = service.getKFactor(gamesPlayed, rating);
            expect(kFactor).toBe(40);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return K=20 for any player with 30+ games and rating < 2400', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 30, max: 1000 }), // gamesPlayed >= 30
          fc.integer({ min: 100, max: 2399 }), // rating < 2400
          (gamesPlayed, rating) => {
            const kFactor = service.getKFactor(gamesPlayed, rating);
            expect(kFactor).toBe(20);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return K=10 for any player with rating >= 2400', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 30, max: 1000 }), // gamesPlayed >= 30
          fc.integer({ min: 2400, max: 3500 }), // rating >= 2400
          (gamesPlayed, rating) => {
            const kFactor = service.getKFactor(gamesPlayed, rating);
            expect(kFactor).toBe(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize games played over rating for K=40', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 29 }), // gamesPlayed < 30
          fc.integer({ min: 2400, max: 3500 }), // even with high rating
          (gamesPlayed, rating) => {
            const kFactor = service.getKFactor(gamesPlayed, rating);
            // Should still be 40 because games < 30
            expect(kFactor).toBe(40);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 31: ELO Formula Correctness
   * **Validates: Requirements 8.11**
   * 
   * For any rating calculation, the expected score should be calculated
   * using the formula: 1 / (1 + 10^((opponent_rating - player_rating) / 400)),
   * and the rating change should be: K * (actual_score - expected_score).
   */
  describe('Property 31: ELO formula correctness', () => {
    it('should calculate expected score using correct ELO formula for any ratings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3500 }), // playerRating
          fc.integer({ min: 100, max: 3500 }), // opponentRating
          (playerRating, opponentRating) => {
            const expectedScore = service.calculateExpectedScore(playerRating, opponentRating);

            // Manual calculation using the standard ELO formula
            const manualExpectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

            // Should match exactly
            expect(expectedScore).toBeCloseTo(manualExpectedScore, 10);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should have expected score of 0.5 for equal ratings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3500 }), // rating
          (rating) => {
            const expectedScore = service.calculateExpectedScore(rating, rating);
            expect(expectedScore).toBeCloseTo(0.5, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have expected score between 0 and 1 for any ratings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3500 }), // playerRating
          fc.integer({ min: 100, max: 3500 }), // opponentRating
          (playerRating, opponentRating) => {
            const expectedScore = service.calculateExpectedScore(playerRating, opponentRating);
            expect(expectedScore).toBeGreaterThan(0);
            expect(expectedScore).toBeLessThan(1);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should calculate rating change as K * (actual - expected) for any inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3500 }), // playerRating
          fc.integer({ min: 100, max: 3500 }), // opponentRating
          fc.constantFrom(10, 20, 40), // kFactor
          fc.constantFrom(0, 0.5, 1), // result (loss, draw, win)
          (playerRating, opponentRating, kFactor, result) => {
            const ratingChange = service.calculateEloChange({
              playerRating,
              opponentRating,
              kFactor,
              result,
            });

            // Manual calculation
            const expectedScore = service.calculateExpectedScore(playerRating, opponentRating);
            const manualChange = Math.round(kFactor * (result - expectedScore));

            expect(ratingChange).toBe(manualChange);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should produce symmetric rating changes for opposite results', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3500 }), // playerRating
          fc.integer({ min: 100, max: 3500 }), // opponentRating
          fc.constantFrom(10, 20, 40), // kFactor
          (playerRating, opponentRating, kFactor) => {
            // Player wins
            const winChange = service.calculateEloChange({
              playerRating,
              opponentRating,
              kFactor,
              result: 1,
            });

            // Player loses
            const lossChange = service.calculateEloChange({
              playerRating,
              opponentRating,
              kFactor,
              result: 0,
            });

            // Opponent's perspective (swap ratings)
            const opponentWinChange = service.calculateEloChange({
              playerRating: opponentRating,
              opponentRating: playerRating,
              kFactor,
              result: 1,
            });

            const opponentLossChange = service.calculateEloChange({
              playerRating: opponentRating,
              opponentRating: playerRating,
              kFactor,
              result: 0,
            });

            // Player's win should equal opponent's loss (opposite sign)
            expect(winChange).toBeCloseTo(-opponentLossChange, 0);
            // Player's loss should equal opponent's win (opposite sign)
            expect(lossChange).toBeCloseTo(-opponentWinChange, 0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce zero rating change for draw between equal players', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3500 }), // rating
          fc.constantFrom(10, 20, 40), // kFactor
          (rating, kFactor) => {
            const ratingChange = service.calculateEloChange({
              playerRating: rating,
              opponentRating: rating,
              kFactor,
              result: 0.5, // draw
            });

            expect(ratingChange).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always round rating change to integer', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3500 }), // playerRating
          fc.integer({ min: 100, max: 3500 }), // opponentRating
          fc.constantFrom(10, 20, 40), // kFactor
          fc.constantFrom(0, 0.5, 1), // result
          (playerRating, opponentRating, kFactor, result) => {
            const ratingChange = service.calculateEloChange({
              playerRating,
              opponentRating,
              kFactor,
              result,
            });

            expect(Number.isInteger(ratingChange)).toBe(true);
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  /**
   * Property 30: Rating Update Timeliness
   * **Validates: Requirements 8.6**
   * 
   * For any completed rated game, both players' ratings should be updated
   * and persisted within 5 seconds of game completion.
   * 
   * Note: This property test validates the logic flow and data consistency.
   * Actual timing validation requires integration testing with real database.
   */
  describe('Property 30: Rating update timeliness', () => {
    it('should complete rating update transaction for any valid game result', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // gameId
          fc.uuid(), // whitePlayerId
          fc.uuid(), // opponentId (blackPlayerId)
          fc.constantFrom(...Object.values(TimeControl)), // timeControl
          fc.constantFrom(GameResult.WHITE_WIN, GameResult.BLACK_WIN, GameResult.DRAW), // result
          fc.integer({ min: 0, max: 100 }), // whiteGamesPlayed
          fc.integer({ min: 0, max: 100 }), // blackGamesPlayed
          fc.integer({ min: 100, max: 3000 }), // whiteRating
          fc.integer({ min: 100, max: 3000 }), // blackRating
          async (
            gameId,
            whitePlayerId,
            blackPlayerId,
            timeControl,
            result,
            whiteGamesPlayed,
            blackGamesPlayed,
            whiteRating,
            blackRating
          ) => {
            // Ensure different players
            fc.pre(whitePlayerId !== blackPlayerId);

            // Mock game
            mockPrismaService.game.findUnique.mockResolvedValue({
              id: gameId,
              whitePlayerId,
              blackPlayerId,
            });

            // Mock ratings
            const whiteRatingRecord = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: whitePlayerId,
              timeControl,
              rating: whiteRating,
              peakRating: whiteRating,
              gamesPlayed: whiteGamesPlayed,
              wins: 0,
              losses: 0,
              draws: 0,
              isProvisional: whiteGamesPlayed < 20,
              kFactor: service.getKFactor(whiteGamesPlayed, whiteRating),
              updatedAt: new Date(),
            };

            const blackRatingRecord = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: blackPlayerId,
              timeControl,
              rating: blackRating,
              peakRating: blackRating,
              gamesPlayed: blackGamesPlayed,
              wins: 0,
              losses: 0,
              draws: 0,
              isProvisional: blackGamesPlayed < 20,
              kFactor: service.getKFactor(blackGamesPlayed, blackRating),
              updatedAt: new Date(),
            };

            mockPrismaService.rating.findUnique
              .mockResolvedValueOnce(whiteRatingRecord)
              .mockResolvedValueOnce(blackRatingRecord);

            mockPrismaService.$transaction.mockImplementation((operations) =>
              Promise.all(operations)
            );

            // Measure execution time
            const startTime = Date.now();

            // Act
            await service.updateRatingsAfterGame({
              userId: whitePlayerId,
              opponentId: blackPlayerId,
              timeControl,
              result,
              gameId,
            });

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // Assert: Transaction should be called (indicating update was attempted)
            expect(mockPrismaService.$transaction).toHaveBeenCalled();

            // Assert: Execution time should be reasonable (< 5000ms for logic)
            // Note: This is a logic test, not a real database performance test
            expect(executionTime).toBeLessThan(5000);

            // Assert: Transaction should include all required operations
            const transactionCalls = mockPrismaService.$transaction.mock.calls[0][0];
            expect(transactionCalls).toHaveLength(5); // 2 rating updates + 2 history + 1 game update
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should update both players ratings atomically in a single transaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // gameId
          fc.uuid(), // player1Id
          fc.uuid(), // player2Id
          fc.constantFrom(...Object.values(TimeControl)), // timeControl
          fc.constantFrom(GameResult.WHITE_WIN, GameResult.BLACK_WIN, GameResult.DRAW), // result
          async (gameId, player1Id, player2Id, timeControl, result) => {
            // Ensure different players
            fc.pre(player1Id !== player2Id);

            // Clear mocks before each property test iteration
            jest.clearAllMocks();

            // Mock game
            mockPrismaService.game.findUnique.mockResolvedValue({
              id: gameId,
              whitePlayerId: player1Id,
              blackPlayerId: player2Id,
            });

            // Mock ratings
            const player1Rating = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: player1Id,
              timeControl,
              rating: 1500,
              peakRating: 1500,
              gamesPlayed: 20,
              wins: 10,
              losses: 8,
              draws: 2,
              isProvisional: false,
              kFactor: 20,
              updatedAt: new Date(),
            };

            const player2Rating = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: player2Id,
              timeControl,
              rating: 1480,
              peakRating: 1520,
              gamesPlayed: 25,
              wins: 12,
              losses: 10,
              draws: 3,
              isProvisional: false,
              kFactor: 20,
              updatedAt: new Date(),
            };

            mockPrismaService.rating.findUnique
              .mockResolvedValueOnce(player1Rating)
              .mockResolvedValueOnce(player2Rating);

            mockPrismaService.$transaction.mockImplementation((operations) =>
              Promise.all(operations)
            );

            // Act
            await service.updateRatingsAfterGame({
              userId: player1Id,
              opponentId: player2Id,
              timeControl,
              result,
              gameId,
            });

            // Assert: Should use transaction (atomic operation)
            expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

            // Assert: Transaction should include updates for both players
            const transactionCalls = mockPrismaService.$transaction.mock.calls[0][0];
            expect(transactionCalls.length).toBeGreaterThanOrEqual(4); // At least 2 rating updates + 2 history records
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
