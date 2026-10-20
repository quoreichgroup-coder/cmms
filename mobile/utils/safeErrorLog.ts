type ErrorWithHttpMetadata = {
  code?: unknown;
  response?: { status?: unknown };
};

const SAFE_ERROR_CODES = new Set([
  'ERR_NETWORK',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ERR_CANCELED',
  'ERR_BAD_REQUEST',
  'ERR_BAD_RESPONSE'
]);

/**
 * Return only non-sensitive transport metadata. Axios errors contain request
 * config and headers, including the QPM Bearer token, so never log the object.
 */
export function getSafeErrorDetails(error: unknown): {
  code?: string;
  status?: number;
} {
  if (typeof error !== 'object' || error === null) return {};

  const candidate = error as ErrorWithHttpMetadata;
  const details: { code?: string; status?: number } = {};
  if (
    typeof candidate.code === 'string' &&
    SAFE_ERROR_CODES.has(candidate.code)
  ) {
    details.code = candidate.code;
  }

  const status = candidate.response?.status;
  if (typeof status === 'number' && status >= 100 && status <= 599) {
    details.status = status;
  }

  return details;
}

export function logSafeError(context: string, error: unknown): void {
  if (__DEV__) console.warn(context, getSafeErrorDetails(error));
}
