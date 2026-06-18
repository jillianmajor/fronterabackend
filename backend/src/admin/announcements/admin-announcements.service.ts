import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from '../../config/tokens';
import { NotificationsService } from '../../notifications/notifications.service';
import type {
  AnnouncementAudienceFilters,
  IAnnouncementsRepository,
} from '../../repository/persistence/interface';
import type { AuthenticatedUser } from '../../auth/auth.types';
import type { AnnouncementAudienceQueryDto } from './dto/announcement-audience-query.dto';
import type { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AdminAnnouncementsService {
  constructor(
    @Inject(TOKENS.AnnouncementsRepository)
    private readonly repository: IAnnouncementsRepository,
    private readonly notifications: NotificationsService,
  ) {}

  getFilterOptions() {
    return this.repository.getFilterOptions();
  }

  async getAudience(query: AnnouncementAudienceQueryDto) {
    const providers = await this.repository.listAudience(this.toFilters(query));
    return { providers };
  }

  async getHistory(limit = 20) {
    const rows = await this.repository.listAdminHistory(limit);
    return {
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        type: r.type,
        createdAt: r.createdAt.toISOString(),
        recipientCount: r.recipientCount,
      })),
    };
  }

  async create(dto: CreateAnnouncementDto, user?: AuthenticatedUser) {
    const { announcementId, recipientCount } = await this.repository.createAnnouncement({
      title: dto.title.trim(),
      body: dto.body.trim(),
      type: dto.type,
      createdBy: user?.id,
      recipientUserIds: dto.recipientUserIds,
    });

    const notify = await this.notifications.notifyAnnouncementRecipients({
      recipientUserIds: dto.recipientUserIds,
      title: dto.title.trim(),
      body: dto.body.trim(),
    });

    return {
      id: announcementId,
      recipientCount,
      notificationsCreated: notify.inAppCreated,
    };
  }

  private toFilters(query: AnnouncementAudienceQueryDto): AnnouncementAudienceFilters {
    return {
      q: query.q,
      company: query.company,
      regions: query.regions,
      liaisonNames: query.liaisonNames,
      recruiterNames: query.recruiterNames,
      facilityNames: query.facilityNames,
      specialties: query.specialties,
      scheduleType: query.scheduleType,
    };
  }
}
