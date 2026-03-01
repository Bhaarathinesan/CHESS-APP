import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsService } from './tournaments.service';
import { TournamentStateMachineService } from './tournament-state-machine.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TournamentFormat, TimeControl, TournamentStatus } from '@prisma/client';

describe('TournamentsService', () => {
  let service: TournamentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    tournament: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockTournamentAdmin = {
    id: 'admin-id-1',
    username: 'admin1',
    displayName: 'Admin One',
    role: 'TOURNAMENT_ADMIN',
  };

  const mockPlayer = {
    id: 'player-id-1',
    username: 'player1',
    displayName: 'Player One',
    role: 'PLAYER',
  };

  const mockTournament = {
    id: 'tournament-id-1',
    name: 'Test Tournament',
    description: 'A test tournament',
    bannerUrl: null,
    creatorId: 'admin-id-1',
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
    creator: {
      id: 'admin-id-1',
      username: 'admin1',
      displayName: 'Admin One',
      avatarUrl: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        TournamentStateMachineService,
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

  describe('createTournament', () => {
    const validCreateDto = {
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
      registrationDeadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    };

    it('should create a tournament successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);
      mockPrismaService.tournament.findUnique.mockResolvedValue(null); // No existing share link
      mockPrismaService.tournament.create.mockResolvedValue(mockTournament);

      const result = await service.createTournament(
        validCreateDto,
        'admin-id-1',
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Tournament');
      expect(result.shareLink).toBeDefined();
      expect(result.qrCodeUrl).toBeDefined();
      expect(mockPrismaService.tournament.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if creator does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createTournament(validCreateDto, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not Tournament_Admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockPlayer);

      await expect(
        service.createTournament(validCreateDto, 'player-id-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if minPlayers > maxPlayers', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidDto = {
        ...validCreateDto,
        minPlayers: 20,
        maxPlayers: 10,
      };

      await expect(
        service.createTournament(invalidDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if registration deadline is in the past', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidDto = {
        ...validCreateDto,
        registrationDeadline: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      };

      await expect(
        service.createTournament(invalidDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if start time is before registration deadline', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidDto = {
        ...validCreateDto,
        registrationDeadline: new Date(Date.now() + 172800000).toISOString(),
        startTime: new Date(Date.now() + 86400000).toISOString(),
      };

      await expect(
        service.createTournament(invalidDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if Swiss format without roundsTotal', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidDto = {
        ...validCreateDto,
        format: TournamentFormat.SWISS,
        roundsTotal: undefined,
      };

      await expect(
        service.createTournament(invalidDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid time control', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidDto = {
        ...validCreateDto,
        timeControl: TimeControl.BULLET,
        initialTimeMinutes: 10, // Too high for bullet
      };

      await expect(
        service.createTournament(invalidDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTournamentById', () => {
    it('should return tournament with details', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);

      const result = await service.getTournamentById('tournament-id-1', true);

      expect(result).toBeDefined();
      expect(result.id).toBe('tournament-id-1');
      expect(result.name).toBe('Test Tournament');
    });

    it('should throw NotFoundException if tournament does not exist', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.getTournamentById('invalid-id', false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTournamentByShareLink', () => {
    it('should return tournament by share link', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);

      const result = await service.getTournamentByShareLink('abc123xyz');

      expect(result).toBeDefined();
      expect(result.shareLink).toBe('abc123xyz');
    });

    it('should throw NotFoundException if share link is invalid', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.getTournamentByShareLink('invalid-link'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTournaments', () => {
    it('should return paginated tournaments', async () => {
      mockPrismaService.tournament.count.mockResolvedValue(1);
      mockPrismaService.tournament.findMany.mockResolvedValue([mockTournament]);

      const result = await service.getTournaments({ page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.tournaments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter tournaments by format', async () => {
      mockPrismaService.tournament.count.mockResolvedValue(1);
      mockPrismaService.tournament.findMany.mockResolvedValue([mockTournament]);

      const result = await service.getTournaments({
        format: TournamentFormat.SWISS,
      });

      expect(result.tournaments).toHaveLength(1);
      expect(mockPrismaService.tournament.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ format: TournamentFormat.SWISS }),
        }),
      );
    });

    it('should filter tournaments by status', async () => {
      mockPrismaService.tournament.count.mockResolvedValue(1);
      mockPrismaService.tournament.findMany.mockResolvedValue([mockTournament]);

      const result = await service.getTournaments({
        status: TournamentStatus.REGISTRATION_OPEN,
      });

      expect(result.tournaments).toHaveLength(1);
      expect(mockPrismaService.tournament.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TournamentStatus.REGISTRATION_OPEN,
          }),
        }),
      );
    });

    it('should search tournaments by name', async () => {
      mockPrismaService.tournament.count.mockResolvedValue(1);
      mockPrismaService.tournament.findMany.mockResolvedValue([mockTournament]);

      const result = await service.getTournaments({ search: 'Test' });

      expect(result.tournaments).toHaveLength(1);
      expect(mockPrismaService.tournament.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('updateTournament', () => {
    const updateDto = {
      name: 'Updated Tournament',
      description: 'Updated description',
    };

    it('should update tournament successfully', async () => {
      const superAdmin = { ...mockTournamentAdmin, role: 'SUPER_ADMIN' };
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.user.findUnique.mockResolvedValue(superAdmin);
      mockPrismaService.tournament.update.mockResolvedValue({
        ...mockTournament,
        ...updateDto,
      });

      const result = await service.updateTournament(
        'tournament-id-1',
        updateDto,
        'admin-id-1',
      );

      expect(result.name).toBe('Updated Tournament');
      expect(mockPrismaService.tournament.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tournament does not exist', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTournament('invalid-id', updateDto, 'admin-id-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not creator or super admin', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.user.findUnique.mockResolvedValue(mockPlayer);

      await expect(
        service.updateTournament('tournament-id-1', updateDto, 'player-id-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if tournament has already started', async () => {
      const startedTournament = {
        ...mockTournament,
        status: TournamentStatus.IN_PROGRESS,
      };
      mockPrismaService.tournament.findUnique.mockResolvedValue(
        startedTournament,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      await expect(
        service.updateTournament('tournament-id-1', updateDto, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if updated minPlayers > maxPlayers', async () => {
      mockPrismaService.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrismaService.user.findUnique.mockResolvedValue(mockTournamentAdmin);

      const invalidUpdate = {
        minPlayers: 20,
        maxPlayers: 10,
      };

      await expect(
        service.updateTournament('tournament-id-1', invalidUpdate, 'admin-id-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
