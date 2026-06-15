import { Module } from '@nestjs/common';
import { AwsModule } from '../../repository/aws/aws.module';
import { RepositoryModule } from '../../repository/repository.module';
import { InvitesModule } from '../invites/invites.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [RepositoryModule, AwsModule, InvitesModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
