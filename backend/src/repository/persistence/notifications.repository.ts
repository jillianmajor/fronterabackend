import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from '../../config/tokens';
import type { IDbClient, INotificationsRepository, NotificationInsertInput, NotificationRow } from './interface';
import { notifications } from './db/schema';

@Injectable()
export class NotificationsRepository implements INotificationsRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  async insert(input: NotificationInsertInput): Promise<NotificationRow> {
    const rows = await this.dbClient.db
      .insert(notifications)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message ?? null,
        link: input.link ?? null,
        read: false,
      })
      .returning({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        link: notifications.link,
        read: notifications.read,
        createdAt: notifications.createdAt,
      });

    const row = rows[0];
    if (!row) {
      throw new Error('Failed to insert notification');
    }

    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      message: row.message,
      link: row.link,
      read: row.read,
      createdAt: row.createdAt,
    };
  }
}
