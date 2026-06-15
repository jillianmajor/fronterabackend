import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TOKENS } from '../../config/tokens';
import { S3Gateway } from './s3.gateway';
import { SesGateway } from './ses.gateway';

@Module({
  imports: [ConfigModule],
  providers: [
    SesGateway,
    S3Gateway,
    {
      provide: TOKENS.SesGateway,
      useExisting: SesGateway,
    },
    {
      provide: TOKENS.SesGatewayLogger,
      useFactory: () => new Logger(SesGateway.name),
    },
    {
      provide: TOKENS.S3Gateway,
      useExisting: S3Gateway,
    },
  ],
  exports: [TOKENS.SesGateway, TOKENS.S3Gateway],
})
export class AwsModule {}
