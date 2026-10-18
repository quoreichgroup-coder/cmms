import { apiUrl } from '../config';
import { normalizeStorageUrls } from './storageUrl';
import { getApiErrorMessage } from './apiError';

type Options = RequestInit & { raw?: boolean; headers?: HeadersInit };

const REFRESH_URL = `${apiUrl}auth/refresh`;

let refreshPromise: Promise<boolean> | null = null;

function clearTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function performRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return false;
  }
  try {
    const response = await fetch(REFRESH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) {
      clearTokens();
      return false;
    }
    const data = await response.json();
    if (!data?.accessToken) {
      clearTokens();
      return false;
    }
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    return true;
  } catch {
    clearTokens();
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

function isRefreshRequest(url: string): boolean {
  const normalizedUrl = url.replace(/\/+$/, '');
  return (
    normalizedUrl.endsWith('/auth/refresh') ||
    normalizedUrl.endsWith('/auth/oauth/exchange')
  );
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
  const response = await fetch(url, { headers: authHeader(false), ...options });
  if (!response.ok) {
    if (response.status === 401 && !retried && !isRefreshRequest(url)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return doFetch<T>(url, options, true);
      }
    }
    if (response.status === 409) {
      if (onConflictError) onConflictError();
      throw new Error('conflict_error');
    }
    let responseText = '';
    try {
      responseText = await response.text();
    } catch {
      responseText = '';
    }
    let body: unknown;
    if (responseText) {
      try {
        body = JSON.parse(responseText);
      } catch {
        body = responseText;
      }
    }
    const err = new Error(`Request failed (${response.status})`);
    (err as any).status = response.status;
    (err as any).responseBody = body;
    throw err;
  }
  if (options?.raw) return response as unknown as Promise<T>;
  const body = await response.json();
  return normalizeStorageUrls(body) as T;
}

function api<T>(url: string, options: Options): Promise<T> {
  return doFetch<T>(url, options, false);
}

function get<T>(url, options?: Options) {
  return api<T>(apiUrl + url, options);
}

function post<T>(url, data, options?: Options, isNotJson?: boolean) {
  return api<T>(apiUrl + url, {
    ...options,
    method: 'POST',
    body: isNotJson ? data : JSON.stringify(data)
  });
}

function patch<T>(url, data, options?: Options) {
  return api<T>(apiUrl + url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

function deletes<T>(url, options?: Options) {
  return api<T>(apiUrl + url, { ...options, method: 'DELETE' });
}

export function authHeader(publicRoute: boolean): HeadersInit {
  // return authorization header with jwt token
  let accessToken = localStorage.getItem('accessToken');

  if (!publicRoute && accessToken) {
    return {
      Authorization: 'Bearer ' + accessToken,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  } else {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  }
}

export const getErrorMessage = (
  error: any,
  defaultMessage: string = 'An error occurred'
): string => getApiErrorMessage(error, defaultMessage);

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

export default { get, patch, post, deletes };
