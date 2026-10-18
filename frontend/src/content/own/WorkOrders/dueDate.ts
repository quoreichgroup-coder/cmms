import { addDays, format, isValid, parseISO } from 'date-fns';

const getDueDateDay = (dueDate?: string | null): string | null => {
  if (!dueDate) return null;
  const day = dueDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !isValid(parseISO(dueDate))) {
    return null;
  }
  return day;
};

export const isDueDateBeforeDay = (
  dueDate: string | null | undefined,
  day: Date
): boolean => {
  const dueDateDay = getDueDateDay(dueDate);
  return dueDateDay !== null && dueDateDay < format(day, 'yyyy-MM-dd');
};

/** Treats today as due soon and includes dates before the exclusive day limit. */
export const isDueDateWithinNextDays = (
  dueDate: string | null | undefined,
  days: number,
  day: Date
): boolean => {
  const dueDateDay = getDueDateDay(dueDate);
  if (!dueDateDay || !Number.isInteger(days) || days <= 0) return false;
  const today = format(day, 'yyyy-MM-dd');
  const exclusiveLimit = format(addDays(day, days), 'yyyy-MM-dd');
  return dueDateDay >= today && dueDateDay < exclusiveLimit;
};
