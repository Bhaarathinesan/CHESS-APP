import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { MatchmakingGateway } from './matchmaking.gateway';
import { TournamentGateway } from './tournament.gateway';
import { NotificationsGateway } from './notifications.gateway';
import { ChatGateway } from './chat.gateway';
import { LatencyTrackerService } from './services/latency-tracker.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { ChessModule } from '../chess/chess.module';
import { ChatModule } from '../chat/chat.module';
import { TournamentsModule } from '../tournaments/tournaments.module';

@Module({
  imports: [AuthModule, PrismaModule, RedisModule, ConfigModule, ChessModule, ChatModule, TournamentsModule],
  providers: [
    GameGateway,
    MatchmakingGateway,
    TournamentGateway,
    NotificationsGateway,
    ChatGateway,
    LatencyTrackerService,
  ],
  exports: [
    GameGateway,
    MatchmakingGateway,
    TournamentGateway,
    NotificationsGateway,
    ChatGateway,
    LatencyTrackerService,
  ],
})
export class GatewaysModule {}
