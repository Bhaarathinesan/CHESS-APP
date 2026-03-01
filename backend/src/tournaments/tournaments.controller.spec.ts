import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { TournamentFormat, TimeControl, TournamentStatus } from '@prisma/client';

describe('TournamentsController', () => {
  let controller: TournamentsController;
  let service: TournamentsService;

  const mockTournamentsService = {
    createTournament: jest.fn(),
    getTournaments: jest.fn(),
    getTournamentById: jest.fn(),
    getTournamentByShareLink: jest.fn(),
    updateTournament: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<TournamentsController>(TournamentsController);
    service = module.get<TournamentsService>(TournamentsService);
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
});
