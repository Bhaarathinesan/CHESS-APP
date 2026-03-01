import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserRole } from '@prisma/client';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "ChessArena API is running!"', () => {
      expect(appController.getHello()).toBe('ChessArena API is running!');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        role: UserRole.PLAYER,
      };

      const result = appController.getProfile(mockUser);

      expect(result).toEqual({
        message: 'This is your profile',
        user: mockUser,
      });
    });
  });

  describe('getAdminData', () => {
    it('should return admin data for super admin', () => {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        role: UserRole.SUPER_ADMIN,
      };

      const result = appController.getAdminData(mockUser);

      expect(result).toEqual({
        message: 'This is admin-only data',
        user: mockUser,
      });
    });
  });

  describe('getTournamentManagement', () => {
    it('should return tournament management data for tournament admin', () => {
      const mockUser = {
        id: '1',
        email: 'tournament@example.com',
        role: UserRole.TOURNAMENT_ADMIN,
      };

      const result = appController.getTournamentManagement(mockUser);

      expect(result).toEqual({
        message: 'Tournament management area',
        user: mockUser,
      });
    });

    it('should return tournament management data for super admin', () => {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        role: UserRole.SUPER_ADMIN,
      };

      const result = appController.getTournamentManagement(mockUser);

      expect(result).toEqual({
        message: 'Tournament management area',
        user: mockUser,
      });
    });
  });

  describe('getPlayerStats', () => {
    it('should return player stats for player', () => {
      const mockUser = {
        id: '1',
        email: 'player@example.com',
        role: UserRole.PLAYER,
      };

      const result = appController.getPlayerStats(mockUser);

      expect(result).toEqual({
        message: 'Player statistics',
        user: mockUser,
      });
    });
  });
});
