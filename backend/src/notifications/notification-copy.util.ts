import type { ScheduleChangeRequestRow } from '../repository/persistence/interface';

/** Parse DB date / ISO string as a local calendar day (no UTC shift). */
export function formatRequestDateLabel(raw: string): string {
  const ymd = raw.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return raw;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return raw;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRequestDateShort(raw: string): string {
  const ymd = raw.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return raw;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return raw;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function describeScheduleChange(row: ScheduleChangeRequestRow): string {
  if (row.isUnavailable || row.changeType === 'remove_day') {
    return 'Full day off';
  }
  if (row.changeType === 'add_day') {
    if (row.timeLabel && row.timeLabel !== 'Unavailable') {
      return `Available — ${row.timeLabel}`;
    }
    return 'Additional availability day';
  }
  if (row.changeType === 'modify_shift') {
    return row.timeLabel ? `Shift change — ${row.timeLabel}` : 'Shift change';
  }
  if (row.changeType === 'swap') {
    return row.timeLabel ? `Shift swap — ${row.timeLabel}` : 'Shift swap';
  }
  return row.timeLabel ?? 'Schedule change';
}

export function providerScheduleLink(row: ScheduleChangeRequestRow): string {
  if (row.changeType === 'add_day' && !row.isUnavailable) {
    return '/provider/availability';
  }
  return '/provider/schedule';
}

export function reviewerScheduleLink(row: ScheduleChangeRequestRow): string {
  if (row.changeType === 'add_day' && !row.isUnavailable) {
    return '/corporate/prn-availability';
  }
  return '/corporate/time-off';
}

export function formatMonthYearLabel(monthYear: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(monthYear);
  if (!match) return monthYear;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month)) return monthYear;
  return new Date(year, month - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function buildProviderDecisionNotification(
  row: ScheduleChangeRequestRow,
  decision: 'approved' | 'denied',
  reviewNotes?: string,
): { title: string; message: string; link: string } {
  const decisionLabel = decision === 'approved' ? 'Approved' : 'Denied';
  const dateShort = formatRequestDateShort(row.requestDate);
  const dateFull = formatRequestDateLabel(row.requestDate);
  const changeSummary = describeScheduleChange(row);

  const title = `${decisionLabel} — ${dateShort} — ${changeSummary}`;

  const lines = [
    `Your ${changeSummary.toLowerCase()} request for ${dateFull} was ${decision}.`,
  ];

  if (row.providerNotes?.trim()) {
    lines.push(`Your note: ${row.providerNotes.trim()}`);
  }
  if (reviewNotes?.trim()) {
    lines.push(`Reviewer note: ${reviewNotes.trim()}`);
  } else if (row.liaisonName?.trim()) {
    lines.push(`Reviewed by ${row.liaisonName.trim()}.`);
  }

  return {
    title,
    message: lines.join('\n'),
    link: providerScheduleLink(row),
  };
}

/** Confirmation for the admin/liaison who approved or denied a request. */
export function buildReviewerDecisionNotification(
  row: ScheduleChangeRequestRow,
  decision: 'approved' | 'denied',
  reviewNotes?: string,
): { title: string; message: string; link: string } {
  const decisionPast = decision === 'approved' ? 'approved' : 'denied';
  const dateShort = formatRequestDateShort(row.requestDate);
  const dateFull = formatRequestDateLabel(row.requestDate);
  const changeSummary = describeScheduleChange(row);
  const provider = row.providerName?.trim() || 'a provider';

  const title = `You ${decisionPast} ${provider} — ${dateShort}`;

  const lines = [
    `You ${decisionPast} a ${changeSummary.toLowerCase()} request for ${provider} on ${dateFull}.`,
  ];

  if (reviewNotes?.trim()) {
    lines.push(`Note to provider: ${reviewNotes.trim()}`);
  }
  if (row.providerNotes?.trim()) {
    lines.push(`Provider note: ${row.providerNotes.trim()}`);
  }

  return {
    title,
    message: lines.join('\n'),
    link: reviewerScheduleLink(row),
  };
}

/** Liaison / corporate review-queue alert — distinct from provider decision copy. */
export function buildLiaisonSubmissionNotification(params: {
  providerName: string;
  monthYear: string;
  dayCount: number;
  noChanges: boolean;
  scheduleType: 'prn' | 'set';
}): { title: string; message: string; link: string } {
  const monthLabel = formatMonthYearLabel(params.monthYear);
  const provider = params.providerName.trim() || 'A provider';
  const link =
    params.scheduleType === 'prn' ? '/corporate/prn-availability' : '/corporate/time-off';

  if (params.noChanges) {
    return {
      title: `No changes — ${provider}`,
      message: [
        `${provider} submitted their ${monthLabel} schedule with no changes.`,
        'No review action is required.',
      ].join('\n'),
      link,
    };
  }

  const dayWord = params.dayCount === 1 ? 'day' : 'days';
  if (params.scheduleType === 'prn') {
    return {
      title: 'PRN availability ready to review',
      message: [
        `${provider} submitted ${params.dayCount} availability ${dayWord} for ${monthLabel}.`,
        'Open Availability Approvals to review and approve or deny.',
      ].join('\n'),
      link,
    };
  }

  return {
    title: 'Schedule changes ready to review',
    message: [
      `${provider} submitted ${params.dayCount} schedule change ${dayWord} for ${monthLabel}.`,
      'Open Schedule Change Approvals to review pending requests.',
    ].join('\n'),
    link,
  };
}
