import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { getEnv } from '../config/env.config';

/**
 * Redis service wrapper with connection pooling
 * Provides basic cache operations (get, set, delete) and connection management
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    const env = getEnv();

    // Create Redis client with connection pooling configuration
    this.client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
      lazyConnect: false,
    });

    // Connection event handlers
    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis client error:', error);
    });

    this.client.on('close', () => {
      this.logger.warn('Redis client connection closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.log('Redis client reconnecting');
    });
  }

  /**
   * Get the Redis client instance for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Get a value from Redis cache
   * @param key - Cache key
   * @returns The cached value or null if not found
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value from Redis cache and parse as JSON
   * @param key - Cache key
   * @returns The parsed JSON object or null if not found
   */
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Error getting JSON key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set a value in Redis cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set a value in Redis cache as JSON
   * @param key - Cache key
   * @param value - Object to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async setJson(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await this.set(key, jsonValue, ttl);
    } catch (error) {
      this.logger.error(`Error setting JSON key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a key from Redis cache
   * @param key - Cache key to delete
   * @returns Number of keys deleted (0 or 1)
   */
  async delete(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple keys from Redis cache
   * @param keys - Array of cache keys to delete
   * @returns Number of keys deleted
   */
  async deleteMany(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) return 0;
      return await this.client.del(...keys);
    } catch (error) {
      this.logger.error(`Error deleting keys:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists in Redis cache
   * @param key - Cache key
   * @returns True if key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set expiration time for a key
   * @param key - Cache key
   * @param ttl - Time to live in seconds
   * @returns True if expiration was set, false if key doesn't exist
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get remaining time to live for a key
   * @param key - Cache key
   * @returns TTL in seconds, -1 if key exists but has no expiration, -2 if key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Increment a numeric value in Redis
   * @param key - Cache key
   * @param amount - Amount to increment by (default: 1)
   * @returns The new value after increment
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      this.logger.error(`Error incrementing key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Decrement a numeric value in Redis
   * @param key - Cache key
   * @param amount - Amount to decrement by (default: 1)
   * @returns The new value after decrement
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.client.decrby(key, amount);
    } catch (error) {
      this.logger.error(`Error decrementing key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys matching a pattern
   * @param pattern - Key pattern (e.g., "user:*")
   * @returns Array of matching keys
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error(`Error getting keys with pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern - Key pattern (e.g., "user:*")
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.deleteMany(keys);
    } catch (error) {
      this.logger.error(`Error deleting keys with pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Flush all keys from the current database
   * WARNING: This will delete all data in the current Redis database
   */
  async flushDb(): Promise<void> {
    try {
      await this.client.flushdb();
      this.logger.warn('Redis database flushed');
    } catch (error) {
      this.logger.error('Error flushing database:', error);
      throw error;
    }
  }

  /**
   * Ping Redis to check connection
   * @returns 'PONG' if connection is alive
   */
  async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      this.logger.error('Error pinging Redis:', error);
      throw error;
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    this.logger.log('Closing Redis connection');
    await this.client.quit();
  }
}
