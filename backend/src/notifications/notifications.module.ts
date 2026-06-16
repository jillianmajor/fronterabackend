import { Module } from '@nestjs/common';
import { AwsModule } from '../repository/aws/aws.module';
import { RepositoryModule } from '../repository/repository.module';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [RepositoryModule, AwsModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
