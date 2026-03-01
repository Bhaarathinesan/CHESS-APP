import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AuthService - Email Verification', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    rating: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        FRONTEND_URL: 'http://localhost:3000',
      };
      return config[key];
    }),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('verifyEmail', () => {
    it('should verify email successfully with valid token', async () => {
      const token = 'valid-token-123';
      const mockUser = {
        id: 'user-id-123',
        email: 'test@university.edu',
        username: 'testuser',
        emailVerified: false,
        emailVerificationToken: token,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
        emailVerificationToken: null,
      });

      const result = await service.verifyEmail(token);

      expect(result).toEqual({
        success: true,
        message: 'Email verified successfully',
      });
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { emailVerificationToken: token },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
        },
      });
    });

    it('should return success if email is already verified', async () => {
      const token = 'valid-token-123';
      const mockUser = {
        id: 'user-id-123',
        email: 'test@university.edu',
        username: 'testuser',
        emailVerified: true,
        emailVerificationToken: token,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.verifyEmail(token);

      expect(result).toEqual({
        success: true,
        message: 'Email already verified',
      });
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid token', async () => {
      const token = 'invalid-token';

      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail(token)).rejects.toThrow(NotFoundException);
      await expect(service.verifyEmail(token)).rejects.toThrow('Invalid or expired verification token');
    });

    it('should throw BadRequestException when token is missing', async () => {
      await expect(service.verifyEmail('')).rejects.toThrow(BadRequestException);
      await expect(service.verifyEmail('')).rejects.toThrow('Verification token is required');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email successfully', async () => {
      const email = 'test@university.edu';
      const mockUser = {
        id: 'user-id-123',
        email,
        username: 'testuser',
        emailVerified: false,
        emailVerificationToken: 'old-token',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        emailVerificationToken: 'new-token',
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.resendVerificationEmail(email);

      expect(result).toEqual({
        success: true,
        message: 'Verification email sent',
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        email,
        expect.any(String),
        mockUser.username,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const email = 'nonexistent@university.edu';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.resendVerificationEmail(email)).rejects.toThrow(NotFoundException);
      await expect(service.resendVerificationEmail(email)).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException when email is already verified', async () => {
      const email = 'test@university.edu';
      const mockUser = {
        id: 'user-id-123',
        email,
        username: 'testuser',
        emailVerified: true,
        emailVerificationToken: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.resendVerificationEmail(email)).rejects.toThrow(BadRequestException);
      await expect(service.resendVerificationEmail(email)).rejects.toThrow('Email is already verified');
    });

    it('should generate a new token when resending', async () => {
      const email = 'test@university.edu';
      const oldToken = 'old-token-123';
      const mockUser = {
        id: 'user-id-123',
        email,
        username: 'testuser',
        emailVerified: false,
        emailVerificationToken: oldToken,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockImplementation((args) => {
        return Promise.resolve({
          ...mockUser,
          emailVerificationToken: args.data.emailVerificationToken,
        });
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.resendVerificationEmail(email);

      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      const newToken = updateCall.data.emailVerificationToken;

      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(oldToken);
      expect(typeof newToken).toBe('string');
      expect(newToken.length).toBeGreaterThan(0);
    });
  });

  describe('register - email verification integration', () => {
    it('should generate verification token and send email on registration', async () => {
      const registerDto = {
        email: 'newuser@university.edu',
        username: 'newuser',
        password: 'SecurePass123!',
        displayName: 'New User',
        collegeName: 'Test University',
        collegeDomain: 'university.edu',
      };

      const mockUser = {
        id: 'user-id-123',
        ...registerDto,
        passwordHash: 'hashed-password',
        emailVerified: false,
        emailVerificationToken: 'generated-token',
        role: 'PLAYER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.rating.create.mockResolvedValue({});
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result.emailVerified).toBe(false);
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        registerDto.email,
        expect.any(String),
        registerDto.username,
      );
    });

    it('should not fail registration if email sending fails', async () => {
      const registerDto = {
        email: 'newuser@university.edu',
        username: 'newuser',
        password: 'SecurePass123!',
        displayName: 'New User',
        collegeName: 'Test University',
        collegeDomain: 'university.edu',
      };

      const mockUser = {
        id: 'user-id-123',
        ...registerDto,
        passwordHash: 'hashed-password',
        emailVerified: false,
        emailVerificationToken: 'generated-token',
        role: 'PLAYER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.rating.create.mockResolvedValue({});
      mockEmailService.sendVerificationEmail.mockRejectedValue(new Error('Email service error'));

      // Should not throw error
      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
    });
  });
});
