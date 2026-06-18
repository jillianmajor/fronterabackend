import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/app-config.module';
import { ClientModule } from './client/client.module';
import { HolidaysModule } from './holidays/holidays.module';
import { AnnouncementsInboxModule } from './announcements/announcements-inbox.module';
import { MainController } from './main.controller';
import { ProviderModule } from './provider/provider.module';
import { AwsModule } from './repository/aws/aws.module';
import { RepositoryModule } from './repository/repository.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    RepositoryModule,
    AwsModule,
    AuthModule,
    AdminModule,
    ProviderModule,
    HolidaysModule,
    AnnouncementsInboxModule,
    ClientModule,
  ],
  controllers: [MainController],
})
export class AppModule {}
