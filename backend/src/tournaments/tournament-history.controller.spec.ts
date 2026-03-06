import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { StandingsService } from './standings.service';
import { TournamentExportService } from './tournament-export.service';

describe('TournamentsController - Tournament History', () => {
  let controller: TournamentsController;
  let tournamentsService: TournamentsService;

  const mockTournamentsService = {
    getTournamentHistory: jest.fn(),
  };

  const mockStandingsService = {};
  const mockExportService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournamentsController],
      providers: [
        {
          provide: TournamentsService,
          useValue: mockTournamentsService,
        },
        {
          provide: StandingsService,
          useValue: mockStandingsService,
        },
        {
          provide: TournamentExportService,
          useValue: mockExportService,
        },
      ],
    }).compile();

    controller = module.get<TournamentsController>(TournamentsController);
    tournamentsService = module.get<TournamentsService>(TournamentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTournamentHistory', () => {
    const userId = 'user-123';
    const mockHistoryResponse = {
      userId,
      totalTournaments: 5,
      completedTournaments: 3,
      activeTournaments: 2,
      topPlacements: 2,
      tournaments: [
        {
          tournamentId: 'tournament-1',
          tournamentName: 'Spring Championship',
          format: 'SWISS',
          timeControl: 'BLITZ',
          startTime: new Date('2024-01-10'),
          endTime: new Date('2024-01-15'),
          status: 'COMPLETED',
          placement: 1,
          totalPlayers: 32,
          score: 5.5,
          wins: 5,
          losses: 1,
          draws: 1,
          isRated: true,
        },
      ],
    };

    it('should return tournament history for a user', async () => {
      mockTournamentsService.getTournamentHistory.mockResolvedValue(
        mockHistoryResponse,
      );

      const result = await controller.getTournamentHistory(userId);

      expect(result).toEqual(mockHistoryResponse);
      expect(tournamentsService.getTournamentHistory).toHaveBeenCalledWith(
        userId,
        {
          status: undefined,
          limit: undefined,
          offset: undefined,
        },
      );
    });

    it('should pass status filter to service', async () => {
      mockTournamentsService.getTournamentHistory.mockResolvedValue(
        mockHistoryResponse,
      );

      await controller.getTournamentHistory(userId, 'COMPLETED');

      expect(tournamentsService.getTournamentHistory).toHaveBeenCalledWith(
        userId,
        {
          status: 'COMPLETED',
          limit: undefined,
          offset: undefined,
        },
      );
    });

    it('should pass pagination parameters to service', async () => {
      mockTournamentsService.getTournamentHistory.mockResolvedValue(
        mockHistoryResponse,
      );

      await controller.getTournamentHistory(userId, undefined, '10', '20');

      expect(tournamentsService.getTournamentHistory).toHaveBeenCalledWith(
        userId,
        {
          status: undefined,
          limit: 10,
          offset: 20,
        },
      );
    });

    it('should parse limit and offset as integers', async () => {
      mockTournamentsService.getTournamentHistory.mockResolvedValue(
        mockHistoryResponse,
      );

      await controller.getTournamentHistory(userId, undefined, '25', '50');

      expect(tournamentsService.getTournamentHistory).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          limit: 25,
          offset: 50,
        }),
      );
    });

    it('should handle all query parameters together', async () => {
      mockTournamentsService.getTournamentHistory.mockResolvedValue(
        mockHistoryResponse,
      );

      await controller.getTournamentHistory(
        userId,
        'IN_PROGRESS',
        '15',
        '30',
      );

      expect(tournamentsService.getTournamentHistory).toHaveBeenCalledWith(
        userId,
        {
          status: 'IN_PROGRESS',
          limit: 15,
          offset: 30,
        },
      );
    });

    it('should handle missing query parameters', async () => {
      mockTournamentsService.getTournamentHistory.mockResolvedValue({
        ...mockHistoryResponse,
        tournaments: [],
      });

      await controller.getTournamentHistory(userId);

      expect(tournamentsService.getTournamentHistory).toHaveBeenCalledWith(
        userId,
        {
          status: undefined,
          limit: undefined,
          offset: undefined,
        },
      );
    });
  });
});
