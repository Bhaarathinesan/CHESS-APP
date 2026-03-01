import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('AuthService - Google OAuth', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    rating: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
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
    jwtService = module.get<JwtService>(JwtService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('googleOAuth', () => {
    const mockProfile = {
      oauthId: 'google-123',
      email: 'test@university.edu',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    it('should login existing user with OAuth account', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'test@university.edu',
        username: 'testuser',
        displayName: 'Test User',
        oauthProvider: 'google',
        oauthId: 'google-123',
        role: 'PLAYER',
        isBanned: false,
        passwordHash: null,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(existingUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.googleOAuth(mockProfile);

      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'user-123',
          email: 'test@university.edu',
        }),
        accessToken: 'mock-jwt-token',
        expiresIn: '24h',
        isNewUser: false,
      });

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          oauthProvider: 'google',
          oauthId: 'google-123',
        },
      });
    });

    it('should throw UnauthorizedException if user is banned', async () => {
      const bannedUser = {
        id: 'user-123',
        email: 'test@university.edu',
        oauthProvider: 'google',
        oauthId: 'google-123',
        isBanned: true,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(bannedUser);

      await expect(service.googleOAuth(mockProfile)).rejects.toThrow(UnauthorizedException);
      await expect(service.googleOAuth(mockProfile)).rejects.toThrow(
        'Your account has been banned',
      );
    });

    it('should link OAuth account to existing email user', async () => {
      const existingEmailUser = {
        id: 'user-123',
        email: 'test@university.edu',
        username: 'testuser',
        displayName: 'Test User',
        oauthProvider: null,
        oauthId: null,
        role: 'PLAYER',
        isBanned: false,
        passwordHash: 'hashed-password',
        avatarUrl: null,
      };

      const updatedUser = {
        ...existingEmailUser,
        oauthProvider: 'google',
        oauthId: 'google-123',
        avatarUrl: 'https://example.com/avatar.jpg',
        emailVerified: true,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(existingEmailUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.googleOAuth(mockProfile);

      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'user-123',
          oauthProvider: 'google',
          oauthId: 'google-123',
        }),
        accessToken: 'mock-jwt-token',
        expiresIn: '24h',
        isNewUser: false,
        accountLinked: true,
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          oauthProvider: 'google',
          oauthId: 'google-123',
          avatarUrl: 'https://example.com/avatar.jpg',
          emailVerified: true,
        },
      });
    });

    it('should return profile data for new user registration', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.googleOAuth(mockProfile);

      expect(result).toEqual({
        isNewUser: true,
        profile: {
          email: 'test@university.edu',
          oauthId: 'google-123',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          oauthProvider: 'google',
        },
      });
    });
  });

  describe('completeGoogleRegistration', () => {
    const registrationData = {
      email: 'test@university.edu',
      oauthId: 'google-123',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      username: 'testuser',
      collegeName: 'Test University',
      collegeDomain: 'university.edu',
    };

    it('should complete registration for new OAuth user', async () => {
      const newUser = {
        id: 'user-123',
        email: 'test@university.edu',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        collegeName: 'Test University',
        collegeDomain: 'university.edu',
        oauthProvider: 'google',
        oauthId: 'google-123',
        role: 'PLAYER',
        emailVerified: true,
        passwordHash: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.rating.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.completeGoogleRegistration(registrationData);

      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'user-123',
          email: 'test@university.edu',
          username: 'testuser',
        }),
        accessToken: 'mock-jwt-token',
        expiresIn: '24h',
        isNewUser: true,
      });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@university.edu',
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          collegeName: 'Test University',
          collegeDomain: 'university.edu',
          oauthProvider: 'google',
          oauthId: 'google-123',
          role: 'PLAYER',
          emailVerified: true,
          passwordHash: null,
        },
      });

      // Verify initial ratings were created
      expect(mockPrismaService.rating.create).toHaveBeenCalledTimes(4);
    });

    it('should throw ConflictException if username already exists', async () => {
      const existingUser = {
        id: 'other-user',
        username: 'testuser',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.completeGoogleRegistration(registrationData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.completeGoogleRegistration(registrationData)).rejects.toThrow(
        'Username already taken',
      );
    });

    it('should validate college domain', async () => {
      const invalidData = {
        ...registrationData,
        email: 'test@gmail.com',
        collegeDomain: 'university.edu',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.completeGoogleRegistration(invalidData)).rejects.toThrow();
    });

    it('should create user with emailVerified set to true', async () => {
      const newUser = {
        id: 'user-123',
        emailVerified: true,
        passwordHash: null,
        ...registrationData,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.rating.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      await service.completeGoogleRegistration(registrationData);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emailVerified: true,
          passwordHash: null,
        }),
      });
    });
  });
});
