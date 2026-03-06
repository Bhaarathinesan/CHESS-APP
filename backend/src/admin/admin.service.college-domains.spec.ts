import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AdminService - College Domains', () => {
  let service: AdminService;
  let prisma: PrismaService;

  const mockPrismaService = {
    collegeDomain: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCollegeDomains', () => {
    it('should return list of college domains with user counts', async () => {
      const mockDomains = [
        {
          id: '1',
          domain: 'stanford.edu',
          collegeName: 'Stanford University',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          domain: 'mit.edu',
          collegeName: 'MIT',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.collegeDomain.findMany.mockResolvedValue(mockDomains);
      mockPrismaService.user.count
        .mockResolvedValueOnce(10) // stanford.edu
        .mockResolvedValueOnce(15); // mit.edu

      const result = await service.getCollegeDomains();

      expect(result.domains).toHaveLength(2);
      expect(result.domains[0].userCount).toBe(10);
      expect(result.domains[1].userCount).toBe(15);
      expect(result.total).toBe(2);
    });
  });

  describe('addCollegeDomain', () => {
    it('should add a new college domain', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue(null);
      mockPrismaService.collegeDomain.create.mockResolvedValue({
        id: '1',
        domain: 'stanford.edu',
        collegeName: 'Stanford University',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.addCollegeDomain('stanford.edu', 'Stanford University');

      expect(mockPrismaService.collegeDomain.create).toHaveBeenCalledWith({
        data: {
          domain: 'stanford.edu',
          collegeName: 'Stanford University',
          isActive: true,
        },
      });
    });

    it('should normalize domain to lowercase', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue(null);
      mockPrismaService.collegeDomain.create.mockResolvedValue({
        id: '1',
        domain: 'stanford.edu',
        collegeName: 'Stanford University',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.addCollegeDomain('STANFORD.EDU', 'Stanford University');

      expect(mockPrismaService.collegeDomain.findUnique).toHaveBeenCalledWith({
        where: { domain: 'stanford.edu' },
      });
      expect(mockPrismaService.collegeDomain.create).toHaveBeenCalledWith({
        data: {
          domain: 'stanford.edu',
          collegeName: 'Stanford University',
          isActive: true,
        },
      });
    });

    it('should throw BadRequestException if domain already exists', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue({
        id: '1',
        domain: 'stanford.edu',
        collegeName: 'Stanford University',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.addCollegeDomain('stanford.edu', 'Stanford University'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeCollegeDomain', () => {
    it('should remove a college domain with no users', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue({
        id: '1',
        domain: 'stanford.edu',
        collegeName: 'Stanford University',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.collegeDomain.delete.mockResolvedValue({});

      await service.removeCollegeDomain('1');

      expect(mockPrismaService.collegeDomain.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if domain does not exist', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue(null);

      await expect(service.removeCollegeDomain('1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if domain has users', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue({
        id: '1',
        domain: 'stanford.edu',
        collegeName: 'Stanford University',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.user.count.mockResolvedValue(10);

      await expect(service.removeCollegeDomain('1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.removeCollegeDomain('1')).rejects.toThrow(
        'Cannot remove domain: 10 user(s) are registered with this domain',
      );
    });
  });

  describe('toggleCollegeDomainStatus', () => {
    it('should toggle domain status from active to inactive', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue({
        id: '1',
        domain: 'stanford.edu',
        collegeName: 'Stanford University',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.collegeDomain.update.mockResolvedValue({});

      await service.toggleCollegeDomainStatus('1');

      expect(mockPrismaService.collegeDomain.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
    });

    it('should toggle domain status from inactive to active', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue({
        id: '1',
        domain: 'stanford.edu',
        collegeName: 'Stanford University',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.collegeDomain.update.mockResolvedValue({});

      await service.toggleCollegeDomainStatus('1');

      expect(mockPrismaService.collegeDomain.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: true },
      });
    });

    it('should throw NotFoundException if domain does not exist', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue(null);

      await expect(service.toggleCollegeDomainStatus('1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('isCollegeDomainApproved', () => {
    it('should return true for active approved domain', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue({
        id: '1',
        domain: 'stanford.edu',
        collegeName: 'Stanford University',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.isCollegeDomainApproved('stanford.edu');

      expect(result).toBe(true);
    });

    it('should return false for inactive domain', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue({
        id: '1',
        domain: 'stanford.edu',
        collegeName: 'Stanford University',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.isCollegeDomainApproved('stanford.edu');

      expect(result).toBe(false);
    });

    it('should return false for non-existent domain', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue(null);

      const result = await service.isCollegeDomainApproved('unknown.edu');

      expect(result).toBe(false);
    });

    it('should normalize domain to lowercase', async () => {
      mockPrismaService.collegeDomain.findUnique.mockResolvedValue({
        id: '1',
        domain: 'stanford.edu',
        collegeName: 'Stanford University',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.isCollegeDomainApproved('STANFORD.EDU');

      expect(mockPrismaService.collegeDomain.findUnique).toHaveBeenCalledWith({
        where: { domain: 'stanford.edu' },
      });
    });
  });
});
