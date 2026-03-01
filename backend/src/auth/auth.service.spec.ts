import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    rating: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(() => 'mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const validRegisterDto = {
      email: 'student@university.edu',
      username: 'testuser',
      password: 'Password123',
      displayName: 'Test User',
      collegeName: 'Test University',
      collegeDomain: 'university.edu',
    };

    it('should successfully register a new user', async () => {
      const hashedPassword = 'hashedPassword123';
      const createdUser = {
        id: 'user-id',
        email: validRegisterDto.email,
        username: validRegisterDto.username,
        passwordHash: hashedPassword,
        displayName: validRegisterDto.displayName,
        collegeName: validRegisterDto.collegeName,
        collegeDomain: validRegisterDto.collegeDomain,
        role: 'PLAYER',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockPrismaService.rating.create.mockResolvedValue({});
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.register(validRegisterDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(2);
      expect(bcrypt.hash).toHaveBeenCalledWith(validRegisterDto.password, 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: validRegisterDto.email,
          username: validRegisterDto.username,
          passwordHash: hashedPassword,
          displayName: validRegisterDto.displayName,
          collegeName: validRegisterDto.collegeName,
          collegeDomain: validRegisterDto.collegeDomain,
          role: 'PLAYER',
          emailVerified: false,
        },
      });
      expect(mockPrismaService.rating.create).toHaveBeenCalledTimes(4);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe(validRegisterDto.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'existing-user',
        email: validRegisterDto.email,
      });

      await expect(service.register(validRegisterDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'existing-user',
        username: validRegisterDto.username,
      });

      await expect(service.register(validRegisterDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if email domain does not match college domain', async () => {
      const invalidDto = {
        ...validRegisterDto,
        email: 'student@different.edu',
        collegeDomain: 'university.edu',
      };

      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(invalidDto)).rejects.toThrow(
        'Email domain does not match the provided college domain',
      );
    });

    it('should throw BadRequestException if email is not from approved educational domain', async () => {
      const invalidDto = {
        ...validRegisterDto,
        email: 'student@company.com',
        collegeDomain: 'company.com',
      };

      await expect(service.register(invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(invalidDto)).rejects.toThrow(
        'Email must be from an approved educational institution',
      );
    });

    it('should hash password with 10 salt rounds', async () => {
      const hashedPassword = 'hashedPassword123';
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id',
        passwordHash: hashedPassword,
      } as any);
      mockPrismaService.rating.create.mockResolvedValue({});
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      await service.register(validRegisterDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(validRegisterDto.password, 10);
    });

    it('should create initial ratings for all time controls', async () => {
      const userId = 'user-id';
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: userId,
        passwordHash: 'hash',
      } as any);
      mockPrismaService.rating.create.mockResolvedValue({});
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');

      await service.register(validRegisterDto);

      expect(mockPrismaService.rating.create).toHaveBeenCalledTimes(4);
      expect(mockPrismaService.rating.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          rating: 1200,
          peakRating: 1200,
          gamesPlayed: 0,
          isProvisional: true,
          kFactor: 40,
        }),
      });
    });
  });
});
