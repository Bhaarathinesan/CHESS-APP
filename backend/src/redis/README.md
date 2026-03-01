# Redis Module

This module provides Redis caching and session storage capabilities for the ChessArena backend.

## Overview

The Redis module is a global module that provides a `RedisService` for interacting with Redis. It includes connection pooling, automatic reconnection, and comprehensive error handling.

## Features

- **Connection Pooling**: Configured with retry strategy and connection management
- **Basic Cache Operations**: get, set, delete with TTL support
- **JSON Support**: Automatic JSON serialization/deserialization
- **Advanced Operations**: increment, decrement, expire, TTL, pattern matching
- **Error Handling**: Comprehensive error logging and handling
- **Lifecycle Management**: Proper cleanup on module destroy

## Configuration

Redis connection is configured via environment variables:

```env
REDIS_URL=redis://localhost:6379
```

The service automatically connects on module initialization and handles reconnection on failures.

## Usage

### Basic Operations

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from './redis/redis.service';

@Injectable()
export class MyService {
  constructor(private readonly redis: RedisService) {}

  async cacheUserData(userId: string, data: any) {
    // Cache for 1 hour (3600 seconds)
    await this.redis.setJson(`user:${userId}`, data, 3600);
  }

  async getUserData(userId: string) {
    return await this.redis.getJson(`user:${userId}`);
  }

  async invalidateUserCache(userId: string) {
    await this.redis.delete(`user:${userId}`);
  }
}
```

### Session Management

```typescript
async createSession(sessionId: string, userId: string) {
  const sessionData = {
    userId,
    createdAt: new Date().toISOString(),
  };
  
  // Session expires in 24 hours
  await this.redis.setJson(`session:${sessionId}`, sessionData, 86400);
}

async getSession(sessionId: string) {
  return await this.redis.getJson(`session:${sessionId}`);
}

async deleteSession(sessionId: string) {
  await this.redis.delete(`session:${sessionId}`);
}
```

### Rate Limiting

```typescript
async checkRateLimit(userId: string, limit: number = 100): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const current = await this.redis.increment(key);
  
  if (current === 1) {
    // First request, set expiration to 1 minute
    await this.redis.expire(key, 60);
  }
  
  return current <= limit;
}
```

### Matchmaking Queue

```typescript
async addToQueue(userId: string, rating: number, timeControl: string) {
  const queueData = {
    userId,
    rating,
    joinedAt: Date.now(),
  };
  
  await this.redis.setJson(
    `queue:${timeControl}:${userId}`,
    queueData,
    300 // 5 minutes
  );
}

async getQueuePlayers(timeControl: string) {
  const keys = await this.redis.keys(`queue:${timeControl}:*`);
  const players = [];
  
  for (const key of keys) {
    const player = await this.redis.getJson(key);
    if (player) players.push(player);
  }
  
  return players;
}
```

### Game State Caching

```typescript
async cacheGameState(gameId: string, state: any) {
  // Cache game state for 2 hours
  await this.redis.setJson(`game:${gameId}:state`, state, 7200);
}

async getGameState(gameId: string) {
  return await this.redis.getJson(`game:${gameId}:state`);
}

async invalidateGameState(gameId: string) {
  await this.redis.delete(`game:${gameId}:state`);
}
```

## API Reference

### Basic Operations

- `get(key: string): Promise<string | null>` - Get a string value
- `getJson<T>(key: string): Promise<T | null>` - Get and parse JSON value
- `set(key: string, value: string, ttl?: number): Promise<void>` - Set a string value
- `setJson(key: string, value: any, ttl?: number): Promise<void>` - Set a JSON value
- `delete(key: string): Promise<number>` - Delete a key
- `deleteMany(keys: string[]): Promise<number>` - Delete multiple keys

### Key Management

- `exists(key: string): Promise<boolean>` - Check if key exists
- `expire(key: string, ttl: number): Promise<boolean>` - Set expiration
- `ttl(key: string): Promise<number>` - Get remaining TTL
- `keys(pattern: string): Promise<string[]>` - Find keys by pattern

### Numeric Operations

- `increment(key: string, amount?: number): Promise<number>` - Increment value
- `decrement(key: string, amount?: number): Promise<number>` - Decrement value

### Utility

- `ping(): Promise<string>` - Check connection (returns 'PONG')
- `flushDb(): Promise<void>` - Clear all keys (use with caution!)
- `getClient(): Redis` - Get raw Redis client for advanced operations

## Connection Management

The service automatically handles:

- Initial connection on module initialization
- Reconnection on connection loss (with exponential backoff)
- Connection health monitoring
- Graceful shutdown on module destroy

## Error Handling

All operations include error handling and logging. Errors are logged with context and re-thrown for the caller to handle.

## Testing

Run the test suite:

```bash
npm test -- redis.service.spec.ts
```

The tests cover all basic operations and require a running Redis instance.

## Performance Considerations

- **Connection Pooling**: ioredis manages connection pooling internally
- **TTL**: Always set appropriate TTL values to prevent memory bloat
- **Pattern Matching**: Use `keys()` sparingly in production (use SCAN for large datasets)
- **JSON Operations**: Automatic serialization adds overhead; use for complex objects only

## Best Practices

1. **Use Namespaces**: Prefix keys with namespace (e.g., `user:`, `session:`, `game:`)
2. **Set TTL**: Always set expiration for temporary data
3. **Handle Null**: Always check for null returns from get operations
4. **Batch Operations**: Use `deleteMany()` for multiple deletions
5. **Error Handling**: Wrap Redis operations in try-catch blocks
6. **Key Patterns**: Use consistent key naming patterns for easier management

## Future Enhancements

- Redis Pub/Sub for real-time events
- Redis Streams for event sourcing
- Redis Sorted Sets for leaderboards
- Redis Lists for queues
- Redis Sets for unique collections
- Lua scripting for atomic operations
