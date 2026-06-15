import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppConfig } from './app-config.interface';

@Injectable()
export class AppConfigService implements IAppConfig {
  constructor(private readonly config: ConfigService) {}

  get<T = string>(propertyPath: string): T | undefined {
    return this.config.get<T>(propertyPath);
  }
}
