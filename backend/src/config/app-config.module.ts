import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { TOKENS } from './tokens';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    AppConfigService,
    {
      provide: TOKENS.AppConfig,
      useExisting: AppConfigService,
    },
  ],
  exports: [TOKENS.AppConfig],
})
export class AppConfigModule {}
