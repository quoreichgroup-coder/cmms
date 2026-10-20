const SAFE_TRANSPORT_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ERR_NETWORK'
]);

export interface SafeErrorDetails {
  code?: string;
  status?: number;
}

/** Return only transport metadata; never expose messages, request config or bodies. */
export const getSafeErrorDetails = (error: unknown): SafeErrorDetails => {
  if (!error || typeof error !== 'object') return {};

  const candidate = error as {
    code?: unknown;
    response?: { status?: unknown };
  };
  const details: SafeErrorDetails = {};

  if (
    typeof candidate.code === 'string' &&
    SAFE_TRANSPORT_CODES.has(candidate.code)
  ) {
    details.code = candidate.code;
  }

  const status = candidate.response?.status;
  if (
    typeof status === 'number' &&
    Number.isInteger(status) &&
    status >= 100 &&
    status <= 599
  ) {
    details.status = status;
  }

  return details;
};

/** Keep noisy request diagnostics out of production and redact sensitive fields in dev. */
export const logSafeError = (context: string, error: unknown): void => {
  if (process.env.NODE_ENV !== 'development') return;
  const details = getSafeErrorDetails(error);
  if (Object.keys(details).length > 0) console.error(context, details);
  else console.error(context);
};
