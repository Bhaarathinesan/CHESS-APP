import { Test, TestingModule } from '@nestjs/testing';
import { BanService } from './ban.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BanType } from '@prisma/client';

describe('BanService', () => {
  let service: BanService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userBan: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BanService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BanService>(BanService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('issueWarning', () => {
    it('should issue a warning to a user', async () => {
      const userId = 'user-123';
      const reason = 'Inappropriate behavior';
      const issuedBy = 'admin-123';

      const mockUser = { id: userId, username: 'testuser' };
      const mockWarning = {
        id: 'warning-123',
        userId,
        banType: BanType.WARNING,
        reason,
        issuedBy,
        isActive: true,
        user: mockUser,
        issuer: { id: issuedBy, username: 'admin' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userBan.create.mockResolvedValue(mockWarning);

      const result = await service.issueWarning(userId, reason, issuedBy);

      expect(result).toEqual(mockWarning);
      expect(prisma.userBan.create).toHaveBeenCalledWith({
        data: {
          userId,
          banType: BanType.WARNING,
          reason,
          issuedBy,
          isActive: true,
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.issueWarning('user-123', 'reason', 'admin-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('issueTemporaryBan', () => {
    it('should issue a temporary ban to a user', async () => {
      const userId = 'user-123';
      const reason = 'Cheating detected';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const issuedBy = 'admin-123';

      const mockUser = { id: userId, username: 'testuser' };
      const mockBan = {
        id: 'ban-123',
        userId,
        banType: BanType.TEMPORARY,
        reason,
        expiresAt,
        issuedBy,
        isActive: true,
        user: mockUser,
        issuer: { id: issuedBy, username: 'admin' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userBan.create.mockResolvedValue(mockBan);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.issueTemporaryBan(
        userId,
        reason,
        expiresAt,
        issuedBy,
      );

      expect(result).toEqual(mockBan);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          isBanned: true,
          banReason: reason,
          banExpires: expiresAt,
        },
      });
    });

    it('should throw BadRequestException if expiration date is in the past', async () => {
      const userId = 'user-123';
      const pastDate = new Date(Date.now() - 1000);

      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });

      await expect(
        service.issueTemporaryBan(userId, 'reason', pastDate, 'admin-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('issuePermanentBan', () => {
    it('should issue a permanent ban to a user', async () => {
      const userId = 'user-123';
      const reason = 'Repeated violations';
      const issuedBy = 'admin-123';

      const mockUser = { id: userId, username: 'testuser' };
      const mockBan = {
        id: 'ban-123',
        userId,
        banType: BanType.PERMANENT,
        reason,
        issuedBy,
        isActive: true,
        user: mockUser,
        issuer: { id: issuedBy, username: 'admin' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userBan.create.mockResolvedValue(mockBan);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.issuePermanentBan(userId, reason, issuedBy);

      expect(result).toEqual(mockBan);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          isBanned: true,
          banReason: reason,
          banExpires: null,
        },
      });
    });
  });

  describe('revokeBan', () => {
    it('should revoke an active ban', async () => {
      const banId = 'ban-123';
      const userId = 'user-123';
      const revokedBy = 'admin-123';
      const revokeReason = 'Appeal accepted';

      const mockBan = {
        id: banId,
        userId,
        isActive: true,
        user: { id: userId },
      };

      const mockUpdatedBan = {
        ...mockBan,
        isActive: false,
        revokedBy,
        revokeReason,
      };

      mockPrismaService.userBan.findUnique.mockResolvedValue(mockBan);
      mockPrismaService.userBan.update.mockResolvedValue(mockUpdatedBan);
      mockPrismaService.userBan.findMany.mockResolvedValue([]);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.revokeBan(banId, revokedBy, revokeReason);

      expect(result.isActive).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          isBanned: false,
          banReason: null,
          banExpires: null,
        },
      });
    });

    it('should throw NotFoundException if ban does not exist', async () => {
      mockPrismaService.userBan.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeBan('ban-123', 'admin-123', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if ban is already revoked', async () => {
      const mockBan = {
        id: 'ban-123',
        isActive: false,
      };

      mockPrismaService.userBan.findUnique.mockResolvedValue(mockBan);

      await expect(
        service.revokeBan('ban-123', 'admin-123', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('isUserBanned', () => {
    it('should return true if user is banned', async () => {
      const userId = 'user-123';
      const mockUser = {
        isBanned: true,
        banExpires: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.isUserBanned(userId);

      expect(result).toBe(true);
    });

    it('should return false if user is not banned', async () => {
      const userId = 'user-123';
      const mockUser = {
        isBanned: false,
        banExpires: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.isUserBanned(userId);

      expect(result).toBe(false);
    });

    it('should auto-unban expired temporary bans', async () => {
      const userId = 'user-123';
      const pastDate = new Date(Date.now() - 1000);
      const mockUser = {
        isBanned: true,
        banExpires: pastDate,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userBan.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.isUserBanned(userId);

      expect(result).toBe(false);
      expect(prisma.userBan.updateMany).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('getUserBans', () => {
    it('should return all bans for a user', async () => {
      const userId = 'user-123';
      const mockBans = [
        {
          id: 'ban-1',
          userId,
          banType: BanType.WARNING,
          reason: 'First warning',
        },
        {
          id: 'ban-2',
          userId,
          banType: BanType.TEMPORARY,
          reason: 'Second offense',
        },
      ];

      mockPrismaService.userBan.findMany.mockResolvedValue(mockBans);

      const result = await service.getUserBans(userId);

      expect(result).toEqual(mockBans);
      expect(result.length).toBe(2);
    });
  });
});
