import { Module } from '@nestjs/common';
import { AwsModule } from '../../repository/aws/aws.module';
import { RepositoryModule } from '../../repository/repository.module';
import { MasterAvailabilityController } from './master-availability.controller';
import { MasterPtoCalendarController } from './master-pto-calendar.controller';
import { MasterAvailabilityService } from './master-availability.service';

@Module({
  imports: [RepositoryModule, AwsModule],
  controllers: [MasterAvailabilityController, MasterPtoCalendarController],
  providers: [MasterAvailabilityService],
  exports: [MasterAvailabilityService],
})
export class MasterAvailabilityModule {}
