// Readable calendar recurrence ("Every 2 weeks on Monday, Thursday"), mirroring the web
// getScheduleDescription helper. daysOfWeek uses 0 = Monday, like the API.
type ScheduleLike = {
  frequency?: number | null;
  recurrenceType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | string | null;
  recurrenceBasedOn?: 'SCHEDULED_DATE' | 'COMPLETED_DATE' | string | null;
  daysOfWeek?: number[] | null;
};

export const weekdayNames = (language: string): string[] =>
  // 1 January 2024 was a Monday.
  [...Array(7)].map((_, index) =>
    new Date(2024, 0, 1 + index).toLocaleDateString(language, { weekday: 'long' })
  );

export function getScheduleDescription(
  schedule: ScheduleLike | null | undefined,
  language: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!schedule?.recurrenceType) return '';
  const count = Number(schedule.frequency) || 1;
  switch (schedule.recurrenceType) {
    case 'DAILY':
      return t('pm_schedule_daily', { count });
    case 'WEEKLY': {
      const names = weekdayNames(language);
      const days =
        schedule.recurrenceBasedOn === 'COMPLETED_DATE'
          ? ''
          : [...(schedule.daysOfWeek ?? [])]
              .sort((a, b) => a - b)
              .map((day) => names[day])
              .filter(Boolean)
              .join(', ');
      return days
        ? t('pm_schedule_weekly_on', { count, days })
        : t('pm_schedule_weekly', { count });
    }
    case 'MONTHLY':
      return t('pm_schedule_monthly', { count });
    case 'YEARLY':
      return t('pm_schedule_yearly', { count });
    default:
      return '';
  }
}
