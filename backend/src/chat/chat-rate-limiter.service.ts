import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * ChatRateLimiterService
 * Implements rate limiting for chat messages
 * Requirement 19.10: Rate limit to 5 messages per minute per player
 */
@Injectable()
export class ChatRateLimiterService {
  private readonly MAX_MESSAGES_PER_MINUTE = 5;
  private readonly WINDOW_SIZE_MS = 60 * 1000; // 1 minute

  // Fallback in-memory store if Redis is unavailable
  private readonly memoryStore = new Map<
    string,
    { timestamps: number[]; lastCleanup: number }
  >();

  constructor(private readonly redis: RedisService) {}

  /**
   * Check if a user can send a message (rate limit check)
   * @param userId - The user ID
   * @param gameId - The game ID
   * @returns true if user can send message, false if rate limited
   */
  async canSendMessage(userId: string, gameId: string): Promise<boolean> {
    const key = this.getRateLimitKey(userId, gameId);
    const now = Date.now();

    try {
      // Try Redis first
      const client = this.redis.getClient();
      if (client) {
        return await this.checkRateLimitRedis(key, now);
      }
    } catch (error) {
      // Fall back to memory store
      console.warn('Redis unavailable, using memory store for rate limiting');
    }

    // Use memory store as fallback
    return this.checkRateLimitMemory(key, now);
  }

  /**
   * Get remaining messages count for a user
   * @param userId - The user ID
   * @param gameId - The game ID
   * @returns Number of messages remaining in current window
   */
  async getRemainingMessages(
    userId: string,
    gameId: string,
  ): Promise<number> {
    const key = this.getRateLimitKey(userId, gameId);
    const now = Date.now();

    try {
      const client = this.redis.getClient();
      if (client) {
        const count = await this.getMessageCountRedis(key, now);
        return Math.max(0, this.MAX_MESSAGES_PER_MINUTE - count);
      }
    } catch (error) {
      // Fall back to memory store
    }

    const count = this.getMessageCountMemory(key, now);
    return Math.max(0, this.MAX_MESSAGES_PER_MINUTE - count);
  }

  /**
   * Get time until rate limit resets
   * @param userId - The user ID
   * @param gameId - The game ID
   * @returns Milliseconds until reset, or 0 if not rate limited
   */
  async getResetTime(userId: string, gameId: string): Promise<number> {
    const key = this.getRateLimitKey(userId, gameId);
    const now = Date.now();

    try {
      const client = this.redis.getClient();
      if (client) {
        return await this.getResetTimeRedis(key, now);
      }
    } catch (error) {
      // Fall back to memory store
    }

    return this.getResetTimeMemory(key, now);
  }

  /**
   * Check rate limit using Redis
   */
  private async checkRateLimitRedis(
    key: string,
    now: number,
  ): Promise<boolean> {
    const client = this.redis.getClient();
    const windowStart = now - this.WINDOW_SIZE_MS;

    // Remove old timestamps
    await client.zremrangebyscore(key, 0, windowStart);

    // Count messages in current window
    const count = await client.zcard(key);

    if (count >= this.MAX_MESSAGES_PER_MINUTE) {
      return false;
    }

    // Add current timestamp
    await client.zadd(key, now, `${now}`);

    // Set expiration
    await client.expire(key, 60);

    return true;
  }

  /**
   * Check rate limit using memory store
   */
  private checkRateLimitMemory(key: string, now: number): boolean {
    const windowStart = now - this.WINDOW_SIZE_MS;

    // Get or create entry
    let entry = this.memoryStore.get(key);
    if (!entry) {
      entry = { timestamps: [], lastCleanup: now };
      this.memoryStore.set(key, entry);
    }

    // Remove old timestamps
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= this.MAX_MESSAGES_PER_MINUTE) {
      return false;
    }

    // Add current timestamp
    entry.timestamps.push(now);
    entry.lastCleanup = now;

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanupMemoryStore(now);
    }

    return true;
  }

  /**
   * Get message count from Redis
   */
  private async getMessageCountRedis(key: string, now: number): Promise<number> {
    const client = this.redis.getClient();
    const windowStart = now - this.WINDOW_SIZE_MS;

    await client.zremrangebyscore(key, 0, windowStart);
    return await client.zcard(key);
  }

  /**
   * Get message count from memory store
   */
  private getMessageCountMemory(key: string, now: number): number {
    const entry = this.memoryStore.get(key);
    if (!entry) {
      return 0;
    }

    const windowStart = now - this.WINDOW_SIZE_MS;
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    return entry.timestamps.length;
  }

  /**
   * Get reset time from Redis
   */
  private async getResetTimeRedis(key: string, now: number): Promise<number> {
    const client = this.redis.getClient();
    const windowStart = now - this.WINDOW_SIZE_MS;

    // Get oldest timestamp in window
    const oldest = await client.zrange(key, 0, 0, 'WITHSCORES');
    if (oldest.length === 0) {
      return 0;
    }

    const oldestTimestamp = parseInt(oldest[1]);
    if (oldestTimestamp <= windowStart) {
      return 0;
    }

    return oldestTimestamp + this.WINDOW_SIZE_MS - now;
  }

  /**
   * Get reset time from memory store
   */
  private getResetTimeMemory(key: string, now: number): number {
    const entry = this.memoryStore.get(key);
    if (!entry || entry.timestamps.length === 0) {
      return 0;
    }

    const windowStart = now - this.WINDOW_SIZE_MS;
    const validTimestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (validTimestamps.length === 0) {
      return 0;
    }

    const oldestTimestamp = Math.min(...validTimestamps);
    return oldestTimestamp + this.WINDOW_SIZE_MS - now;
  }

  /**
   * Generate rate limit key
   */
  private getRateLimitKey(userId: string, gameId: string): string {
    return `chat:ratelimit:${gameId}:${userId}`;
  }

  /**
   * Cleanup old entries from memory store
   */
  private cleanupMemoryStore(now: number): void {
    const cutoff = now - this.WINDOW_SIZE_MS * 2;

    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.lastCleanup < cutoff) {
        this.memoryStore.delete(key);
      }
    }
  }
}
