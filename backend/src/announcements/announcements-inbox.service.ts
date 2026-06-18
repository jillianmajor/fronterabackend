import { Inject, Injectable } from '@nestjs/common';
import { AppErrors } from '../common/errors/app-errors';
import { TOKENS } from '../config/tokens';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { IAnnouncementsRepository } from '../repository/persistence/interface';

@Injectable()
export class AnnouncementsInboxService {
  constructor(
    @Inject(TOKENS.AnnouncementsRepository)
    private readonly repository: IAnnouncementsRepository,
  ) {}

  private requireUser(user?: AuthenticatedUser): AuthenticatedUser {
    if (!user?.id) {
      throw AppErrors.unauthorized('Authentication required');
    }
    return user;
  }

  async getInbox(user?: AuthenticatedUser) {
    const authUser = this.requireUser(user);
    const rows = await this.repository.listInboxForUser(authUser.id);
    return {
      items: rows.map((r) => ({
        recipientId: r.recipientId,
        readAt: r.readAt?.toISOString() ?? null,
        id: r.announcementId,
        title: r.title,
        body: r.body,
        type: r.type,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async markRead(user: AuthenticatedUser | undefined, recipientIds?: string[]) {
    const authUser = this.requireUser(user);
    const markedCount = await this.repository.markRecipientsRead(authUser.id, recipientIds);
    return { markedCount };
  }
}
