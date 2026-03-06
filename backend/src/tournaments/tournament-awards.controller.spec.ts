import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsController } from './tournaments.controller';
import { TournamentAwardsService } from './tournament-awards.service';
import { TournamentsService } from './tournaments.service';
import { StandingsService } from './standings.service';
import { TournamentExportService } from './tournament-export.service';

describe('TournamentsController - Awards', () => {
  let controller: TournamentsController;
  let awardsService: TournamentAwardsService;

  const mockAwardsService = {
    awardPrizes: jest.fn(),
    getTournamentAwards: jest.fn(),
    getUserAwards: jest.fn(),
  };

  const mockTournamentsService = {};
  const mockStandingsService = {};
  const mockExportService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournamentsController],
      providers: [
        {
          provide: TournamentAwardsService,
          useValue: mockAwardsService,
        },
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
    awardsService = module.get<TournamentAwardsService>(TournamentAwardsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /tournaments/:id/awards', () => {
    it('should award prizes to top finishers', async () => {
      const tournamentId = 'tournament-123';
      const awardConfigs = [
        { placement: 1, title: '1st Place', description: 'Champion' },
        { placement: 2, title: '2nd Place', description: 'Runner-up' },
      ];
      const mockAwards = [
        {
          id: 'award-1',
          tournamentId,
          userId: 'user-1',
          placement: 1,
          awardTitle: '1st Place',
          awardDescription: 'Champion',
          createdAt: new Date(),
        },
        {
          id: 'award-2',
          tournamentId,
          userId: 'user-2',
          placement: 2,
          awardTitle: '2nd Place',
          awardDescription: 'Runner-up',
          createdAt: new Date(),
        },
      ];

      mockAwardsService.awardPrizes.mockResolvedValue(mockAwards);

      const req = { user: { userId: 'admin-123' } };
      const result = await controller.awardPrizes(tournamentId, awardConfigs, req);

      expect(result).toEqual(mockAwards);
      expect(mockAwardsService.awardPrizes).toHaveBeenCalledWith(tournamentId, awardConfigs);
    });
  });

  describe('GET /tournaments/:id/awards', () => {
    it('should return tournament awards', async () => {
      const tournamentId = 'tournament-123';
      const mockAwards = [
        {
          id: 'award-1',
          tournamentId,
          userId: 'user-1',
          placement: 1,
          awardTitle: '1st Place',
          awardDescription: 'Champion',
          createdAt: new Date(),
          username: 'player1',
          displayName: 'Player One',
        },
      ];

      mockAwardsService.getTournamentAwards.mockResolvedValue(mockAwards);

      const result = await controller.getTournamentAwards(tournamentId);

      expect(result).toEqual(mockAwards);
      expect(mockAwardsService.getTournamentAwards).toHaveBeenCalledWith(tournamentId);
    });
  });

  describe('GET /users/:userId/awards', () => {
    it('should return user awards', async () => {
      const userId = 'user-123';
      const mockAwards = [
        {
          id: 'award-1',
          tournamentId: 'tournament-1',
          userId,
          placement: 1,
          awardTitle: '1st Place',
          awardDescription: 'Champion',
          createdAt: new Date(),
        },
        {
          id: 'award-2',
          tournamentId: 'tournament-2',
          userId,
          placement: 2,
          awardTitle: '2nd Place',
          awardDescription: 'Runner-up',
          createdAt: new Date(),
        },
      ];

      mockAwardsService.getUserAwards.mockResolvedValue(mockAwards);

      const result = await controller.getUserAwards(userId);

      expect(result).toEqual(mockAwards);
      expect(mockAwardsService.getUserAwards).toHaveBeenCalledWith(userId);
    });
  });
});
