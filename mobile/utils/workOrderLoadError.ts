export type WorkOrderLoadErrorKey =
  | 'work_orders_access_error'
  | 'work_orders_server_error'
  | 'work_orders_network_error'
  | 'work_orders_load_error';

/** Select a safe, localized category without exposing backend exception text. */
export function getWorkOrderLoadErrorKey(
  error: unknown
): WorkOrderLoadErrorKey {
  const value = error as { status?: number; code?: string; message?: string };
  const response = (value as { response?: { status?: number } } | null)
    ?.response;
  const status = Number(value?.status ?? response?.status);

  if (status === 401 || status === 403) return 'work_orders_access_error';
  if (status >= 500) return 'work_orders_server_error';

  const message = String(value?.message ?? '').toLowerCase();
  const code = String(value?.code ?? '').toLowerCase();
  if (
    code === 'request_timeout' ||
    code === 'err_network' ||
    code === 'econnrefused' ||
    code === 'econnreset' ||
    error instanceof TypeError ||
    status === 0 ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network error') ||
    message.includes('network request failed') ||
    message.includes('load failed') ||
    message.includes('connection refused') ||
    message.includes('connection reset') ||
    message.includes('err_connection_refused') ||
    message.includes('err_connection_reset')
  ) {
    return 'work_orders_network_error';
  }

  return 'work_orders_load_error';
}
