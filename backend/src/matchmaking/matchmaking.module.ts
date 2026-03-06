import { Module, forwardRef } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingGateway } from '../gateways/matchmaking.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { GamesModule } from '../games/games.module';
import { BlocksModule } from '../blocks/blocks.module';
import { AdminModule } from '../admin/admin.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => GamesModule),
    BlocksModule,
    AdminModule,
    JwtModule,
    ConfigModule,
  ],
  controllers: [MatchmakingController],
  providers: [
    MatchmakingService,
    MatchmakingGateway,
    {
      provide: 'MATCHMAKING_GATEWAY_SETUP',
      useFactory: (
        service: MatchmakingService,
        gateway: MatchmakingGateway,
      ) => {
        service.setGateway(gateway);
        return true;
      },
      inject: [MatchmakingService, MatchmakingGateway],
    },
  ],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
