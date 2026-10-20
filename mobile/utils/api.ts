import { getApiUrl } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import i18n from '../i18n/i18n';

type Options = RequestInit & { raw?: boolean; headers?: HeadersInit };

const REQUEST_TIMEOUT_MS = 30000;

export class RequestTimeoutError extends Error {
  readonly code = 'REQUEST_TIMEOUT';

  constructor() {
    super('request_timeout');
    this.name = 'RequestTimeoutError';
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', onAbort);
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

let refreshPromise: Promise<boolean> | null = null;
let lastRefreshFailureRetryable = false;

async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
}

async function performRefresh(): Promise<boolean> {
  lastRefreshFailureRetryable = false;
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) {
    return false;
  }
  let authorizationRejected = false;
  try {
    const currentApiUrl = await getApiUrl();
    const response = await fetchWithTimeout(currentApiUrl + 'auth/refresh', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) {
      // A temporary server/rate-limit response does not invalidate the user's
      // session. Only explicit authentication rejection proves the token bad.
      if (response.status === 401 || response.status === 403) {
        authorizationRejected = true;
        await clearTokens();
      } else {
        lastRefreshFailureRetryable =
          response.status === 408 || response.status === 429 || response.status >= 500;
      }
      return false;
    }
    let data: any;
    try {
      data = await response.json();
    } catch {
      lastRefreshFailureRetryable = true;
      return false;
    }
    if (!data?.accessToken) {
      await clearTokens();
      return false;
    }
    try {
      await AsyncStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
      }
    } catch {
      // Storage failures cannot be resolved by repeatedly calling the API.
      return false;
    }
    return true;
  } catch {
    // A transport failure is not proof that the refresh token is invalid.
    // Keep it so a later retry can restore the session when connectivity returns.
    lastRefreshFailureRetryable = !authorizationRejected;
    return false;
  }
}

export function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function canRetryRefreshAccessToken(): boolean {
  return lastRefreshFailureRetryable;
}

function isRefreshRequest(url: string): boolean {
  return url.replace(/\/+$/, '').endsWith('/auth/refresh');
}

let onApiError: ((error: unknown) => void) | null = null;

export function setApiErrorHandler(handler: (error: unknown) => void): () => void {
  onApiError = handler;
  return () => { if (onApiError === handler) onApiError = null; };
}

let onConflictError: (() => void) | null = null;

export function setConflictErrorHandler(handler: () => void): () => void {
  onConflictError = handler;
  return () => {
    onConflictError = null;
  };
}

async function doFetch<T>(
  url: string,
  options: Options,
  retried: boolean
): Promise<T> {
  const publicRequest = /\/(auth\/(signin|signup|refresh|reset-password)|instance-config)(\?|$)/.test(url);
  const headers = new Headers(await authHeader(publicRequest));
  new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
  if (publicRequest) headers.delete('Authorization');
  if (options?.body instanceof FormData) headers.delete('Content-Type');
  if (retried && headers.has('Authorization')) {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) headers.set('Authorization', 'Bearer ' + token);
  }
  const response = await fetchWithTimeout(url, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401 && !retried && !publicRequest && !isRefreshRequest(url)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return doFetch<T>(url, options, true);
      }
    }
    if (response.status === 409) {
      if (onConflictError) onConflictError();
      const error = new Error('conflict_error');
      (error as any).status = 409;
      throw error;
    }
    let body: any = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const err = new Error(JSON.stringify(body));
    (err as any).status = response.status;
    throw err;
  }
  if (options?.raw) return response as unknown as Promise<T>;
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function api<T>(url: string, options: Options): Promise<T> {
  try {
    return await doFetch<T>(url, options, false);
  } catch (error) {
    if (error?.name !== 'AbortError' && error?.status !== 401 && error?.status !== 409) onApiError?.(error);
    throw error;
  }
}

async function get<T>(url: string, options?: Options) {
  const currentApiUrl = await getApiUrl();
  return api<T>(currentApiUrl + url, options);
}

async function post<T>(
  url: string,
  data: object | any,
  options?: Options,
  withoutCompany?: boolean,
  isNotJson?: boolean
) {
  const currentApiUrl = await getApiUrl();
  return api<T>(currentApiUrl + url, {
    ...options,
    method: 'POST',
    body: isNotJson
      ? data
      : JSON.stringify(data)
  });
}

async function patch<T>(
  url: string,
  data: object,
  options?: Options,
  withoutCompany?: boolean
) {
  const currentApiUrl = await getApiUrl();
  return api<T>(currentApiUrl + url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

async function deletes<T>(url, options?: Options) {
  const currentApiUrl = await getApiUrl();
  return api<T>(currentApiUrl + url, { ...options, method: 'DELETE' });
}

export async function authHeader(publicRoute: boolean) {
  // return authorization header with jwt token
  let accessToken = await AsyncStorage.getItem('accessToken');
  const commonHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Platform': Platform.OS
  };
  if (!publicRoute && accessToken) {
    return {
      Authorization: 'Bearer ' + accessToken,
      ...commonHeaders
    };
  } else {
    return commonHeaders;
  }
}
export const getErrorMessage = (
  error: any,
  defaultMessage: string = 'An error occurred'
): string => {
  if (error?.code === 'REQUEST_TIMEOUT') {
    return i18n.t('request_timeout', { defaultValue: defaultMessage });
  }
  try {
    const parsed = JSON.parse(error.message);
    return parsed?.message ?? error.message ?? defaultMessage;
  } catch {
    return error.message ?? defaultMessage;
  }
};

export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  if (error instanceof TypeError) return true;
  if (error?.status === 502) return true;
  const message = String(error?.message ?? '').toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network error') ||
    message.includes('load failed') ||
    message.includes('connection refused') ||
    message.includes('err_connection_refused')
  );
};

export default { get, patch, post, deletes, getErrorMessage, isNetworkError };
