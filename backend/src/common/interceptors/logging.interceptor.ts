import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggingService } from '../../admin/logging.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const userId = request.user?.id;

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Only log errors and warnings for HTTP requests
        if (statusCode >= 400) {
          this.loggingService
            .logHttpRequest(
              method,
              url,
              statusCode,
              responseTime,
              userId,
              ip,
              userAgent,
            )
            .catch((err) => {
              this.logger.error(`Failed to log HTTP request: ${err.message}`);
            });
        }
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log the error
        this.loggingService
          .logHttpRequest(
            method,
            url,
            statusCode,
            responseTime,
            userId,
            ip,
            userAgent,
          )
          .catch((err) => {
            this.logger.error(`Failed to log HTTP error: ${err.message}`);
          });

        // Log detailed error information
        this.loggingService
          .logError(
            `HTTP ${method} ${url} failed with status ${statusCode}`,
            error,
            'HTTP',
            {
              method,
              url,
              statusCode,
              userId,
              ip,
            },
          )
          .catch((err) => {
            this.logger.error(`Failed to log error details: ${err.message}`);
          });

        return throwError(() => error);
      }),
    );
  }
}
