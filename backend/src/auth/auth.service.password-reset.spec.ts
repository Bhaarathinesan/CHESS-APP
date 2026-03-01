import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('AuthService - Password Reset', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('should send password reset email for valid user', async () => {
      const email = 'test@university.edu';
      const mockUser = {
        id: 'user-id',
        email,
        username: 'testuser',
        passwordHash: 'hashed-password',
        oauthProvider: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword({ email });

      expect(result.success).toBe(true);
      expect(result.message).toBe('If an account with that email exists, a password reset link has been sent');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();

      // Verify token and expiration were set
      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordResetToken).toBeDefined();
      expect(updateCall.data.passwordResetExpires).toBeInstanceOf(Date);
    });

    it('should return success message even if user does not exist (prevent email enumeration)', async () => {
      const email = 'nonexistent@university.edu';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email });

      expect(result.success).toBe(true);
      expect(result.message).toBe('If an account with that email exists, a password reset link has been sent');
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return success message for OAuth users without sending email', async () => {
      const email = 'oauth@university.edu';
      const mockUser = {
        id: 'user-id',
        email,
        username: 'oauthuser',
        passwordHash: null,
        oauthProvider: 'google',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.forgotPassword({ email });

      expect(result.success).toBe(true);
      expect(result.message).toBe('If an account with that email exists, a password reset link has been sent');
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should set token expiration to 1 hour from now', async () => {
      const email = 'test@university.edu';
      const mockUser = {
        id: 'user-id',
        email,
        username: 'testuser',
        passwordHash: 'hashed-password',
        oauthProvider: null,
      };

      const beforeTime = new Date();
      beforeTime.setHours(beforeTime.getHours() + 1);

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.forgotPassword({ email });

      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      const expirationTime = updateCall.data.passwordResetExpires;

      const afterTime = new Date();
      afterTime.setHours(afterTime.getHours() + 1);

      // Check that expiration is approximately 1 hour from now (within 1 minute tolerance)
      expect(expirationTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 60000);
      expect(expirationTime.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 60000);
    });

    it('should throw error if email service fails', async () => {
      const email = 'test@university.edu';
      const mockUser = {
        id: 'user-id',
        email,
        username: 'testuser',
        passwordHash: 'hashed-password',
        oauthProvider: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service error'));

      await expect(service.forgotPassword({ email })).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewPassword123';
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockUser = {
        id: 'user-id',
        email: 'test@university.edu',
        username: 'testuser',
        passwordHash: 'old-hashed-password',
        passwordResetToken: token,
        passwordResetExpires: futureDate,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.resetPassword({ token, newPassword });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password reset successfully');
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { passwordResetToken: token },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalled();

      // Verify password was hashed and token was cleared
      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordHash).toBeDefined();
      expect(updateCall.data.passwordResetToken).toBeNull();
      expect(updateCall.data.passwordResetExpires).toBeNull();
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';
      const newPassword = 'NewPassword123';

      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword({ token, newPassword })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword({ token, newPassword })).rejects.toThrow(
        'Invalid or expired password reset token',
      );
    });

    it('should throw error for expired token', async () => {
      const token = 'expired-token';
      const newPassword = 'NewPassword123';
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2); // 2 hours ago

      const mockUser = {
        id: 'user-id',
        email: 'test@university.edu',
        username: 'testuser',
        passwordHash: 'old-hashed-password',
        passwordResetToken: token,
        passwordResetExpires: pastDate,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.resetPassword({ token, newPassword })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword({ token, newPassword })).rejects.toThrow(
        'Password reset token has expired',
      );
    });

    it('should hash new password with bcrypt', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewPassword123';
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockUser = {
        id: 'user-id',
        email: 'test@university.edu',
        username: 'testuser',
        passwordHash: 'old-hashed-password',
        passwordResetToken: token,
        passwordResetExpires: futureDate,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.resetPassword({ token, newPassword });

      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      const hashedPassword = updateCall.data.passwordHash;

      // Verify the password was hashed with bcrypt
      const isValidHash = await bcrypt.compare(newPassword, hashedPassword);
      expect(isValidHash).toBe(true);
    });

    it('should clear reset token and expiration after successful reset', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewPassword123';
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockUser = {
        id: 'user-id',
        email: 'test@university.edu',
        username: 'testuser',
        passwordHash: 'old-hashed-password',
        passwordResetToken: token,
        passwordResetExpires: futureDate,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.resetPassword({ token, newPassword });

      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordResetToken).toBeNull();
      expect(updateCall.data.passwordResetExpires).toBeNull();
    });
  });
});
