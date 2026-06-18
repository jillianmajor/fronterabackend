import type { INotificationsRepository } from '../repository/persistence/interface';
import { NotificationsService } from './notifications.service';

describe('NotificationsService.notifyLiaisonSubmission', () => {
  it('notifies liaison and all corporate reviewers', async () => {
    const insertedUserIds: string[] = [];
    const repo: INotificationsRepository = {
      insert: jest.fn(async (input) => {
        insertedUserIds.push(input.userId);
        return {
          id: 'n1',
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message ?? null,
          link: input.link ?? null,
          read: false,
          createdAt: new Date(),
        };
      }),
      listCorporateReviewerUserIds: jest.fn(async () => [
        'admin-user',
        'liaison-user',
      ]),
    };

    const service = new NotificationsService(
      repo,
      { sendEmail: jest.fn() } as never,
      { get: jest.fn() } as never,
    );

    const result = await service.notifyLiaisonSubmission({
      liaisonUserId: 'liaison-user',
      providerName: 'Dr. Smith',
      monthYear: '2026-06-01',
      dayCount: 2,
      noChanges: false,
      scheduleType: 'set',
    });

    expect(result.recipients).toBe(2);
    expect(result.inAppCreated).toBe(2);
    expect(insertedUserIds.sort()).toEqual(['admin-user', 'liaison-user']);
  });

  it('still notifies corporate reviewers when liaison is missing', async () => {
    const insertedUserIds: string[] = [];
    const repo: INotificationsRepository = {
      insert: jest.fn(async (input) => {
        insertedUserIds.push(input.userId);
        return {
          id: 'n1',
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message ?? null,
          link: input.link ?? null,
          read: false,
          createdAt: new Date(),
        };
      }),
      listCorporateReviewerUserIds: jest.fn(async () => ['admin-user']),
    };

    const service = new NotificationsService(
      repo,
      { sendEmail: jest.fn() } as never,
      { get: jest.fn() } as never,
    );

    const result = await service.notifyLiaisonSubmission({
      providerName: 'Dr. Smith',
      monthYear: '2026-06-01',
      dayCount: 1,
      noChanges: false,
      scheduleType: 'prn',
    });

    expect(result.recipients).toBe(1);
    expect(insertedUserIds).toEqual(['admin-user']);
  });
});
