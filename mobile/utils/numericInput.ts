/** Normalize a field measurement to the dot-decimal format used by the API. */
export const normalizeNumericInput = (value: string): string => {
  const normalized = value.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  const isNegative = normalized.startsWith('-');
  const unsigned = normalized.replace(/-/g, '');
  const decimalIndex = unsigned.indexOf('.');
  const whole =
    decimalIndex === -1 ? unsigned : unsigned.slice(0, decimalIndex);
  const fraction =
    decimalIndex === -1
      ? ''
      : unsigned.slice(decimalIndex + 1).replace(/\./g, '');

  return `${isNegative ? '-' : ''}${whole}${
    decimalIndex === -1 ? '' : `.${fraction}`
  }`;
};

/** Normalize non-negative form numbers while accepting locale decimal commas. */
export const normalizeFormNumberInput = (value: string): string => {
  const normalized = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const decimalIndex = normalized.indexOf('.');
  return decimalIndex === -1
    ? normalized
    : `${normalized.slice(0, decimalIndex + 1)}${normalized
        .slice(decimalIndex + 1)
        .replace(/\./g, '')}`;
};

export const isCompleteNumericInput = (value: string): boolean =>
  value.trim() !== '' && Number.isFinite(Number(value));

export const getNumericFormErrors = (
  values: Record<string, unknown>,
  fieldNames: string[],
  message: string
): Record<string, string> => {
  const errors: Record<string, string> = {};
  fieldNames.forEach((name) => {
    const value = values[name];
    if (
      value !== '' &&
      value != null &&
      !isCompleteNumericInput(String(value))
    ) {
      errors[name] = message;
    }
  });
  return errors;
};

/** Send empty optional numeric inputs as JSON null instead of a false zero. */
export const normalizeNumericFormValues = <T extends Record<string, any>>(
  values: T,
  fieldNames: string[]
): T => {
  const normalized: Record<string, any> = { ...values };
  fieldNames.forEach((name) => {
    if (normalized[name] === '') normalized[name] = null;
  });
  return normalized as T;
};

export const toggleNumericSign = (value: string): string =>
  value.startsWith('-') ? value.slice(1) : `-${value}`;

/** Text fields may be intentionally cleared; numeric fields also persist an
 * empty value, while incomplete numeric tokens stay local until completed. */
export const shouldPersistTaskInput = (
  taskType: 'NUMBER' | 'METER' | 'TEXT',
  value: string
): boolean =>
  taskType === 'TEXT' || value.trim() === '' || isCompleteNumericInput(value);
