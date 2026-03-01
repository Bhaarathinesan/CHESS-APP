import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const mockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = mockExecutionContext({ id: '1', role: UserRole.PLAYER });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user is not authenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPER_ADMIN]);
      const context = mockExecutionContext(null);

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should allow access when user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPER_ADMIN]);
      const context = mockExecutionContext({
        id: '1',
        role: UserRole.SUPER_ADMIN,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user does not have required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPER_ADMIN]);
      const context = mockExecutionContext({ id: '1', role: UserRole.PLAYER });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should allow access when user has one of multiple required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ADMIN]);
      const context = mockExecutionContext({
        id: '1',
        role: UserRole.TOURNAMENT_ADMIN,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user has none of the required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ADMIN]);
      const context = mockExecutionContext({ id: '1', role: UserRole.PLAYER });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should handle all four user roles correctly', () => {
      const roles = [
        UserRole.SUPER_ADMIN,
        UserRole.TOURNAMENT_ADMIN,
        UserRole.PLAYER,
        UserRole.SPECTATOR,
      ];

      roles.forEach((role) => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([role]);
        const context = mockExecutionContext({ id: '1', role });

        expect(guard.canActivate(context)).toBe(true);
      });
    });
  });
});
