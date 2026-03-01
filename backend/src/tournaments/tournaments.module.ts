import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { TournamentStateMachineService } from './tournament-state-machine.service';
import { PairingService } from './pairing.service';
import { StandingsService } from './standings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TournamentsController],
  providers: [
    TournamentsService,
    TournamentStateMachineService,
    PairingService,
    StandingsService,
  ],
  exports: [TournamentsService, PairingService, StandingsService],
})
export class TournamentsModule {}
