import { qpmWorkOrderStatusTokens } from 'src/theme/tokens';
import { isDueDateBeforeDay } from '../dueDate';

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
    if (isDueDateBeforeDay(event.dueDate, now)) return 'OVERDUE';
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
