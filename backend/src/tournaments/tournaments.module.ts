import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { TournamentStateMachineService } from './tournament-state-machine.service';
import { PairingService } from './pairing.service';
import { StandingsService } from './standings.service';
import { TournamentExportService } from './tournament-export.service';
import { TournamentAwardsService } from './tournament-awards.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [PrismaModule, AdminModule],
  controllers: [TournamentsController],
  providers: [
    TournamentsService,
    TournamentStateMachineService,
    PairingService,
    StandingsService,
    TournamentExportService,
    TournamentAwardsService,
  ],
  exports: [
    TournamentsService,
    PairingService,
    StandingsService,
    TournamentExportService,
    TournamentAwardsService,
  ],
})
export class TournamentsModule {}
