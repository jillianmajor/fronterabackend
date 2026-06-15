import { Module } from '@nestjs/common';
import { TOKENS } from '../../config/tokens';
import { RepositoryModule } from '../../repository/repository.module';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [RepositoryModule],
  controllers: [InvitesController],
  providers: [
    InvitesService,
    {
      provide: TOKENS.InvitesService,
      useExisting: InvitesService,
    },
  ],
  exports: [TOKENS.InvitesService],
})
export class InvitesModule {}
