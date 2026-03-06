import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AnnouncementsController } from './announcements.controller';
import { AdminService } from './admin.service';
import { AnnouncementService } from './announcement.service';
import { LoggingService } from './logging.service';
import { ExportService } from './export.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BanService } from './ban.service';
import { RatingRollbackService } from './rating-rollback.service';

@Module({
  imports: [PrismaModule, AntiCheatModule, NotificationsModule],
  controllers: [AdminController, AnnouncementsController],
  providers: [
    AdminService,
    AnnouncementService,
    LoggingService,
    ExportService,
    BanService,
    RatingRollbackService,
  ],
  exports: [AdminService, AnnouncementService, LoggingService, BanService],
})
export class AdminModule {}
