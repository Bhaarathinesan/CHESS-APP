# System Logging and Monitoring

## Overview

The logging system provides comprehensive error tracking, system monitoring, and audit capabilities for the ChessArena platform. It captures application logs, HTTP requests, errors, and system events in a structured format for easy querying and analysis.

## Requirements

- **25.15**: Admin panel shall allow super_admin to view system logs and error reports
- **25.18**: Admin panel shall require super_admin authentication for all administrative functions

## Architecture

### Components

1. **SystemLog Model** (Prisma Schema)
   - Stores all log entries in the database
   - Supports multiple log levels (ERROR, WARN, INFO, DEBUG)
   - Captures HTTP request details, user context, and metadata

2. **LoggingService** (`logging.service.ts`)
   - Core service for creating and querying logs
   - Provides convenience methods for different log levels
   - Handles log filtering, pagination, and statistics

3. **LoggingInterceptor** (`common/interceptors/logging.interceptor.ts`)
   - Automatically captures HTTP errors (4xx, 5xx)
   - Records request details (method, URL, status, response time)
   - Extracts user and IP information from requests

4. **Admin Endpoints** (`admin.controller.ts`)
   - `GET /api/admin/logs` - Query logs with filtering
   - `GET /api/admin/logs/statistics` - Get log statistics
   - `GET /api/admin/logs/recent-errors` - Get recent errors

5. **Admin UI** (`frontend/app/(dashboard)/admin/logs/page.tsx`)
   - Visual interface for browsing logs
   - Filtering by level, context, date range, search
   - Detailed log view with stack traces and metadata

## Database Schema

```prisma
model SystemLog {
  id          String    @id @default(uuid())
  level       LogLevel
  message     String
  context     String?
  metadata    Json?
  stackTrace  String?
  userId      String?
  ipAddress   String?
  userAgent   String?
  method      String?
  url         String?
  statusCode  Int?
  responseTime Int?
  createdAt   DateTime  @default(now())
}

enum LogLevel {
  ERROR
  WARN
  INFO
  DEBUG
}
```

## Usage

### Creating Logs Programmatically

```typescript
import { LoggingService } from './admin/logging.service';

// Inject the service
constructor(private loggingService: LoggingService) {}

// Log an error
await this.loggingService.logError(
  'Failed to process payment',
  error,
  'PAYMENT',
  { orderId: '123', amount: 99.99 }
);

// Log a warning
await this.loggingService.logWarning(
  'Rate limit approaching',
  'RATE_LIMIT',
  { userId: 'user-123', requestCount: 95 }
);

// Log info
await this.loggingService.logInfo(
  'User registered successfully',
  'AUTH',
  { userId: 'user-123', email: 'user@example.com' }
);

// Log debug
await this.loggingService.logDebug(
  'Cache hit',
  'CACHE',
  { key: 'user:123', ttl: 3600 }
);
```

### Automatic HTTP Logging

The `LoggingInterceptor` automatically logs HTTP errors:

```typescript
// In app.module.ts or main.ts
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

app.useGlobalInterceptors(new LoggingInterceptor(loggingService));
```

This will automatically log:
- All 4xx errors (WARN level)
- All 5xx errors (ERROR level)
- Request details (method, URL, status code, response time)
- User context (if authenticated)
- IP address and user agent

### Querying Logs

```typescript
// Get logs with filters
const result = await loggingService.getLogs({
  level: LogLevel.ERROR,
  context: 'HTTP',
  search: 'timeout',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-31T23:59:59Z',
  page: 1,
  limit: 50,
});

// Get statistics
const stats = await loggingService.getLogStatistics(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Get recent errors
const errors = await loggingService.getRecentErrors(10);
```

### Admin API Endpoints

#### GET /api/admin/logs

Query logs with filtering and pagination.

**Query Parameters:**
- `level` - Filter by log level (ERROR, WARN, INFO, DEBUG)
- `context` - Filter by context (e.g., HTTP, AUTH, PAYMENT)
- `search` - Search in message and context
- `startDate` - Filter logs after this date (ISO 8601)
- `endDate` - Filter logs before this date (ISO 8601)
- `userId` - Filter logs for specific user
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50)

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "level": "ERROR",
      "message": "Database connection failed",
      "context": "DATABASE",
      "metadata": { "host": "localhost", "port": 5432 },
      "stackTrace": "Error: Connection timeout...",
      "userId": "user-123",
      "ipAddress": "192.168.1.1",
      "method": "POST",
      "url": "/api/games",
      "statusCode": 500,
      "responseTime": 5000,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

#### GET /api/admin/logs/statistics

Get log statistics for a date range.

**Query Parameters:**
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)

**Response:**
```json
{
  "errorCount": 45,
  "warnCount": 120,
  "infoCount": 5000,
  "debugCount": 15000,
  "totalCount": 20165
}
```

#### GET /api/admin/logs/recent-errors

Get the most recent error logs.

**Query Parameters:**
- `limit` - Number of errors to return (default: 10)

**Response:**
```json
[
  {
    "id": "uuid",
    "message": "Payment processing failed",
    "context": "PAYMENT",
    "metadata": { "orderId": "123" },
    "stackTrace": "Error: Timeout...",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

## Log Levels

### ERROR
- Application errors and exceptions
- Failed operations
- HTTP 5xx errors
- Database errors
- External service failures

### WARN
- Potential issues
- HTTP 4xx errors
- Rate limit warnings
- Deprecated API usage
- Configuration issues

### INFO
- Successful operations
- User actions (login, registration)
- HTTP 2xx/3xx requests
- System events

### DEBUG
- Detailed diagnostic information
- Cache operations
- Query execution details
- Performance metrics

## Log Retention

Logs are retained for 90 days by default. A cleanup job can be scheduled to remove old logs:

```typescript
// Run cleanup (e.g., in a cron job)
const deletedCount = await loggingService.cleanupOldLogs(90);
console.log(`Deleted ${deletedCount} old log entries`);
```

## Best Practices

1. **Use Appropriate Log Levels**
   - ERROR: Only for actual errors that need attention
   - WARN: For potential issues or degraded functionality
   - INFO: For normal operations and user actions
   - DEBUG: For detailed diagnostic information

2. **Include Context**
   - Always provide a context string (e.g., 'AUTH', 'PAYMENT', 'GAME')
   - This makes filtering and searching much easier

3. **Add Metadata**
   - Include relevant data in the metadata object
   - Don't include sensitive information (passwords, tokens)
   - Keep metadata concise and relevant

4. **Don't Log Sensitive Data**
   - Never log passwords, API keys, or tokens
   - Mask or redact sensitive user information
   - Be careful with PII (personally identifiable information)

5. **Performance Considerations**
   - Logging is asynchronous and won't block operations
   - Failed log writes won't crash the application
   - Consider log volume in high-traffic scenarios

## Monitoring and Alerts

The logging system can be integrated with monitoring tools:

1. **Error Rate Monitoring**
   - Track error count over time
   - Alert when error rate exceeds threshold

2. **Performance Monitoring**
   - Track response times from HTTP logs
   - Identify slow endpoints

3. **User Activity Monitoring**
   - Track user actions via userId field
   - Identify suspicious patterns

4. **System Health**
   - Monitor log statistics
   - Track error trends

## Security

- All admin endpoints require `super_admin` role
- JWT authentication required for all log access
- Logs may contain sensitive information - restrict access
- Consider encrypting logs at rest for compliance
- Implement log retention policies per regulations

## Testing

The logging system includes comprehensive unit tests:

```bash
npm test -- logging.service.spec.ts
```

Tests cover:
- Log creation for all levels
- HTTP request logging
- Filtering and pagination
- Statistics calculation
- Error handling
- Log cleanup

## Future Enhancements

1. **Real-time Log Streaming**
   - WebSocket-based log streaming for admins
   - Live error notifications

2. **Log Aggregation**
   - Integration with ELK Stack or similar
   - Centralized logging for multiple instances

3. **Advanced Analytics**
   - Error pattern detection
   - Anomaly detection
   - Predictive alerts

4. **Log Export**
   - Export logs to CSV/JSON
   - Integration with external tools

5. **Structured Logging**
   - More structured metadata schemas
   - Standardized log formats

## Troubleshooting

### Logs Not Appearing

1. Check database connection
2. Verify Prisma client is generated
3. Check LoggingService is properly injected
4. Verify LoggingInterceptor is registered globally

### Performance Issues

1. Add database indexes on frequently queried fields
2. Implement log archiving for old logs
3. Consider async log writing with queues
4. Reduce DEBUG log volume in production

### Missing HTTP Logs

1. Verify LoggingInterceptor is registered
2. Check that it's applied globally or to specific routes
3. Ensure authentication middleware runs before interceptor
