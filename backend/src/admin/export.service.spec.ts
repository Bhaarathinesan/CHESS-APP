import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExportService', () => {
  let service: ExportService;
  let prisma: PrismaService;

  const mockUsers = [
    {
      id: 'user-1',
      email: 'user1@college.edu',
      username: 'user1',
      displayName: 'User One',
      collegeName: 'Test College',
      collegeDomain: 'college.edu',
      role: 'PLAYER',
      emailVerified: true,
      isOnline: true,
      lastOnline: new Date('2024-01-15T10:00:00Z'),
      isBanned: false,
      banReason: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    },
    {
      id: 'user-2',
      email: 'user2@college.edu',
      username: 'user2',
      displayName: 'User Two',
      collegeName: 'Test College',
      collegeDomain: 'college.edu',
      role: 'TOURNAMENT_ADMIN',
      emailVerified: true,
      isOnline: false,
      lastOnline: new Date('2024-01-14T10:00:00Z'),
      isBanned: false,
      banReason: null,
      createdAt: new Date('2024-01-02T00:00:00Z'),
    },
  ];

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    game: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    tournamentPlayer: {
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportUsersToCSV', () => {
    it('should export users to CSV format', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.exportUsersToCSV();

      expect(result).toBeInstanceOf(Buffer);
      const csvContent = result.toString('utf-8');
      
      // Check header
      expect(csvContent).toContain('ID,Email,Username,Display Name');
      
      // Check data rows
      expect(csvContent).toContain('user1@college.edu');
      expect(csvContent).toContain('user2@college.edu');
      expect(csvContent).toContain('Test College');
    });

    it('should apply role filter when provided', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUsers[1]]);

      await service.exportUsersToCSV({ role: 'TOURNAMENT_ADMIN' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'TOURNAMENT_ADMIN',
          }),
        }),
      );
    });

    it('should apply college domain filter when provided', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      await service.exportUsersToCSV({ collegeDomain: 'college.edu' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            collegeDomain: 'college.edu',
          }),
        }),
      );
    });

    it('should apply banned filter when provided', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.exportUsersToCSV({ isBanned: true });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isBanned: true,
          }),
        }),
      );
    });

    it('should handle empty user list', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.exportUsersToCSV();

      expect(result).toBeInstanceOf(Buffer);
      const csvContent = result.toString('utf-8');
      
      // Should still have header
      expect(csvContent).toContain('ID,Email,Username');
      
      // Should not have data rows (only header line)
      const lines = csvContent.split('\n').filter(line => line.trim());
      expect(lines.length).toBe(1);
    });

    it('should escape special characters in CSV', async () => {
      const userWithSpecialChars = {
        ...mockUsers[0],
        displayName: 'User "Special" Name',
        banReason: 'Reason with, comma',
      };
      mockPrismaService.user.findMany.mockResolvedValue([userWithSpecialChars]);

      const result = await service.exportUsersToCSV();
      const csvContent = result.toString('utf-8');

      // Check that quotes are escaped
      expect(csvContent).toContain('""Special""');
    });
  });

  describe('exportAnalyticsToCSV', () => {
    beforeEach(() => {
      // Mock analytics data
      mockPrismaService.user.count.mockResolvedValue(100);
      mockPrismaService.game.count.mockResolvedValue(500);
      mockPrismaService.game.findMany.mockResolvedValue([
        {
          startedAt: new Date('2024-01-15T10:00:00Z'),
          completedAt: new Date('2024-01-15T10:30:00Z'),
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
      ]);
      mockPrismaService.game.groupBy.mockResolvedValue([
        { timeControl: 'BLITZ', _count: { timeControl: 300 } },
        { timeControl: 'RAPID', _count: { timeControl: 200 } },
      ]);
      mockPrismaService.tournamentPlayer.groupBy.mockResolvedValue(
        Array(50).fill({ userId: 'user-id' }),
      );
    });

    it('should export analytics to CSV format', async () => {
      const result = await service.exportAnalyticsToCSV();

      expect(result).toBeInstanceOf(Buffer);
      const csvContent = result.toString('utf-8');
      
      // Check sections
      expect(csvContent).toContain('USER METRICS');
      expect(csvContent).toContain('GAME METRICS');
      expect(csvContent).toContain('POPULAR TIME CONTROLS');
      expect(csvContent).toContain('TOURNAMENT METRICS');
      expect(csvContent).toContain('PEAK USAGE HOURS');
    });

    it('should include user metrics in CSV', async () => {
      const result = await service.exportAnalyticsToCSV();
      const csvContent = result.toString('utf-8');

      expect(csvContent).toContain('Total Users,100');
    });

    it('should include game metrics in CSV', async () => {
      const result = await service.exportAnalyticsToCSV();
      const csvContent = result.toString('utf-8');

      expect(csvContent).toContain('Total Games,500');
    });

    it('should include time control statistics', async () => {
      const result = await service.exportAnalyticsToCSV();
      const csvContent = result.toString('utf-8');

      expect(csvContent).toContain('BLITZ');
      expect(csvContent).toContain('RAPID');
    });
  });

  describe('exportUsersToPDF', () => {
    it('should export users to PDF format', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.exportUsersToPDF();

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      
      // PDF files start with %PDF
      const pdfHeader = result.toString('utf-8', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should limit PDF export to 1000 users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      await service.exportUsersToPDF();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1000,
        }),
      );
    });

    it('should apply filters to PDF export', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUsers[0]]);

      await service.exportUsersToPDF({ role: 'PLAYER' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'PLAYER',
          }),
        }),
      );
    });
  });

  describe('exportAnalyticsToPDF', () => {
    beforeEach(() => {
      // Mock analytics data
      mockPrismaService.user.count.mockResolvedValue(100);
      mockPrismaService.game.count.mockResolvedValue(500);
      mockPrismaService.game.findMany.mockResolvedValue([
        {
          startedAt: new Date('2024-01-15T10:00:00Z'),
          completedAt: new Date('2024-01-15T10:30:00Z'),
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
      ]);
      mockPrismaService.game.groupBy.mockResolvedValue([
        { timeControl: 'BLITZ', _count: { timeControl: 300 } },
      ]);
      mockPrismaService.tournamentPlayer.groupBy.mockResolvedValue(
        Array(50).fill({ userId: 'user-id' }),
      );
    });

    it('should export analytics to PDF format', async () => {
      const result = await service.exportAnalyticsToPDF();

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      
      // PDF files start with %PDF
      const pdfHeader = result.toString('utf-8', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should fetch all required analytics data', async () => {
      await service.exportAnalyticsToPDF();

      expect(mockPrismaService.user.count).toHaveBeenCalled();
      expect(mockPrismaService.game.count).toHaveBeenCalled();
      expect(mockPrismaService.game.findMany).toHaveBeenCalled();
      expect(mockPrismaService.game.groupBy).toHaveBeenCalled();
      expect(mockPrismaService.tournamentPlayer.groupBy).toHaveBeenCalled();
    });
  });
});
