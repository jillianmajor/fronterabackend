import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/notifications.module';
import { RepositoryModule } from '../../repository/repository.module';
import { AdminAnnouncementsController } from './admin-announcements.controller';
import { AdminAnnouncementsService } from './admin-announcements.service';

@Module({
  imports: [RepositoryModule, NotificationsModule],
  controllers: [AdminAnnouncementsController],
  providers: [AdminAnnouncementsService],
})
export class AdminAnnouncementsModule {}
