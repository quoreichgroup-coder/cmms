import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  getDay,
  isValid,
  set,
  startOfWeek
} from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

type SelectValue<T> = T | { value: T } | null | undefined;

export interface PMSchedulePreviewInput {
  startsOn?: Date | string | null;
  endsOn?: Date | string | null;
  frequency?: number | string;
  recurrenceType?: SelectValue<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>;
  daysOfWeek?: Array<number | { value: number }> | null;
}

const getValue = <T>(value: SelectValue<T>): T | undefined =>
  value && typeof value === 'object' && 'value' in value
    ? value.value
    : (value as T | undefined);

const toDate = (value?: Date | string | null): Date | undefined => {
  if (!value) return undefined;
  const result = value instanceof Date ? value : new Date(value);
  return isValid(result) ? result : undefined;
};

/**
 * Builds a display-only preview from the unsaved form values. Dates use the
 * company's timezone and the same interval anchors as the scheduled PM.
 * Completion-based dates are estimates assuming each preceding order closes
 * on its planned date.
 */
export const getPMSchedulePreview = (
  input: PMSchedulePreviewInput,
  timeZone: string,
  limit = 8,
  now = new Date()
): Date[] => {
  const startsOn = toDate(input.startsOn);
  const endsOn = toDate(input.endsOn);
  const frequency = Number(input.frequency);
  const recurrenceType = getValue(input.recurrenceType);
  if (
    !startsOn ||
    !Number.isInteger(frequency) ||
    frequency < 1 ||
    !recurrenceType ||
    limit < 1
  ) {
    return [];
  }

  let zonedStart: Date;
  let zonedNow: Date;
  let zonedEnd: Date | undefined;
  try {
    zonedStart = utcToZonedTime(startsOn, timeZone);
    zonedNow = utcToZonedTime(now, timeZone);
    zonedEnd = endsOn ? utcToZonedTime(endsOn, timeZone) : undefined;
  } catch (_error) {
    return [];
  }

  const upcoming: Date[] = [];
  const appendIfUpcoming = (localDate: Date) => {
    if (zonedEnd && localDate > zonedEnd) return false;
    const occurrence = zonedTimeToUtc(localDate, timeZone);
    if (occurrence >= now) upcoming.push(occurrence);
    return true;
  };

  if (recurrenceType === 'WEEKLY') {
    const selectedDays = new Set(
      (input.daysOfWeek ?? []).map((day) =>
        typeof day === 'number' ? day : day.value
      )
    );
    if (selectedDays.size === 0) return [];

    const startDay = new Date(
      zonedStart.getFullYear(),
      zonedStart.getMonth(),
      zonedStart.getDate()
    );
    const elapsedDays = Math.max(0, differenceInCalendarDays(zonedNow, startDay));
    const currentWeek = Math.floor(elapsedDays / 7);
    const firstValidWeek = currentWeek - (currentWeek % frequency);
    let weekIndex = firstValidWeek;

    while (upcoming.length < limit) {
      for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
        const localDate = addDays(startDay, weekIndex * 7 + dayOffset);
        const mondayIndex = (getDay(localDate) + 6) % 7;
        if (!selectedDays.has(mondayIndex)) continue;

        const atStartTime = set(localDate, {
          hours: zonedStart.getHours(),
          minutes: zonedStart.getMinutes(),
          seconds: 0,
          milliseconds: 0
        });
        if (atStartTime < zonedStart || atStartTime < zonedNow) continue;
        if (!appendIfUpcoming(atStartTime)) return upcoming;
        if (upcoming.length >= limit) return upcoming;
      }

      weekIndex += frequency;
      const nextWeek = addDays(startDay, weekIndex * 7);
      if (zonedEnd && nextWeek > zonedEnd) break;
    }
    return upcoming;
  }

  let localOccurrence = zonedStart;
  if (localOccurrence < zonedNow) {
    let skippedIntervals = 0;
    if (recurrenceType === 'DAILY') {
      skippedIntervals = Math.floor(
        differenceInCalendarDays(zonedNow, localOccurrence) / frequency
      );
      localOccurrence = addDays(localOccurrence, skippedIntervals * frequency);
    } else if (recurrenceType === 'MONTHLY') {
      skippedIntervals = Math.floor(
        differenceInCalendarMonths(zonedNow, localOccurrence) / frequency
      );
      for (let index = 0; index < skippedIntervals; index += 1) {
        localOccurrence = addMonths(localOccurrence, frequency);
      }
    } else {
      skippedIntervals = Math.floor(
        differenceInCalendarYears(zonedNow, localOccurrence) / frequency
      );
      for (let index = 0; index < skippedIntervals; index += 1) {
        localOccurrence = addYears(localOccurrence, frequency);
      }
    }

    while (localOccurrence < zonedNow) {
      localOccurrence =
        recurrenceType === 'DAILY'
          ? addDays(localOccurrence, frequency)
          : recurrenceType === 'MONTHLY'
            ? addMonths(localOccurrence, frequency)
            : addYears(localOccurrence, frequency);
    }
  }

  while (upcoming.length < limit) {
    if (!appendIfUpcoming(localOccurrence)) break;
    if (recurrenceType === 'DAILY') {
      localOccurrence = addDays(localOccurrence, frequency);
    } else if (recurrenceType === 'MONTHLY') {
      localOccurrence = addMonths(localOccurrence, frequency);
    } else {
      localOccurrence = addYears(localOccurrence, frequency);
    }
  }

  return upcoming;
};

/** Returns the schedule's one-based base-cycle number for a forecast occurrence. */
export const getPMBaseCycleNumber = (
  input: PMSchedulePreviewInput,
  occurrence: Date | string,
  timeZone: string
): number => {
  const start = toDate(input.startsOn);
  const due = toDate(occurrence);
  const frequency = Number(input.frequency);
  const recurrenceType = getValue(input.recurrenceType);
  if (!start || !due || !Number.isInteger(frequency) || frequency < 1 || !recurrenceType) return 0;
  try {
    const localStart = utcToZonedTime(start, timeZone);
    const localDue = utcToZonedTime(due, timeZone);
    if (localDue < localStart) return 0;
    let elapsed: number;
    switch (recurrenceType) {
      case 'DAILY':
        elapsed = differenceInCalendarDays(localDue, localStart);
        break;
      case 'WEEKLY':
        elapsed = Math.floor(differenceInCalendarDays(
          startOfWeek(localDue, { weekStartsOn: 1 }),
          startOfWeek(localStart, { weekStartsOn: 1 })
        ) / 7);
        break;
      case 'MONTHLY':
        elapsed = differenceInCalendarMonths(
          new Date(localDue.getFullYear(), localDue.getMonth(), 1),
          new Date(localStart.getFullYear(), localStart.getMonth(), 1)
        );
        break;
      case 'YEARLY':
        elapsed = differenceInCalendarYears(
          new Date(localDue.getFullYear(), 0, 1),
          new Date(localStart.getFullYear(), 0, 1)
        );
        break;
      default:
        return 0;
    }
    return Math.floor(elapsed / frequency) + 1;
  } catch (_error) {
    return 0;
  }
};
