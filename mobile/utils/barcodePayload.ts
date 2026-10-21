/**
 * Scanner APIs may emit an empty value while the camera session is starting.
 * Such a callback must not consume the one-shot scan guard or trigger a lookup.
 */
export const hasBarcodePayload = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
