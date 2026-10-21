/**
 * Normalize a saved vendor/customer website for opening outside the app.
 * Website fields accept plain domains and HTTP(S) URLs; never hand arbitrary
 * schemes such as javascript: or mailto: to the native URL handler.
 */
export function normalizeWebsiteUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('//')) return null;

  // A numeric suffix after a colon is a host port (example.com:8080), not a
  // URI scheme. Other explicit schemes are rejected unless HTTP(S).
  const scheme = trimmed
    .match(/^([a-z][a-z\d+.-]*):(?=\/|[^\d])/i)?.[1]
    ?.toLowerCase();
  if (scheme && scheme !== 'http' && scheme !== 'https') return null;

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
