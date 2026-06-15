import { Logger, Module } from '@nestjs/common';
import { DomainErrors } from '../common/errors/domain-errors';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getPgSslConfig } from '../config/database-connection';
import { TOKENS } from '../config/tokens';
import { DbClient } from './persistence/db/db.client';
import {
  MasterAvailabilityRepository,
  OnboardingCatalogRepository,
  OnboardingRepository,
  ClientSchedulesRepository,
  HolidaysRepository,
  ProviderSchedulingRepository,
  ProvidersRepository,
  PrnAvailabilityRepository,
  ScheduleChangeApprovalsRepository,
  SchedulingRepository,
} from './persistence/repository';
import * as schema from './persistence/db/schema';

@Module({
  imports: [ConfigModule],
  providers: [
    DbClient,
    {
      provide: TOKENS.DbClient,
      useExisting: DbClient,
    },
    {
      provide: TOKENS.SchedulingRepository,
      useClass: SchedulingRepository,
    },
    {
      provide: TOKENS.SchedulingRepositoryLogger,
      useFactory: () => new Logger(SchedulingRepository.name),
    },
    {
      provide: TOKENS.ProvidersRepository,
      useClass: ProvidersRepository,
    },
    {
      provide: TOKENS.ProvidersRepositoryLogger,
      useFactory: () => new Logger(ProvidersRepository.name),
    },
    {
      provide: TOKENS.OnboardingRepository,
      useClass: OnboardingRepository,
    },
    {
      provide: TOKENS.OnboardingRepositoryLogger,
      useFactory: () => new Logger(OnboardingRepository.name),
    },
    {
      provide: TOKENS.OnboardingCatalogRepository,
      useClass: OnboardingCatalogRepository,
    },
    {
      provide: TOKENS.OnboardingCatalogRepositoryLogger,
      useFactory: () => new Logger(OnboardingCatalogRepository.name),
    },
    {
      provide: TOKENS.MasterAvailabilityRepository,
      useClass: MasterAvailabilityRepository,
    },
    {
      provide: TOKENS.MasterAvailabilityRepositoryLogger,
      useFactory: () => new Logger(MasterAvailabilityRepository.name),
    },
    {
      provide: TOKENS.ScheduleChangeApprovalsRepository,
      useClass: ScheduleChangeApprovalsRepository,
    },
    {
      provide: TOKENS.ScheduleChangeApprovalsRepositoryLogger,
      useFactory: () => new Logger(ScheduleChangeApprovalsRepository.name),
    },
    {
      provide: TOKENS.PrnAvailabilityRepository,
      useClass: PrnAvailabilityRepository,
    },
    {
      provide: TOKENS.PrnAvailabilityRepositoryLogger,
      useFactory: () => new Logger(PrnAvailabilityRepository.name),
    },
    {
      provide: TOKENS.ProviderSchedulingRepository,
      useClass: ProviderSchedulingRepository,
    },
    {
      provide: TOKENS.ProviderSchedulingRepositoryLogger,
      useFactory: () => new Logger(ProviderSchedulingRepository.name),
    },
    {
      provide: TOKENS.HolidaysRepository,
      useClass: HolidaysRepository,
    },
    {
      provide: TOKENS.HolidaysRepositoryLogger,
      useFactory: () => new Logger(HolidaysRepository.name),
    },
    {
      provide: TOKENS.ClientSchedulesRepository,
      useClass: ClientSchedulesRepository,
    },
    {
      provide: TOKENS.ClientSchedulesRepositoryLogger,
      useFactory: () => new Logger(ClientSchedulesRepository.name),
    },
    {
      provide: 'PG_POOL',
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw DomainErrors.databaseUrlRequired();
        }
        const ssl = getPgSslConfig(connectionString);
        return new Pool({
          connectionString,
          ...(ssl ? { ssl } : {}),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'DRIZZLE_DB',
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
      inject: ['PG_POOL'],
    },
  ],
  exports: [
    TOKENS.DbClient,
    TOKENS.SchedulingRepository,
    TOKENS.ProvidersRepository,
    TOKENS.OnboardingRepository,
    TOKENS.OnboardingCatalogRepository,
    TOKENS.MasterAvailabilityRepository,
    TOKENS.ScheduleChangeApprovalsRepository,
    TOKENS.PrnAvailabilityRepository,
    TOKENS.ProviderSchedulingRepository,
    TOKENS.HolidaysRepository,
    TOKENS.ClientSchedulesRepository,
  ],
})
export class RepositoryModule {}
