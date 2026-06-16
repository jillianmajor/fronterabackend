import type { ScheduleChangeRequestRow } from '../repository/persistence/interface';
import {
  buildLiaisonSubmissionNotification,
  buildProviderDecisionNotification,
  buildReviewerDecisionNotification,
  describeScheduleChange,
  formatRequestDateLabel,
} from './notification-copy.util';

const baseRow = {
  requestId: 'r1',
  providerUserId: 'p1',
  providerName: 'Jamie Rivera',
  providerEmail: 'jamie@example.com',
  liaisonId: null,
  liaisonName: 'Anthony Kendall',
  region: 'South',
  requestDate: '2026-09-01',
  startTime: '08:00:00',
  endTime: '17:00:00',
  isUnavailable: false,
  changeType: 'modify_shift',
  status: 'approved',
  providerNotes: 'Need afternoon only',
  reviewNotes: null,
  reviewedBy: null,
  reviewedAt: null,
  pacrDocumentId: null,
  hasPacr: false,
  isPastDeadline: false,
  timeLabel: '8:00 AM – 5:00 PM',
  createdAt: new Date('2026-06-01'),
  weeklySchedule: null,
} satisfies ScheduleChangeRequestRow;

describe('notification-copy', () => {
  it('formats request dates without UTC shift', () => {
    expect(formatRequestDateLabel('2026-09-01')).toContain('September');
    expect(formatRequestDateLabel('2026-09-01T20:00:00.000Z')).toContain('September');
  });

  it('describes change types', () => {
    expect(describeScheduleChange({ ...baseRow, changeType: 'remove_day', isUnavailable: true })).toBe(
      'Full day off',
    );
    expect(describeScheduleChange({ ...baseRow, changeType: 'add_day' })).toContain('Available');
  });

  it('builds a detailed provider decision notification', () => {
    const copy = buildProviderDecisionNotification(
      baseRow,
      'approved',
      'Approved as submitted.',
    );
    expect(copy.title).toContain('Approved');
    expect(copy.title).toContain('Sep');
    expect(copy.message).toContain('Tuesday, September 1, 2026');
    expect(copy.message).toContain('Your note: Need afternoon only');
    expect(copy.message).toContain('Reviewer note: Approved as submitted.');
    expect(copy.link).toBe('/provider/schedule');
  });

  it('builds liaison review-queue notification copy', () => {
    const copy = buildLiaisonSubmissionNotification({
      providerName: 'Jamie Rivera',
      monthYear: '2026-09-01',
      dayCount: 3,
      noChanges: false,
      scheduleType: 'set',
    });
    expect(copy.title).toBe('Schedule changes ready to review');
    expect(copy.message).toContain('Jamie Rivera');
    expect(copy.message).toContain('Schedule Change Approvals');
    expect(copy.link).toBe('/corporate/time-off');
  });

  it('builds reviewer confirmation notification copy', () => {
    const copy = buildReviewerDecisionNotification(
      baseRow,
      'approved',
      'Approved as submitted.',
    );
    expect(copy.title).toContain('You approved Jamie Rivera');
    expect(copy.message).toContain('You approved a shift change');
    expect(copy.message).toContain('Note to provider: Approved as submitted.');
    expect(copy.message).toContain('Provider note: Need afternoon only');
    expect(copy.link).toBe('/corporate/time-off');
  });
});
