import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsService } from './tournaments.service';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentFormat, TimeControl } from '@prisma/client';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for Tournament Service
 * 
 * These tests validate universal properties that should hold true
 * for all possible inputs, using the fast-check library to generate
 * randomized test cases.
 * 
 * **Validates: Requirements 9.16**
 */
describe('TournamentsService - Property-Based Tests', () => {
  let service: TournamentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    tournament: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockTournamentAdmin = {
    id: 'admin-id-1',
    username: 'admin1',
    displayName: 'Admin One',
    role: 'TOURNAMENT_ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TournamentsService>(TournamentsService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Set environment variable for QR code generation
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 32: Unique Tournament Links
   * 
   * For any tournament created, the system should generate a unique shareable link
   * that does not collide with any existing tournament link.
   * 
   * **Validates: Requirements 9.16**
   */
  describe('Property 32: Unique tournament links', () => {
    it('should generate unique share links for any number of tournaments created', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // Number of tournaments to create
          async (tournamentCount) => {
            // Track all generated share links
            const generatedLinks = new Set<string>();
            
            // Mock user as tournament admin
            mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);
            
            // Mock tournament.findUnique to simulate checking for existing links
            mockPrismaService.tournament.findUnique.mockImplementation(
              async ({ where }: any) => {
                if (where.shareLink && generatedLinks.has(where.shareLink)) {
                  // Link already exists
                  return { id: 'existing-id', shareLink: where.shareLink };
                }
                return null; // Link doesn't exist
              },
            );

            // Mock tournament.create to track generated links
            mockPrismaService.tournament.create.mockImplementation(
              async ({ data }: any) => {
                const shareLink = data.shareLink;
                generatedLinks.add(shareLink);
                
                return {
                  id: fc.sample(fc.uuid(), 1)[0],
                  ...data,
                  creatorId: 'admin-id-1',
                  status: 'CREATED',
                  currentPlayers: 0,
                  roundsCompleted: 0,
                  currentRound: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  creator: mockTournamentAdmin,
                };
              },
            );

            // Create multiple tournaments
            const tournaments = [];
            for (let i = 0; i < tournamentCount; i++) {
              const createDto = {
                name: `Tournament ${i}`,
                description: `Test tournament ${i}`,
                format: TournamentFormat.SWISS,
                timeControl: TimeControl.BLITZ,
                initialTimeMinutes: 5,
                incrementSeconds: 3,
                isRated: true,
                minPlayers: 4,
                maxPlayers: 16,
                roundsTotal: 5,
                pairingMethod: 'automatic',
                tiebreakCriteria: 'buchholz',
                allowLateRegistration: false,
                spectatorDelaySeconds: 0,
                registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
                startTime: new Date(Date.now() + 172800000).toISOString(),
              };

              const tournament = await service.createTournament(
                createDto,
                'admin-id-1',
              );
              tournaments.push(tournament);
            }

            // Property: All share links must be unique
            const shareLinks = tournaments.map((t) => t.shareLink);
            const uniqueLinks = new Set(shareLinks);
            
            expect(uniqueLinks.size).toBe(tournamentCount);
            
            // Property: All share links must be non-empty strings
            shareLinks.forEach((link) => {
              expect(link).toBeDefined();
              expect(typeof link).toBe('string');
              expect(link.length).toBeGreaterThan(0);
            });

            // Property: Share links should be URL-safe (alphanumeric only)
            shareLinks.forEach((link) => {
              expect(link).toMatch(/^[A-Za-z0-9]+$/);
            });

            // Property: Share links should have reasonable length (not too short, not too long)
            shareLinks.forEach((link) => {
              expect(link.length).toBeGreaterThanOrEqual(8);
              expect(link.length).toBeLessThanOrEqual(20);
            });
          },
        ),
        { numRuns: 10 }, // Run 10 times with different tournament counts
      );
    });

    it('should generate different share links for tournaments with identical data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 3, maxLength: 50 }),
            format: fc.constantFrom(...Object.values(TournamentFormat)),
            timeControl: fc.constantFrom(...Object.values(TimeControl)),
            initialTimeMinutes: fc.integer({ min: 1, max: 180 }),
            incrementSeconds: fc.integer({ min: 0, max: 60 }),
            minPlayers: fc.integer({ min: 4, max: 100 }),
            maxPlayers: fc.integer({ min: 4, max: 100 }),
          }),
          async (tournamentData) => {
            // Ensure maxPlayers >= minPlayers
            if (tournamentData.maxPlayers < tournamentData.minPlayers) {
              tournamentData.maxPlayers = tournamentData.minPlayers;
            }

            // Validate time control ranges
            const timeControlRanges: Record<TimeControl, { min: number; max: number }> = {
              BULLET: { min: 1, max: 3 },
              BLITZ: { min: 3, max: 10 },
              RAPID: { min: 10, max: 30 },
              CLASSICAL: { min: 30, max: 180 },
            };

            const range = timeControlRanges[tournamentData.timeControl];
            if (
              tournamentData.initialTimeMinutes < range.min ||
              tournamentData.initialTimeMinutes > range.max
            ) {
              // Skip invalid time control combinations
              return true;
            }

            const generatedLinks = new Set<string>();

            mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);
            
            mockPrismaService.tournament.findUnique.mockImplementation(
              async ({ where }: any) => {
                if (where.shareLink && generatedLinks.has(where.shareLink)) {
                  return { id: 'existing-id', shareLink: where.shareLink };
                }
                return null;
              },
            );

            mockPrismaService.tournament.create.mockImplementation(
              async ({ data }: any) => {
                const shareLink = data.shareLink;
                generatedLinks.add(shareLink);
                
                return {
                  id: fc.sample(fc.uuid(), 1)[0],
                  ...data,
                  creatorId: 'admin-id-1',
                  status: 'CREATED',
                  currentPlayers: 0,
                  roundsCompleted: 0,
                  currentRound: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  creator: mockTournamentAdmin,
                };
              },
            );

            // Create two tournaments with identical data
            const createDto = {
              name: tournamentData.name,
              description: 'Test tournament',
              format: tournamentData.format,
              timeControl: tournamentData.timeControl,
              initialTimeMinutes: tournamentData.initialTimeMinutes,
              incrementSeconds: tournamentData.incrementSeconds,
              isRated: true,
              minPlayers: tournamentData.minPlayers,
              maxPlayers: tournamentData.maxPlayers,
              roundsTotal: tournamentData.format === TournamentFormat.SWISS ? 5 : undefined,
              pairingMethod: 'automatic',
              tiebreakCriteria: 'buchholz',
              allowLateRegistration: false,
              spectatorDelaySeconds: 0,
              registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
              startTime: new Date(Date.now() + 172800000).toISOString(),
            };

            const tournament1 = await service.createTournament(
              createDto,
              'admin-id-1',
            );
            const tournament2 = await service.createTournament(
              createDto,
              'admin-id-1',
            );

            // Property: Even with identical tournament data, share links must be different
            expect(tournament1.shareLink).not.toBe(tournament2.shareLink);
            
            // Property: Both links should be valid
            expect(tournament1.shareLink).toBeDefined();
            expect(tournament2.shareLink).toBeDefined();
            expect(tournament1.shareLink.length).toBeGreaterThan(0);
            expect(tournament2.shareLink.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 20 }, // Run 20 times with different tournament configurations
      );
    });

    it('should generate share links that are collision-resistant', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 100 }), // Number of tournaments
          async (count) => {
            const generatedLinks = new Set<string>();
            
            mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);
            
            mockPrismaService.tournament.findUnique.mockImplementation(
              async ({ where }: any) => {
                if (where.shareLink && generatedLinks.has(where.shareLink)) {
                  return { id: 'existing-id', shareLink: where.shareLink };
                }
                return null;
              },
            );

            mockPrismaService.tournament.create.mockImplementation(
              async ({ data }: any) => {
                const shareLink = data.shareLink;
                generatedLinks.add(shareLink);
                
                return {
                  id: fc.sample(fc.uuid(), 1)[0],
                  ...data,
                  creatorId: 'admin-id-1',
                  status: 'CREATED',
                  currentPlayers: 0,
                  roundsCompleted: 0,
                  currentRound: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  creator: mockTournamentAdmin,
                };
              },
            );

            // Create many tournaments rapidly
            const tournaments = await Promise.all(
              Array.from({ length: count }, async (_, i) => {
                const createDto = {
                  name: `Tournament ${i}`,
                  description: `Test tournament ${i}`,
                  format: TournamentFormat.SWISS,
                  timeControl: TimeControl.BLITZ,
                  initialTimeMinutes: 5,
                  incrementSeconds: 3,
                  isRated: true,
                  minPlayers: 4,
                  maxPlayers: 16,
                  roundsTotal: 5,
                  pairingMethod: 'automatic',
                  tiebreakCriteria: 'buchholz',
                  allowLateRegistration: false,
                  spectatorDelaySeconds: 0,
                  registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
                  startTime: new Date(Date.now() + 172800000).toISOString(),
                };

                return service.createTournament(createDto, 'admin-id-1');
              }),
            );

            // Property: No collisions should occur
            const shareLinks = tournaments.map((t) => t.shareLink);
            const uniqueLinks = new Set(shareLinks);
            
            expect(uniqueLinks.size).toBe(count);
            
            // Property: Collision rate should be 0%
            const collisionRate = 1 - uniqueLinks.size / count;
            expect(collisionRate).toBe(0);
          },
        ),
        { numRuns: 5 }, // Run 5 times with different counts
      );
    });
  });
});
