import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AwsModule } from '../repository/aws/aws.module';
import { RepositoryModule } from '../repository/repository.module';
import { ProviderController } from './provider.controller';
import { ProviderDocumentsService } from './provider-documents.service';
import { ProviderSchedulingService } from './provider-scheduling.service';
@Module({
  imports: [RepositoryModule, AwsModule, AuthModule, DocumentsModule, NotificationsModule],
  controllers: [ProviderController],
  providers: [ProviderSchedulingService, ProviderDocumentsService],
  exports: [ProviderSchedulingService],
})
export class ProviderModule {}
