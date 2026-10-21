import {
  ShiftConfiguration,
  ShiftDayConfiguration,
  ShiftDayName
} from '../models/shiftConfiguration';

export const shiftDayOrder: ShiftDayName[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
];

export const getEffectiveShiftDay = (
  configuration: ShiftConfiguration,
  day: ShiftDayName
): ShiftDayConfiguration =>
  (configuration.days ?? []).find((entry) => entry.dayOfWeek === day) ?? {
    dayOfWeek: day,
    availabilityMinutes: 8 * 60,
    enabled: true
  };

export const isValidIsoCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const formatAvailabilityDuration = (minutes: number): string => {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
};
