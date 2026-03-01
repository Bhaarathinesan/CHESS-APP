import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChessModule } from '../chess/chess.module';
import { RatingsModule } from '../ratings/ratings.module';

@Module({
  imports: [PrismaModule, ChessModule, RatingsModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
