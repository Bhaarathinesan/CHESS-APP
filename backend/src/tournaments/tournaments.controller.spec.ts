import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { StandingsService } from './standings.service';
import { TournamentFormat, TimeControl, TournamentStatus } from '@prisma/client';

describe('TournamentsController', () => {
  let controller: TournamentsController;
  let service: TournamentsService;
  let standingsService: StandingsService;

  const mockTournamentsService = {
    createTournament: jest.fn(),
    getTournaments: jest.fn(),
    getTournamentById: jest.fn(),
    getTournamentByShareLink: jest.fn(),
    updateTournament: jest.fn(),
    joinTournament: jest.fn(),
    leaveTournament: jest.fn(),
    startTournament: jest.fn(),
    cancelTournament: jest.fn(),
    pauseTournament: jest.fn(),
    resumeTournament: jest.fn(),
  };

  const mockStandingsService = {
    getStandings: jest.fn(),
  };

  const mockTournament = {
    id: 'tournament-id-1',
    name: 'Test Tournament',
    description: 'A test tournament',
    bannerUrl: null,
    creatorId: 'admin-id-1',
    creator: {
      id: 'admin-id-1',
      username: 'admin1',
      displayName: 'Admin One',
      avatarUrl: null,
    },
    format: TournamentFormat.SWISS,
    timeControl: TimeControl.BLITZ,
    initialTimeMinutes: 5,
    incrementSeconds: 3,
    isRated: true,
    status: TournamentStatus.CREATED,
    minPlayers: 4,
    maxPlayers: 16,
    currentPlayers: 0,
    roundsTotal: 5,
    roundsCompleted: 0,
    currentRound: 0,
    pairingMethod: 'automatic',
    tiebreakCriteria: 'buchholz',
    allowLateRegistration: false,
    spectatorDelaySeconds: 0,
    registrationDeadline: new Date('2024-12-31T10:00:00Z'),
    startTime: new Date('2024-12-31T12:00:00Z'),
    endTime: null,
    shareLink: 'abc123xyz',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...',
    prizeDescription: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    user: {
      userId: 'admin-id-1',
      username: 'admin1',
      role: 'TOURNAMENT_ADMIN',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournamentsController],
      providers: [
        { provide: TournamentsService, useValue: mockTournamentsService },
        { provide: StandingsService, useValue: mockStandingsService },
      ],
    }).compile();

    controller = module.get<TournamentsController>(TournamentsController);
    service = module.get<TournamentsService>(TournamentsService);
    standingsService = module.get<StandingsService>(StandingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTournament', () => {
    const createDto = {
      name: 'Test Tournament',
      description: 'A test tournament',
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

    it('should create a tournament', async () => {
      mockTournamentsService.createTournament.mockResolvedValue(mockTournament);

      const result = await controller.createTournament(createDto, mockRequest);

      expect(result).toEqual(mockTournament);
      expect(service.createTournament).toHaveBeenCalledWith(
        createDto,
        'admin-id-1',
      );
    });
  });

  describe('getTournaments', () => {
    it('should return paginated tournaments', async () => {
      const mockResponse = {
        tournaments: [mockTournament],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockTournamentsService.getTournaments.mockResolvedValue(mockResponse);

      const result = await controller.getTournaments({ page: 1, limit: 20 });

      expect(result).toEqual(mockResponse);
      expect(service.getTournaments).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });

    it('should filter tournaments by format', async () => {
      const mockResponse = {
        tournaments: [mockTournament],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockTournamentsService.getTournaments.mockResolvedValue(mockResponse);

      const result = await controller.getTournaments({
        format: TournamentFormat.SWISS,
      });

      expect(result).toEqual(mockResponse);
      expect(service.getTournaments).toHaveBeenCalledWith({
        format: TournamentFormat.SWISS,
      });
    });
  });

  describe('getTournamentById', () => {
    it('should return tournament by ID', async () => {
      mockTournamentsService.getTournamentById.mockResolvedValue(mockTournament);

      const result = await controller.getTournamentById('tournament-id-1');

      expect(result).toEqual(mockTournament);
      expect(service.getTournamentById).toHaveBeenCalledWith(
        'tournament-id-1',
        true,
      );
    });
  });

  describe('getTournamentByShareLink', () => {
    it('should return tournament by share link', async () => {
      mockTournamentsService.getTournamentByShareLink.mockResolvedValue(
        mockTournament,
      );

      const result = await controller.getTournamentByShareLink('abc123xyz');

      expect(result).toEqual(mockTournament);
      expect(service.getTournamentByShareLink).toHaveBeenCalledWith('abc123xyz');
    });
  });

  describe('updateTournament', () => {
    const updateDto = {
      name: 'Updated Tournament',
      description: 'Updated description',
    };

    it('should update tournament', async () => {
      const updatedTournament = { ...mockTournament, ...updateDto };
      mockTournamentsService.updateTournament.mockResolvedValue(
        updatedTournament,
      );

      const result = await controller.updateTournament(
        'tournament-id-1',
        updateDto,
        mockRequest,
      );

      expect(result).toEqual(updatedTournament);
      expect(service.updateTournament).toHaveBeenCalledWith(
        'tournament-id-1',
        updateDto,
        'admin-id-1',
      );
    });
  });

  describe('getStandings', () => {
    const mockStandings = [
      {
        userId: 'user-id-1',
        username: 'player1',
        displayName: 'Player One',
        avatarUrl: 'https://example.com/avatar1.jpg',
        score: 2.5,
        wins: 2,
        losses: 0,
        draws: 1,
        buchholzScore: 7.5,
        sonneborBerger: 5.0,
        rank: 1,
        gamesPlayed: 3,
      },
      {
        userId: 'user-id-2',
        username: 'player2',
        displayName: 'Player Two',
        avatarUrl: null,
        score: 2.0,
        wins: 2,
        losses: 1,
        draws: 0,
        buchholzScore: 6.0,
        sonneborBerger: 4.0,
        rank: 2,
        gamesPlayed: 3,
      },
      {
        userId: 'user-id-3',
        username: 'player3',
        displayName: 'Player Three',
        avatarUrl: 'https://example.com/avatar3.jpg',
        score: 1.5,
        wins: 1,
        losses: 1,
        draws: 1,
        buchholzScore: 5.5,
        sonneborBerger: 3.0,
        rank: 3,
        gamesPlayed: 3,
      },
    ];

    it('should return tournament standings', async () => {
      mockStandingsService.getStandings.mockResolvedValue(mockStandings);

      const result = await controller.getStandings('tournament-id-1');

      expect(result).toEqual(mockStandings);
      expect(standingsService.getStandings).toHaveBeenCalledWith(
        'tournament-id-1',
      );
    });

    it('should return standings with all required fields', async () => {
      mockStandingsService.getStandings.mockResolvedValue(mockStandings);

      const result = await controller.getStandings('tournament-id-1');

      // Verify all required fields are present (Requirement 12.4)
      expect(result).toHaveLength(3);
      result.forEach((standing) => {
        expect(standing).toHaveProperty('userId');
        expect(standing).toHaveProperty('username');
        expect(standing).toHaveProperty('displayName');
        expect(standing).toHaveProperty('score'); // total points
        expect(standing).toHaveProperty('wins');
        expect(standing).toHaveProperty('losses');
        expect(standing).toHaveProperty('draws');
        expect(standing).toHaveProperty('rank');
        expect(standing).toHaveProperty('buchholzScore'); // tiebreak
        expect(standing).toHaveProperty('sonneborBerger'); // tiebreak
        expect(standing).toHaveProperty('gamesPlayed');
      });
    });

    it('should return standings ordered by rank', async () => {
      mockStandingsService.getStandings.mockResolvedValue(mockStandings);

      const result = await controller.getStandings('tournament-id-1');

      // Verify standings are ordered by rank
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);
      
      // Verify higher rank has higher score
      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
      expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
    });

    it('should return empty array for tournament with no players', async () => {
      mockStandingsService.getStandings.mockResolvedValue([]);

      const result = await controller.getStandings('tournament-id-empty');

      expect(result).toEqual([]);
      expect(standingsService.getStandings).toHaveBeenCalledWith(
        'tournament-id-empty',
      );
    });

    it('should handle standings with tied scores', async () => {
      const tiedStandings = [
        {
          userId: 'user-id-1',
          username: 'player1',
          displayName: 'Player One',
          avatarUrl: null,
          score: 2.0,
          wins: 2,
          losses: 1,
          draws: 0,
          buchholzScore: 7.0,
          sonneborBerger: 5.0,
          rank: 1,
          gamesPlayed: 3,
        },
        {
          userId: 'user-id-2',
          username: 'player2',
          displayName: 'Player Two',
          avatarUrl: null,
          score: 2.0,
          wins: 2,
          losses: 1,
          draws: 0,
          buchholzScore: 6.5,
          sonneborBerger: 4.5,
          rank: 2,
          gamesPlayed: 3,
        },
      ];

      mockStandingsService.getStandings.mockResolvedValue(tiedStandings);

      const result = await controller.getStandings('tournament-id-tied');

      // Verify tied scores are resolved by tiebreak
      expect(result[0].score).toBe(result[1].score);
      expect(result[0].buchholzScore).toBeGreaterThan(result[1].buchholzScore);
      expect(result[0].rank).toBeLessThan(result[1].rank);
    });
  });

  describe('getPairings', () => {
    const mockSwissPairings = {
      tournamentId: 'tournament-id-1',
      format: TournamentFormat.SWISS,
      currentRound: 2,
      totalRounds: 5,
      displayType: 'table',
      rounds: [
        {
          roundNumber: 1,
          pairings: [
            {
              id: 'pairing-1',
              boardNumber: 1,
              whitePlayer: {
                id: 'user-id-1',
                username: 'player1',
                displayName: 'Player One',
                avatarUrl: null,
              },
              blackPlayer: {
                id: 'user-id-2',
                username: 'player2',
                displayName: 'Player Two',
                avatarUrl: null,
              },
              result: 'WHITE_WIN',
              isBye: false,
              game: {
                id: 'game-1',
                status: 'COMPLETED',
                result: 'WHITE_WIN',
                terminationReason: 'CHECKMATE',
              },
            },
          ],
        },
        {
          roundNumber: 2,
          pairings: [
            {
              id: 'pairing-2',
              boardNumber: 1,
              whitePlayer: {
                id: 'user-id-1',
                username: 'player1',
                displayName: 'Player One',
                avatarUrl: null,
              },
              blackPlayer: {
                id: 'user-id-3',
                username: 'player3',
                displayName: 'Player Three',
                avatarUrl: null,
              },
              result: null,
              isBye: false,
              game: {
                id: 'game-2',
                status: 'ACTIVE',
                result: null,
                terminationReason: null,
              },
            },
          ],
        },
      ],
    };

    const mockEliminationBracket = {
      tournamentId: 'tournament-id-2',
      format: TournamentFormat.SINGLE_ELIMINATION,
      currentRound: 2,
      displayType: 'bracket',
      bracket: [
        {
          roundNumber: 1,
          roundName: 'Quarter-Finals',
          matches: [
            {
              id: 'pairing-1',
              boardNumber: 1,
              whitePlayer: {
                id: 'user-id-1',
                username: 'player1',
                displayName: 'Player One',
                avatarUrl: null,
              },
              blackPlayer: {
                id: 'user-id-2',
                username: 'player2',
                displayName: 'Player Two',
                avatarUrl: null,
              },
              result: 'WHITE_WIN',
              isBye: false,
              game: {
                id: 'game-1',
                status: 'COMPLETED',
                result: 'WHITE_WIN',
                terminationReason: 'CHECKMATE',
              },
              winner: 'user-id-1',
            },
          ],
        },
        {
          roundNumber: 2,
          roundName: 'Semi-Finals',
          matches: [
            {
              id: 'pairing-2',
              boardNumber: 1,
              whitePlayer: {
                id: 'user-id-1',
                username: 'player1',
                displayName: 'Player One',
                avatarUrl: null,
              },
              blackPlayer: {
                id: 'user-id-3',
                username: 'player3',
                displayName: 'Player Three',
                avatarUrl: null,
              },
              result: null,
              isBye: false,
              game: {
                id: 'game-2',
                status: 'ACTIVE',
                result: null,
                terminationReason: null,
              },
              winner: null,
            },
          ],
        },
      ],
    };

    beforeEach(() => {
      mockTournamentsService.getPairings = jest.fn();
    });

    it('should return pairings table for Swiss tournament (Requirement 12.5)', async () => {
      mockTournamentsService.getPairings.mockResolvedValue(mockSwissPairings);

      const result = await controller.getPairings('tournament-id-1');

      expect(result).toEqual(mockSwissPairings);
      expect(result.displayType).toBe('table');
      expect(result.rounds).toHaveLength(2);
      expect(service.getPairings).toHaveBeenCalledWith('tournament-id-1', undefined);
    });

    it('should return pairings table for Round Robin tournament (Requirement 12.5)', async () => {
      const roundRobinPairings = {
        ...mockSwissPairings,
        format: TournamentFormat.ROUND_ROBIN,
      };
      mockTournamentsService.getPairings.mockResolvedValue(roundRobinPairings);

      const result = await controller.getPairings('tournament-id-1');

      expect(result.displayType).toBe('table');
      expect(result.format).toBe(TournamentFormat.ROUND_ROBIN);
      expect(service.getPairings).toHaveBeenCalledWith('tournament-id-1', undefined);
    });

    it('should return bracket for Single Elimination tournament (Requirement 12.6)', async () => {
      mockTournamentsService.getPairings.mockResolvedValue(mockEliminationBracket);

      const result = await controller.getPairings('tournament-id-2');

      expect(result).toEqual(mockEliminationBracket);
      expect(result.displayType).toBe('bracket');
      expect(result.bracket).toHaveLength(2);
      expect(result.bracket[0].roundName).toBe('Quarter-Finals');
      expect(result.bracket[1].roundName).toBe('Semi-Finals');
      expect(service.getPairings).toHaveBeenCalledWith('tournament-id-2', undefined);
    });

    it('should return bracket for Double Elimination tournament (Requirement 12.6)', async () => {
      const doubleElimBracket = {
        ...mockEliminationBracket,
        format: TournamentFormat.DOUBLE_ELIMINATION,
      };
      mockTournamentsService.getPairings.mockResolvedValue(doubleElimBracket);

      const result = await controller.getPairings('tournament-id-3');

      expect(result.displayType).toBe('bracket');
      expect(result.format).toBe(TournamentFormat.DOUBLE_ELIMINATION);
      expect(service.getPairings).toHaveBeenCalledWith('tournament-id-3', undefined);
    });

    it('should filter pairings by round number', async () => {
      const singleRoundPairings = {
        ...mockSwissPairings,
        rounds: [mockSwissPairings.rounds[0]],
      };
      mockTournamentsService.getPairings.mockResolvedValue(singleRoundPairings);

      const result = await controller.getPairings('tournament-id-1', '1');

      expect(result.rounds).toHaveLength(1);
      expect(result.rounds[0].roundNumber).toBe(1);
      expect(service.getPairings).toHaveBeenCalledWith('tournament-id-1', 1);
    });

    it('should include player details in pairings', async () => {
      mockTournamentsService.getPairings.mockResolvedValue(mockSwissPairings);

      const result = await controller.getPairings('tournament-id-1');

      const pairing = result.rounds[0].pairings[0];
      expect(pairing.whitePlayer).toHaveProperty('id');
      expect(pairing.whitePlayer).toHaveProperty('username');
      expect(pairing.whitePlayer).toHaveProperty('displayName');
      expect(pairing.whitePlayer).toHaveProperty('avatarUrl');
      expect(pairing.blackPlayer).toHaveProperty('id');
      expect(pairing.blackPlayer).toHaveProperty('username');
    });

    it('should include game details in pairings', async () => {
      mockTournamentsService.getPairings.mockResolvedValue(mockSwissPairings);

      const result = await controller.getPairings('tournament-id-1');

      const pairing = result.rounds[0].pairings[0];
      expect(pairing.game).toHaveProperty('id');
      expect(pairing.game).toHaveProperty('status');
      expect(pairing.game).toHaveProperty('result');
      expect(pairing.game).toHaveProperty('terminationReason');
    });

    it('should handle bye pairings', async () => {
      const pairingsWithBye = {
        ...mockSwissPairings,
        rounds: [
          {
            roundNumber: 1,
            pairings: [
              {
                id: 'pairing-bye',
                boardNumber: 1,
                whitePlayer: {
                  id: 'user-id-1',
                  username: 'player1',
                  displayName: 'Player One',
                  avatarUrl: null,
                },
                blackPlayer: null,
                result: 'BYE',
                isBye: true,
                game: null,
              },
            ],
          },
        ],
      };
      mockTournamentsService.getPairings.mockResolvedValue(pairingsWithBye);

      const result = await controller.getPairings('tournament-id-1');

      const byePairing = result.rounds[0].pairings[0];
      expect(byePairing.isBye).toBe(true);
      expect(byePairing.blackPlayer).toBeNull();
      expect(byePairing.result).toBe('BYE');
    });

    it('should include winner information in elimination brackets', async () => {
      mockTournamentsService.getPairings.mockResolvedValue(mockEliminationBracket);

      const result = await controller.getPairings('tournament-id-2');

      const completedMatch = result.bracket[0].matches[0];
      expect(completedMatch).toHaveProperty('winner');
      expect(completedMatch.winner).toBe('user-id-1');

      const activeMatch = result.bracket[1].matches[0];
      expect(activeMatch.winner).toBeNull();
    });

    it('should order pairings by board number within rounds', async () => {
      const multiPairingRound = {
        ...mockSwissPairings,
        rounds: [
          {
            roundNumber: 1,
            pairings: [
              { id: 'p1', boardNumber: 1, whitePlayer: {}, blackPlayer: {}, result: null, isBye: false, game: null },
              { id: 'p2', boardNumber: 2, whitePlayer: {}, blackPlayer: {}, result: null, isBye: false, game: null },
              { id: 'p3', boardNumber: 3, whitePlayer: {}, blackPlayer: {}, result: null, isBye: false, game: null },
            ],
          },
        ],
      };
      mockTournamentsService.getPairings.mockResolvedValue(multiPairingRound);

      const result = await controller.getPairings('tournament-id-1');

      const pairings = result.rounds[0].pairings;
      expect(pairings[0].boardNumber).toBe(1);
      expect(pairings[1].boardNumber).toBe(2);
      expect(pairings[2].boardNumber).toBe(3);
    });

    it('should return empty rounds array for tournament with no pairings', async () => {
      const emptyPairings = {
        tournamentId: 'tournament-id-empty',
        format: TournamentFormat.SWISS,
        currentRound: 0,
        totalRounds: 5,
        displayType: 'table',
        rounds: [],
      };
      mockTournamentsService.getPairings.mockResolvedValue(emptyPairings);

      const result = await controller.getPairings('tournament-id-empty');

      expect(result.rounds).toEqual([]);
      expect(result.currentRound).toBe(0);
    });
  });
});
