import { format, isValid, parseISO } from 'date-fns';
import { qpmWorkOrderStatusTokens } from 'src/theme/tokens';

interface CalendarEventPresentationInput {
  status?: string;
  dueDate?: string | null;
}

export function getCalendarEventStatus(
  event: CalendarEventPresentationInput,
  now: Date = new Date()
): string | null {
  if (event.status === 'COMPLETE') return 'COMPLETE';

  if (event.dueDate) {
    // Due dates are day-based in the maintenance workflow. The API serializes
    // Java Date values as UTC timestamps; comparing those instants to local
    // midnight incorrectly marks today's due date overdue in western timezones.
    const dueDate = parseISO(event.dueDate);
    const dueDateDay = event.dueDate.slice(0, 10);
    if (
      isValid(dueDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(dueDateDay) &&
      dueDateDay < format(now, 'yyyy-MM-dd')
    ) {
      return 'OVERDUE';
    }
  }

  return event.status &&
    Object.prototype.hasOwnProperty.call(qpmWorkOrderStatusTokens, event.status)
    ? event.status
    : null;
}

export function getCalendarEventColor(
  event: CalendarEventPresentationInput,
  now: Date = new Date()
): string | null {
  const status = getCalendarEventStatus(event, now);
  return status ? qpmWorkOrderStatusTokens[status].foreground : null;
}
