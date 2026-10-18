import { format, isSameMonth, isSameYear, subDays } from 'date-fns';
import type { Locale } from 'date-fns';
import type { View } from 'src/models/calendar';

interface CalendarPeriodLabelOptions {
  date: Date;
  view: View;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  locale?: Locale;
}

export const getCalendarPeriodLabel = ({
  date,
  view,
  rangeStart,
  rangeEnd,
  locale
}: CalendarPeriodLabelOptions): string => {
  if (view === 'dayGridMonth') return format(date, 'MMMM yyyy', { locale });
  if (view === 'timeGridDay')
    return format(date, 'EEEE, d MMMM yyyy', { locale });

  // FullCalendar's range end is exclusive; display the last visible day.
  const start = rangeStart ?? date;
  const end = rangeEnd ? subDays(rangeEnd, 1) : date;

  if (isSameMonth(start, end)) {
    return `${format(start, 'd', { locale })}–${format(end, 'd MMMM yyyy', {
      locale
    })}`;
  }

  if (isSameYear(start, end)) {
    return `${format(start, 'd MMM', { locale })} – ${format(
      end,
      'd MMM yyyy',
      { locale }
    )}`;
  }

  return `${format(start, 'd MMM yyyy', { locale })} – ${format(
    end,
    'd MMM yyyy',
    { locale }
  )}`;
};
