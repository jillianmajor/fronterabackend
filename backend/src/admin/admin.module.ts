import { Module } from '@nestjs/common';
import { InvitesModule } from './invites/invites.module';
import { MasterAvailabilityModule } from './master-availability/master-availability.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PrnAvailabilityModule } from './prn-availability/prn-availability.module';
import { ProvidersModule } from './providers/providers.module';
import { ScheduleChangeApprovalsModule } from './schedule-change-approvals/schedule-change-approvals.module';
import { AdminAnnouncementsModule } from './announcements/admin-announcements.module';

@Module({
  imports: [
    OnboardingModule,
    InvitesModule,
    ProvidersModule,
    MasterAvailabilityModule,
    PrnAvailabilityModule,
    ScheduleChangeApprovalsModule,
    AdminAnnouncementsModule,
  ],
})
export class AdminModule {}
