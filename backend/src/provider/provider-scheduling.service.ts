import { Inject, Injectable } from '@nestjs/common';
import { AppErrors } from '../common/errors/app-errors';
import { rethrowAsHttp } from '../common/errors/to-http.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { TOKENS } from '../config/tokens';
import type { IProviderSchedulingRepository } from '../repository/persistence/interface';
import {
  submissionDeadlineForTargetMonth,
} from '../repository/persistence/utils/schedule-change-approvals.util';
import { parseMonthYear } from '../repository/persistence/utils/master-availability.util';
import {
  assertDateInMonth,
  assertEndAfterStart,
  assertFirstOfMonth,
  calendarDaysFromToday,
  parseClockLabelToDbTime,
} from './provider-time.util';
import type { SubmitPrnAvailabilityDto } from './dto/submit-prn-availability.dto';
import type { SubmitSetTimeOffDto } from './dto/submit-set-time-off.dto';

const SET_TIME_OFF_CHANGE_TYPES = ['remove_day', 'modify_shift', 'swap'] as const;

@Injectable()
export class ProviderSchedulingService {
  constructor(
    @Inject(TOKENS.ProviderSchedulingRepository)
    private readonly repo: IProviderSchedulingRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async getContext(providerUserId: string) {
    try {
      return await this.repo.getSchedulingContext(providerUserId);
    } catch (err) {
      rethrowAsHttp(err);
    }
  }

  async getAvailability(providerUserId: string, monthYear: string) {
    assertFirstOfMonth(monthYear);
    try {
      await this.repo.assertPrnProvider(providerUserId);
    } catch (err) {
      rethrowAsHttp(err);
    }
    return this.repo.getAvailabilityMonth(providerUserId, monthYear);
  }

  async submitAvailability(providerUserId: string, dto: SubmitPrnAvailabilityDto) {
    assertFirstOfMonth(dto.monthYear);
    const noChanges = dto.noChanges === true;
    const days = dto.days ?? [];

    if (!noChanges && days.length === 0) {
      throw AppErrors.noDaysOrNoChanges();
    }

    let context;
    try {
      context = await this.repo.assertPrnProvider(providerUserId);
    } catch (err) {
      rethrowAsHttp(err);
    }

    const allowedSites = new Set(context.workSites.map((s) => s.workSiteId));
    const { end } = parseMonthYear(dto.monthYear);
    const deadline = submissionDeadlineForTargetMonth(dto.monthYear);
    const today = new Date().toISOString().slice(0, 10);
    const isPastDeadline = today > deadline;

    if (isPastDeadline && !dto.pacrDocumentId) {
      throw AppErrors.pacrRequiredAfterDeadline();
    }
    if (!isPastDeadline && dto.pacrDocumentId) {
      throw AppErrors.pacrNotAllowedOnTime();
    }

    if (dto.pacrDocumentId) {
      const doc = await this.repo.findPacrDocumentForProvider(
        dto.pacrDocumentId,
        providerUserId,
      );
      if (!doc) {
        throw AppErrors.pacrDocumentNotFound();
      }
    }

    const seenDates = new Set<string>();
    const normalizedDays: {
      requestDate: string;
      startTime: string;
      endTime: string;
      notes?: string;
      workSiteId: string;
    }[] = [];

    for (const day of days) {
      if (seenDates.has(day.requestDate)) {
        throw AppErrors.duplicateRequestDate(day.requestDate);
      }
      seenDates.add(day.requestDate);
      assertDateInMonth(day.requestDate, dto.monthYear, end);
      if (!allowedSites.has(day.workSiteId)) {
        throw AppErrors.workSiteNotAssigned(day.workSiteId);
      }
      assertEndAfterStart(day.startTime, day.endTime);

      if (isPastDeadline) {
        const leadDays = calendarDaysFromToday(day.requestDate);
        if (leadDays < 14) {
          throw AppErrors.insufficientAdvanceNotice(day.requestDate);
        }
      }

      normalizedDays.push({
        requestDate: day.requestDate,
        startTime: parseClockLabelToDbTime(day.startTime),
        endTime: parseClockLabelToDbTime(day.endTime),
        notes: day.notes,
        workSiteId: day.workSiteId,
      });
    }

    const result = await this.repo.submitPrnAvailability({
      providerUserId,
      monthYear: dto.monthYear,
      noChanges,
      pacrDocumentId: dto.pacrDocumentId,
      days: normalizedDays,
    });

    if (context.liaisonId) {
      await this.notifications.notifyLiaisonSubmission({
        liaisonUserId: context.liaisonId,
        providerName: context.fullName ?? 'Provider',
        monthYear: dto.monthYear,
        dayCount: result.dayCount,
        noChanges,
        scheduleType: 'prn',
      });
    }

    return result;
  }

  async getTimeOff(providerUserId: string, monthYear: string) {
    assertFirstOfMonth(monthYear);
    try {
      await this.repo.assertSetProvider(providerUserId);
    } catch (err) {
      rethrowAsHttp(err);
    }
    return this.repo.getTimeOffMonth(providerUserId, monthYear);
  }

  async submitTimeOff(providerUserId: string, dto: SubmitSetTimeOffDto) {
    assertFirstOfMonth(dto.monthYear);
    const noChanges = dto.noChanges === true;
    const days = dto.days ?? [];

    if (!noChanges && days.length === 0) {
      throw AppErrors.noDaysOrNoChanges();
    }

    try {
      await this.repo.assertSetProvider(providerUserId);
    } catch (err) {
      rethrowAsHttp(err);
    }

    const context = await this.repo.getSchedulingContext(providerUserId);
    const allowedSites = new Set(context.workSites.map((s) => s.workSiteId));
    const { end } = parseMonthYear(dto.monthYear);
    const deadline = submissionDeadlineForTargetMonth(dto.monthYear);
    const today = new Date().toISOString().slice(0, 10);
    const isPastDeadline = today > deadline;

    if (isPastDeadline && !dto.pacrDocumentId) {
      throw AppErrors.pacrRequiredAfterDeadline();
    }
    if (!isPastDeadline && dto.pacrDocumentId) {
      throw AppErrors.pacrNotAllowedOnTime();
    }

    if (dto.pacrDocumentId) {
      const doc = await this.repo.findPacrDocumentForProvider(
        dto.pacrDocumentId,
        providerUserId,
      );
      if (!doc) {
        throw AppErrors.pacrDocumentNotFound();
      }
    }

    const seenDates = new Set<string>();
    const normalizedDays: {
      requestDate: string;
      changeType: (typeof SET_TIME_OFF_CHANGE_TYPES)[number];
      workSiteId: string;
      startTime?: string;
      endTime?: string;
      notes?: string;
    }[] = [];

    for (const day of days) {
      if (!SET_TIME_OFF_CHANGE_TYPES.includes(day.changeType)) {
        throw AppErrors.invalidTimeOffChangeType(day.changeType);
      }
      if (seenDates.has(day.requestDate)) {
        throw AppErrors.duplicateRequestDate(day.requestDate);
      }
      seenDates.add(day.requestDate);
      assertDateInMonth(day.requestDate, dto.monthYear, end);
      if (!allowedSites.has(day.workSiteId)) {
        throw AppErrors.workSiteNotAssigned(day.workSiteId);
      }

      const needsTimes = day.changeType === 'modify_shift' || day.changeType === 'swap';
      if (needsTimes && (!day.startTime?.trim() || !day.endTime?.trim())) {
        throw AppErrors.timeOffTimesRequired(day.changeType);
      }
      if (needsTimes) {
        assertEndAfterStart(day.startTime!, day.endTime!);
      }

      if (isPastDeadline) {
        const leadDays = calendarDaysFromToday(day.requestDate);
        if (day.changeType === 'remove_day' && leadDays < 7) {
          throw AppErrors.insufficientRemoveNotice(day.requestDate);
        }
        if (day.changeType !== 'remove_day' && leadDays < 14) {
          throw AppErrors.insufficientAdvanceNotice(day.requestDate);
        }
      }

      normalizedDays.push({
        requestDate: day.requestDate,
        changeType: day.changeType,
        workSiteId: day.workSiteId,
        notes: day.notes,
        startTime:
          needsTimes && day.startTime ? parseClockLabelToDbTime(day.startTime) : undefined,
        endTime: needsTimes && day.endTime ? parseClockLabelToDbTime(day.endTime) : undefined,
      });
    }

    const result = await this.repo.submitSetTimeOff({
      providerUserId,
      monthYear: dto.monthYear,
      noChanges,
      pacrDocumentId: dto.pacrDocumentId,
      days: normalizedDays,
    });

    if (context.liaisonId) {
      await this.notifications.notifyLiaisonSubmission({
        liaisonUserId: context.liaisonId,
        providerName: context.fullName ?? 'Provider',
        monthYear: dto.monthYear,
        dayCount: result.dayCount,
        noChanges,
        scheduleType: 'set',
      });
    }

    return result;
  }
}
