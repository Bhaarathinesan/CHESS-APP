import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserRole } from '@prisma/client';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  const mockAdminService = {
    getDashboardMetrics: jest.fn(),
  };

  const mockDashboardData = {
    userMetrics: {
      totalUsers: 1000,
      dailyActiveUsers: 150,
      weeklyActiveUsers: 400,
      monthlyActiveUsers: 700,
      newRegistrations: 50,
    },
    gameMetrics: {
      totalGames: 5000,
      averageDuration: 900,
      popularTimeControls: [
        { timeControl: 'BLITZ', count: 2500, percentage: 50 },
        { timeControl: 'RAPID', count: 1500, percentage: 30 },
      ],
    },
    usageMetrics: {
      peakUsageHours: [
        { hour: 19, count: 150 },
        { hour: 20, count: 140 },
      ],
      tournamentParticipationRate: 30,
    },
    serverMetrics: {
      uptime: 86400,
      memoryUsage: {
        used: 512,
        total: 1024,
        percentage: 50,
      },
      cpuUsage: 25,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return dashboard metrics', async () => {
      mockAdminService.getDashboardMetrics.mockResolvedValue(mockDashboardData);

      const result = await controller.getDashboard();

      expect(result).toEqual(mockDashboardData);
      expect(service.getDashboardMetrics).toHaveBeenCalledTimes(1);
    });

    it('should have correct route metadata', () => {
      const metadata = Reflect.getMetadata('path', AdminController);
      expect(metadata).toBe('admin');
    });

    it('should require SUPER_ADMIN role', () => {
      const roles = Reflect.getMetadata('roles', controller.getDashboard);
      expect(roles).toContain(UserRole.SUPER_ADMIN);
    });
  });
});
