import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repository/repository.module';
import { AnnouncementsInboxController } from './announcements-inbox.controller';
import { AnnouncementsInboxService } from './announcements-inbox.service';

@Module({
  imports: [RepositoryModule],
  controllers: [AnnouncementsInboxController],
  providers: [AnnouncementsInboxService],
})
export class AnnouncementsInboxModule {}
