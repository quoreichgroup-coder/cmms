import moment from 'moment-timezone';

/**
 * Matches the mobile overview API's company-local definition of "today".
 * The exclusive end is the next local midnight, so DST days can be 23 or 25
 * hours without shifting the dashboard drill-down to a different date.
 */
export const getCompanyDayRange = (
  date: Date = new Date(),
  timeZone = 'UTC'
): [Date, Date] => {
  const resolvedTimeZone = moment.tz.zone(timeZone) ? timeZone : 'UTC';
  const start = moment.tz(date, resolvedTimeZone).startOf('day');
  const end = start.clone().add(1, 'day');
  return [start.toDate(), end.toDate()];
};

export const formatDashboardDate = (date: Date, locale?: string): string =>
  date.toLocaleDateString(locale || undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
