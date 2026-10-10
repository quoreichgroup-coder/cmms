import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

/** Returns a company-local calendar date in YYYY-MM-DD form. */
export const getCompanyDateInput = (value: Date | string, timeZone: string): string => {
  const zonedDate = utcToZonedTime(
    typeof value === 'string' ? new Date(value) : value,
    timeZone
  );
  const year = zonedDate.getFullYear();
  const month = `${zonedDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${zonedDate.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Keeps the original call's company-local time while changing its date. */
export const getRescheduledCallDate = (
  dateInput: string,
  originalDueDate: Date | string,
  timeZone: string
): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const originalLocal = utcToZonedTime(
    typeof originalDueDate === 'string' ? new Date(originalDueDate) : originalDueDate,
    timeZone
  );
  const localDateTime = new Date(
    year,
    month - 1,
    day,
    originalLocal.getHours(),
    originalLocal.getMinutes(),
    originalLocal.getSeconds(),
    originalLocal.getMilliseconds()
  );
  if (
    localDateTime.getFullYear() !== year ||
    localDateTime.getMonth() !== month - 1 ||
    localDateTime.getDate() !== day
  ) return null;
  const result = zonedTimeToUtc(localDateTime, timeZone);
  return Number.isNaN(result.getTime()) ? null : result;
};

export const isRescheduledCallDateInFuture = (
  dateInput: string,
  originalDueDate: Date | string,
  timeZone: string,
  now: Date = new Date()
): boolean => {
  const rescheduledDate = getRescheduledCallDate(dateInput, originalDueDate, timeZone);
  return rescheduledDate !== null && rescheduledDate.getTime() > now.getTime();
};

/** Returns the next company-local calendar date in YYYY-MM-DD form. */
export const getNextCompanyDateInput = (
  value: Date | string,
  timeZone: string
): string => {
  const zonedDate = utcToZonedTime(
    typeof value === 'string' ? new Date(value) : value,
    timeZone
  );
  zonedDate.setDate(zonedDate.getDate() + 1);

  const year = zonedDate.getFullYear();
  const month = `${zonedDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${zonedDate.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Defaults a report to a future company-local date, including overdue calls. */
export const getDefaultRescheduleDate = (
  originalDueDate: Date | string,
  now: Date,
  timeZone: string
): string => {
  const afterOccurrence = getNextCompanyDateInput(originalDueDate, timeZone);
  const afterToday = getNextCompanyDateInput(now, timeZone);
  return afterOccurrence > afterToday ? afterOccurrence : afterToday;
};
