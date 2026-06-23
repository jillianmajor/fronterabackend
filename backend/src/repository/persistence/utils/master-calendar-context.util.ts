import type { MasterAvailabilityFilters } from '../interface';

/** Master Availability Calendar — PRN monthly availability submissions. */
export type MasterPrnCalendarContext = 'prn';

/** Master PTO Calendar — SET time-off / shift changes (+ client calendar exports). */
export type MasterPtoCalendarContext = 'pto';

export type MasterCalendarContext = MasterPrnCalendarContext | MasterPtoCalendarContext;

export const PRN_AVAILABILITY_CHANGE_TYPES = ['add_day'] as const;

export const PTO_TIME_OFF_CHANGE_TYPES = ['remove_day', 'modify_shift', 'swap'] as const;

/** Applies schedule/change-type scoping for a corporate calendar screen. */
export function scopeFiltersForCalendarContext(
  filters: MasterAvailabilityFilters,
  context: MasterCalendarContext,
): MasterAvailabilityFilters {
  if (context === 'prn') {
    return {
      ...filters,
      scheduleTypes: ['prn'],
      changeTypes: [...PRN_AVAILABILITY_CHANGE_TYPES],
    };
  }

  return {
    ...filters,
    changeTypes: [...PTO_TIME_OFF_CHANGE_TYPES],
  };
}
