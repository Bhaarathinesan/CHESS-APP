import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Redis module providing caching and session storage capabilities
 * Marked as @Global to make RedisService available throughout the application
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
