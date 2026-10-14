/**
 * The mobile overview endpoint defines "today" using UTC midnight. Keep the
 * dashboard drill-down boundaries in the same timezone so the displayed count
 * and the resulting work-order list describe the same day.
 */
export const getUtcDayRange = (date: Date = new Date()): [Date, Date] => {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return [start, end];
};

export const formatDashboardDate = (date: Date, locale?: string): string =>
  date.toLocaleDateString(locale || undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
