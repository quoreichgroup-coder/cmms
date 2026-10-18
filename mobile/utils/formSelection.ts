import { isTask, type Task } from '../models/tasks';

/** Convert Formik selector values to the ID/object array expected by picker screens. */
export const getSelectedFormValues = <T = any>(values: unknown): T[] => {
  const items = Array.isArray(values)
    ? values
    : values === null || values === undefined
    ? []
    : [values];

  return items.map((item) => {
    if (item && typeof item === 'object' && isTask(item)) return item as T;

    const value = (item as { value?: unknown } | null)?.value ?? item;
    if (value && typeof value === 'object' && isTask(value)) return value as T;
    if (
      typeof value === 'string' &&
      value.trim() !== '' &&
      Number.isFinite(Number(value))
    ) {
      return Number(value) as T;
    }
    return value as T;
  });
};

export type FormSelectionValue = number | Task;
