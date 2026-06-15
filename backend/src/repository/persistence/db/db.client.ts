import { Inject, Injectable } from '@nestjs/common';
import type { drizzle } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';
import type { IDbClient } from '../interface';

@Injectable()
export class DbClient implements IDbClient {
  readonly db: ReturnType<typeof drizzle<typeof schema>>;

  constructor(@Inject('DRIZZLE_DB') db: ReturnType<typeof drizzle<typeof schema>>) {
    this.db = db;
  }
}
