import { apiUrl } from '../config';

/**
 * Resolve signed storage links through the same public ingress as the web app.
 * The API signs the MinIO request and the ingress forwards /storage to MinIO,
 * so changing only the public origin keeps the signed path and query intact.
 */
export function normalizeStorageUrl(value: string): string {
  if (typeof window === 'undefined' || !value) return value;

  try {
    const appOrigin = window.location.origin;
    const apiOrigin = new URL(apiUrl, appOrigin).origin;
    if (apiOrigin !== appOrigin) return value;

    const storageUrl = new URL(value, appOrigin);
    if (!storageUrl.pathname.startsWith('/storage/')) return value;
    if (storageUrl.origin === appOrigin) return value;

    return `${appOrigin}${storageUrl.pathname}${storageUrl.search}${storageUrl.hash}`;
  } catch {
    return value;
  }
}

export function normalizeStorageUrls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeStorageUrls(item)) as unknown as T;
  }
  if (!value || typeof value !== 'object') return value;

  const normalized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    normalized[key] =
      (key === 'url' || key === 'thumbnailUrl') && typeof child === 'string'
        ? normalizeStorageUrl(child)
        : normalizeStorageUrls(child);
  }
  return normalized as T;
}
