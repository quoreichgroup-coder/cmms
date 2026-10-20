const AUTH_RECOVERY_BASE_DELAY_MS = 5000;
const AUTH_RECOVERY_MAX_DELAY_MS = 60000;

export const getAuthRecoveryDelayMs = (attempt: number): number =>
  Math.min(
    AUTH_RECOVERY_BASE_DELAY_MS * 2 ** Math.max(0, attempt),
    AUTH_RECOVERY_MAX_DELAY_MS
  );

export const shouldRetryAuthRecovery = (error: unknown): boolean => {
  const candidate = error as { status?: unknown; name?: unknown } | null;
  const status = Number(candidate?.status);
  if (Number.isFinite(status) && status > 0) {
    return status === 408 || status === 429 || status >= 500;
  }

  return (
    candidate?.name === 'TypeError' || candidate?.name === 'RequestTimeoutError'
  );
};
