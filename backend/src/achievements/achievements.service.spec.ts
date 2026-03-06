import { Test, TestingModule } from '@nestjs/testing';
import { AchievementsService } from './achievements.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeControl } from '@prisma/client';

describe('AchievementsService', () => {
  let service: AchievementsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    achievement: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    userAchievement: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    game: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    tournamentPlayer: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    follow: {
      count: jest.fn(),
    },
    rating: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AchievementsService>(AchievementsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('awardAchievement', () => {
    it('should award achievement if user does not have it', async () => {
      const userId = 'user-1';
      const achievementCode = 'first_victory';
      const achievement = {
        id: 'achievement-1',
        code: achievementCode,
        name: 'First Victory',
      };

      mockPrismaService.achievement.findUnique.mockResolvedValue(achievement);
      mockPrismaService.userAchievement.findUnique.mockResolvedValue(null);
      mockPrismaService.userAchievement.create.mockResolvedValue({});

      const result = await service.awardAchievement(userId, achievementCode);

      expect(result).toBe(true);
      expect(mockPrismaService.userAchievement.create).toHaveBeenCalledWith({
        data: {
          userId,
          achievementId: achievement.id,
        },
      });
    });

    it('should not award achievement if user already has it', async () => {
      const userId = 'user-1';
      const achievementCode = 'first_victory';
      const achievement = {
        id: 'achievement-1',
        code: achievementCode,
      };

      mockPrismaService.achievement.findUnique.mockResolvedValue(achievement);
      mockPrismaService.userAchievement.findUnique.mockResolvedValue({
        id: 'user-achievement-1',
      });

      const result = await service.awardAchievement(userId, achievementCode);

      expect(result).toBe(false);
      expect(mockPrismaService.userAchievement.create).not.toHaveBeenCalled();
    });
  });

  describe('checkGameplayAchievements', () => {
    it('should award first_victory for first win', async () => {
      const userId = 'user-1';
      const gameId = 'game-1';
      const game = {
        id: gameId,
        whitePlayerId: userId,
        blackPlayerId: 'user-2',
        result: 'WHITE_WIN',
        timeControl: TimeControl.BLITZ,
        moveCount: 30,
        terminationReason: 'checkmate',
        moves: [],
      };

      mockPrismaService.game.findUnique.mockResolvedValue(game);
      mockPrismaService.game.count.mockResolvedValue(1); // First win
      mockPrismaService.achievement.findUnique.mockResolvedValue({
        id: 'achievement-1',
        code: 'first_victory',
      });
      mockPrismaService.userAchievement.findUnique.mockResolvedValue(null);
      mockPrismaService.userAchievement.create.mockResolvedValue({});

      const awarded = await service.checkGameplayAchievements(userId, gameId);

      expect(awarded).toContain('first_victory');
    });

    it('should award speed_demon for bullet win', async () => {
      const userId = 'user-1';
      const gameId = 'game-1';
      const game = {
        id: gameId,
        whitePlayerId: userId,
        blackPlayerId: 'user-2',
        result: 'WHITE_WIN',
        timeControl: TimeControl.BULLET,
        moveCount: 25,
        terminationReason: 'checkmate',
        moves: [],
      };

      mockPrismaService.game.findUnique.mockResolvedValue(game);
      mockPrismaService.game.count.mockResolvedValue(5);
      mockPrismaService.achievement.findUnique.mockResolvedValue({
        id: 'achievement-2',
        code: 'speed_demon',
      });
      mockPrismaService.userAchievement.findUnique.mockResolvedValue(null);
      mockPrismaService.userAchievement.create.mockResolvedValue({});

      const awarded = await service.checkGameplayAchievements(userId, gameId);

      expect(awarded).toContain('speed_demon');
    });

    it('should award marathon_runner for 100+ move game', async () => {
      const userId = 'user-1';
      const gameId = 'game-1';
      const game = {
        id: gameId,
        whitePlayerId: userId,
        blackPlayerId: 'user-2',
        result: 'DRAW',
        timeControl: TimeControl.CLASSICAL,
        moveCount: 105,
        terminationReason: 'draw_agreement',
        moves: [],
      };

      mockPrismaService.game.findUnique.mockResolvedValue(game);
      mockPrismaService.achievement.findUnique.mockResolvedValue({
        id: 'achievement-3',
        code: 'marathon_runner',
      });
      mockPrismaService.userAchievement.findUnique.mockResolvedValue(null);
      mockPrismaService.userAchievement.create.mockResolvedValue({});

      const awarded = await service.checkGameplayAchievements(userId, gameId);

      expect(awarded).toContain('marathon_runner');
    });
  });

  describe('checkRatingAchievements', () => {
    it('should award giant_killer for beating higher rated opponent', async () => {
      const userId = 'user-1';
      const timeControl = TimeControl.BLITZ;
      const newRating = 1350;
      const oldRating = 1300;
      const opponentRating = 1550;

      mockPrismaService.achievement.findUnique.mockResolvedValue({
        id: 'achievement-4',
        code: 'giant_killer',
      });
      mockPrismaService.userAchievement.findUnique.mockResolvedValue(null);
      mockPrismaService.userAchievement.create.mockResolvedValue({});

      const awarded = await service.checkRatingAchievements(
        userId,
        timeControl,
        newRating,
        oldRating,
        opponentRating,
      );

      expect(awarded).toContain('giant_killer');
    });

    it('should award rating milestone achievements', async () => {
      const userId = 'user-1';
      const timeControl = TimeControl.RAPID;
      const newRating = 1600;
      const oldRating = 1580;

      mockPrismaService.achievement.findUnique.mockResolvedValue({
        id: 'achievement-5',
        code: 'club_player',
      });
      mockPrismaService.userAchievement.findUnique.mockResolvedValue(null);
      mockPrismaService.userAchievement.create.mockResolvedValue({});

      const awarded = await service.checkRatingAchievements(
        userId,
        timeControl,
        newRating,
        oldRating,
      );

      expect(awarded).toContain('club_player');
    });
  });

  describe('checkTournamentAchievements', () => {
    it('should award tournament_debut for first tournament', async () => {
      const userId = 'user-1';
      const tournamentId = 'tournament-1';

      mockPrismaService.tournamentPlayer.count.mockResolvedValue(1);
      mockPrismaService.achievement.findUnique.mockResolvedValue({
        id: 'achievement-6',
        code: 'tournament_debut',
      });
      mockPrismaService.userAchievement.findUnique.mockResolvedValue(null);
      mockPrismaService.userAchievement.create.mockResolvedValue({});
      mockPrismaService.tournamentPlayer.findUnique.mockResolvedValue(null);
      mockPrismaService.game.count.mockResolvedValue(0);

      const awarded = await service.checkTournamentAchievements(
        userId,
        tournamentId,
      );

      expect(awarded).toContain('tournament_debut');
    });
  });

  describe('checkSocialAchievements', () => {
    it('should award social_butterfly for 10 follows', async () => {
      const userId = 'user-1';

      mockPrismaService.follow.count.mockResolvedValue(10);
      mockPrismaService.achievement.findUnique.mockResolvedValue({
        id: 'achievement-7',
        code: 'social_butterfly',
      });
      mockPrismaService.userAchievement.findUnique.mockResolvedValue(null);
      mockPrismaService.userAchievement.create.mockResolvedValue({});

      const awarded = await service.checkSocialAchievements(userId);

      expect(awarded).toContain('social_butterfly');
    });
  });

  describe('getUserAchievements', () => {
    it('should return user achievements', async () => {
      const userId = 'user-1';
      const achievements = [
        {
          id: 'ua-1',
          userId,
          achievementId: 'a-1',
          earnedAt: new Date(),
          achievement: {
            id: 'a-1',
            code: 'first_victory',
            name: 'First Victory',
          },
        },
      ];

      mockPrismaService.userAchievement.findMany.mockResolvedValue(
        achievements,
      );

      const result = await service.getUserAchievements(userId);

      expect(result).toEqual(achievements);
    });
  });

  describe('getAllAchievements', () => {
    it('should return all achievements', async () => {
      const achievements = [
        { id: 'a-1', code: 'first_victory', name: 'First Victory' },
        { id: 'a-2', code: 'speed_demon', name: 'Speed Demon' },
      ];

      mockPrismaService.achievement.findMany.mockResolvedValue(achievements);

      const result = await service.getAllAchievements();

      expect(result).toEqual(achievements);
    });
  });
});
