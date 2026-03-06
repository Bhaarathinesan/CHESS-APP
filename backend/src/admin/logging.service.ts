import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogLevel } from '@prisma/client';
import { CreateLogDto } from './dto/create-log.dto';
import { LogQueryDto } from './dto/log-query.dto';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a log entry in the database
   */
  async createLog(dto: CreateLogDto): Promise<void> {
    try {
      await this.prisma.systemLog.create({
        data: {
          level: dto.level,
          message: dto.message,
          context: dto.context,
          metadata: dto.metadata || {},
          stackTrace: dto.stackTrace,
          userId: dto.userId,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          method: dto.method,
          url: dto.url,
          statusCode: dto.statusCode,
          responseTime: dto.responseTime,
        },
      });
    } catch (error) {
      // Don't throw errors from logging to prevent cascading failures
      this.logger.error(`Failed to create log entry: ${error.message}`);
    }
  }

  /**
   * Log an error with full context
   */
  async logError(
    message: string,
    error: Error,
    context?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.createLog({
      level: LogLevel.ERROR,
      message,
      context,
      metadata: {
        ...metadata,
        errorName: error.name,
        errorMessage: error.message,
      },
      stackTrace: error.stack,
    });
  }

  /**
   * Log a warning
   */
  async logWarning(
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.createLog({
      level: LogLevel.WARN,
      message,
      context,
      metadata,
    });
  }

  /**
   * Log an info message
   */
  async logInfo(
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.createLog({
      level: LogLevel.INFO,
      message,
      context,
      metadata,
    });
  }

  /**
   * Log a debug message
   */
  async logDebug(
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.createLog({
      level: LogLevel.DEBUG,
      message,
      context,
      metadata,
    });
  }

  /**
   * Log an HTTP request
   */
  async logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const level =
      statusCode >= 500
        ? LogLevel.ERROR
        : statusCode >= 400
          ? LogLevel.WARN
          : LogLevel.INFO;

    await this.createLog({
      level,
      message: `${method} ${url} ${statusCode}`,
      context: 'HTTP',
      method,
      url,
      statusCode,
      responseTime,
      userId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Query logs with filtering and pagination
   */
  async getLogs(query: LogQueryDto) {
    const {
      level,
      context,
      search,
      startDate,
      endDate,
      userId,
      page = 1,
      limit = 50,
    } = query;

    const where: any = {};

    if (level) {
      where.level = level;
    }

    if (context) {
      where.context = context;
    }

    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { context: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (userId) {
      where.userId = userId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          level: true,
          message: true,
          context: true,
          metadata: true,
          stackTrace: true,
          userId: true,
          ipAddress: true,
          method: true,
          url: true,
          statusCode: true,
          responseTime: true,
          createdAt: true,
        },
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get log statistics
   */
  async getLogStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [errorCount, warnCount, infoCount, debugCount, totalCount] =
      await Promise.all([
        this.prisma.systemLog.count({
          where: { ...where, level: LogLevel.ERROR },
        }),
        this.prisma.systemLog.count({
          where: { ...where, level: LogLevel.WARN },
        }),
        this.prisma.systemLog.count({
          where: { ...where, level: LogLevel.INFO },
        }),
        this.prisma.systemLog.count({
          where: { ...where, level: LogLevel.DEBUG },
        }),
        this.prisma.systemLog.count({ where }),
      ]);

    return {
      errorCount,
      warnCount,
      infoCount,
      debugCount,
      totalCount,
    };
  }

  /**
   * Get recent errors
   */
  async getRecentErrors(limit: number = 10) {
    return this.prisma.systemLog.findMany({
      where: { level: LogLevel.ERROR },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        message: true,
        context: true,
        metadata: true,
        stackTrace: true,
        createdAt: true,
      },
    });
  }

  /**
   * Clean up old logs (retention policy)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.systemLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} log entries older than ${daysToKeep} days`,
    );

    return result.count;
  }
}
