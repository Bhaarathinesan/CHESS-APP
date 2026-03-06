import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ProfanityFilterService } from './profanity-filter.service';
import { ChatRateLimiterService } from './chat-rate-limiter.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [PrismaModule, RedisModule, BlocksModule],
  controllers: [ChatController],
  providers: [ChatService, ProfanityFilterService, ChatRateLimiterService],
  exports: [ChatService, ProfanityFilterService, ChatRateLimiterService],
})
export class ChatModule {}
