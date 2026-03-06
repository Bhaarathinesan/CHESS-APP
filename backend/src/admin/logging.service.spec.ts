import { Test, TestingModule } from '@nestjs/testing';
import { LoggingService } from './logging.service';
import { PrismaService } from '../prisma/prisma.service';
import { LogLevel } from '@prisma/client';

describe('LoggingService', () => {
  let service: LoggingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    systemLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LoggingService>(LoggingService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLog', () => {
    it('should create a log entry', async () => {
      const logDto = {
        level: LogLevel.INFO,
        message: 'Test log message',
        context: 'TEST',
      };

      mockPrismaService.systemLog.create.mockResolvedValue({
        id: '123',
        ...logDto,
        createdAt: new Date(),
      });

      await service.createLog(logDto);

      expect(mockPrismaService.systemLog.create).toHaveBeenCalledWith({
        data: {
          level: logDto.level,
          message: logDto.message,
          context: logDto.context,
          metadata: {},
          stackTrace: undefined,
          userId: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          method: undefined,
          url: undefined,
          statusCode: undefined,
          responseTime: undefined,
        },
      });
    });

    it('should not throw error if log creation fails', async () => {
      mockPrismaService.systemLog.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createLog({
          level: LogLevel.ERROR,
          message: 'Test',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('logError', () => {
    it('should log an error with stack trace', async () => {
      const error = new Error('Test error');
      const message = 'An error occurred';
      const context = 'TEST';
      const metadata = { userId: '123' };

      mockPrismaService.systemLog.create.mockResolvedValue({});

      await service.logError(message, error, context, metadata);

      expect(mockPrismaService.systemLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          level: LogLevel.ERROR,
          message,
          context,
          metadata: expect.objectContaining({
            ...metadata,
            errorName: 'Error',
            errorMessage: 'Test error',
          }),
          stackTrace: error.stack,
        }),
      });
    });
  });

  describe('logWarning', () => {
    it('should log a warning', async () => {
      const message = 'Warning message';
      const context = 'TEST';

      mockPrismaService.systemLog.create.mockResolvedValue({});

      await service.logWarning(message, context);

      expect(mockPrismaService.systemLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          level: LogLevel.WARN,
          message,
          context,
        }),
      });
    });
  });

  describe('logInfo', () => {
    it('should log an info message', async () => {
      const message = 'Info message';
      const context = 'TEST';

      mockPrismaService.systemLog.create.mockResolvedValue({});

      await service.logInfo(message, context);

      expect(mockPrismaService.systemLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          level: LogLevel.INFO,
          message,
          context,
        }),
      });
    });
  });

  describe('logDebug', () => {
    it('should log a debug message', async () => {
      const message = 'Debug message';
      const context = 'TEST';

      mockPrismaService.systemLog.create.mockResolvedValue({});

      await service.logDebug(message, context);

      expect(mockPrismaService.systemLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          level: LogLevel.DEBUG,
          message,
          context,
        }),
      });
    });
  });

  describe('logHttpRequest', () => {
    it('should log HTTP request with ERROR level for 5xx status', async () => {
      mockPrismaService.systemLog.create.mockResolvedValue({});

      await service.logHttpRequest('GET', '/api/test', 500, 100);

      expect(mockPrismaService.systemLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          level: LogLevel.ERROR,
          message: 'GET /api/test 500',
          context: 'HTTP',
          method: 'GET',
          url: '/api/test',
          statusCode: 500,
          responseTime: 100,
        }),
      });
    });

    it('should log HTTP request with WARN level for 4xx status', async () => {
      mockPrismaService.systemLog.create.mockResolvedValue({});

      await service.logHttpRequest('POST', '/api/test', 404, 50);

      expect(mockPrismaService.systemLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          level: LogLevel.WARN,
          message: 'POST /api/test 404',
          statusCode: 404,
        }),
      });
    });

    it('should log HTTP request with INFO level for 2xx status', async () => {
      mockPrismaService.systemLog.create.mockResolvedValue({});

      await service.logHttpRequest('GET', '/api/test', 200, 25);

      expect(mockPrismaService.systemLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          level: LogLevel.INFO,
          message: 'GET /api/test 200',
          statusCode: 200,
        }),
      });
    });

    it('should include user and IP information when provided', async () => {
      mockPrismaService.systemLog.create.mockResolvedValue({});

      await service.logHttpRequest(
        'GET',
        '/api/test',
        200,
        25,
        'user-123',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(mockPrismaService.systemLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      });
    });
  });

  describe('getLogs', () => {
    it('should return paginated logs', async () => {
      const mockLogs = [
        {
          id: '1',
          level: LogLevel.ERROR,
          message: 'Error 1',
          createdAt: new Date(),
        },
        {
          id: '2',
          level: LogLevel.WARN,
          message: 'Warning 1',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.systemLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.systemLog.count.mockResolvedValue(2);

      const result = await service.getLogs({ page: 1, limit: 50 });

      expect(result).toEqual({
        logs: mockLogs,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should filter logs by level', async () => {
      mockPrismaService.systemLog.findMany.mockResolvedValue([]);
      mockPrismaService.systemLog.count.mockResolvedValue(0);

      await service.getLogs({ level: LogLevel.ERROR, page: 1, limit: 50 });

      expect(mockPrismaService.systemLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            level: LogLevel.ERROR,
          }),
        }),
      );
    });

    it('should filter logs by context', async () => {
      mockPrismaService.systemLog.findMany.mockResolvedValue([]);
      mockPrismaService.systemLog.count.mockResolvedValue(0);

      await service.getLogs({ context: 'HTTP', page: 1, limit: 50 });

      expect(mockPrismaService.systemLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            context: 'HTTP',
          }),
        }),
      );
    });

    it('should filter logs by search term', async () => {
      mockPrismaService.systemLog.findMany.mockResolvedValue([]);
      mockPrismaService.systemLog.count.mockResolvedValue(0);

      await service.getLogs({ search: 'error', page: 1, limit: 50 });

      expect(mockPrismaService.systemLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { message: { contains: 'error', mode: 'insensitive' } },
              { context: { contains: 'error', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should filter logs by date range', async () => {
      mockPrismaService.systemLog.findMany.mockResolvedValue([]);
      mockPrismaService.systemLog.count.mockResolvedValue(0);

      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-31T23:59:59Z';

      await service.getLogs({
        startDate,
        endDate,
        page: 1,
        limit: 50,
      });

      expect(mockPrismaService.systemLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        }),
      );
    });
  });

  describe('getLogStatistics', () => {
    it('should return log statistics', async () => {
      mockPrismaService.systemLog.count
        .mockResolvedValueOnce(10) // ERROR
        .mockResolvedValueOnce(5) // WARN
        .mockResolvedValueOnce(20) // INFO
        .mockResolvedValueOnce(15) // DEBUG
        .mockResolvedValueOnce(50); // TOTAL

      const result = await service.getLogStatistics();

      expect(result).toEqual({
        errorCount: 10,
        warnCount: 5,
        infoCount: 20,
        debugCount: 15,
        totalCount: 50,
      });
    });

    it('should filter statistics by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrismaService.systemLog.count.mockResolvedValue(0);

      await service.getLogStatistics(startDate, endDate);

      expect(mockPrismaService.systemLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });
  });

  describe('getRecentErrors', () => {
    it('should return recent error logs', async () => {
      const mockErrors = [
        {
          id: '1',
          message: 'Error 1',
          context: 'TEST',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.systemLog.findMany.mockResolvedValue(mockErrors);

      const result = await service.getRecentErrors(10);

      expect(result).toEqual(mockErrors);
      expect(mockPrismaService.systemLog.findMany).toHaveBeenCalledWith({
        where: { level: LogLevel.ERROR },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: expect.any(Object),
      });
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than specified days', async () => {
      mockPrismaService.systemLog.deleteMany.mockResolvedValue({ count: 100 });

      const result = await service.cleanupOldLogs(90);

      expect(result).toBe(100);
      expect(mockPrismaService.systemLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should use default retention of 90 days', async () => {
      mockPrismaService.systemLog.deleteMany.mockResolvedValue({ count: 50 });

      await service.cleanupOldLogs();

      expect(mockPrismaService.systemLog.deleteMany).toHaveBeenCalled();
    });
  });
});
