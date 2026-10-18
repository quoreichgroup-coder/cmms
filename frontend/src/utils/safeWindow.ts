const WEB_PROTOCOLS = new Set(['http:', 'https:']);

/** Return a normalized HTTP(S) URL, or null for unsupported/invalid values. */
export function getSafeHttpUrl(
  value: string | null | undefined,
  options: { assumeHttps?: boolean } = {}
): string | null {
  if (!value || typeof window === 'undefined') return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const hasExplicitScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmedValue);
  const candidate =
    options.assumeHttps && !hasExplicitScheme
      ? `https://${trimmedValue}`
      : trimmedValue;

  try {
    const destination = new URL(candidate, window.location.origin);
    if (
      !WEB_PROTOCOLS.has(destination.protocol) ||
      destination.username ||
      destination.password
    ) {
      return null;
    }
    return destination.href;
  } catch {
    return null;
  }
}

/** Open a validated link without giving the destination access to this tab. */
export function openSafeWindow(
  value: string,
  options: { allowMailto?: boolean; assumeHttps?: boolean } = {}
): void {
  if (!value || typeof window === 'undefined') return;

  const httpUrl = getSafeHttpUrl(value, options);
  let destination: URL;
  try {
    destination = new URL(httpUrl || '');
  } catch {
    if (!options.allowMailto) return;
    const trimmedValue = value.trim();
    try {
      destination = new URL(trimmedValue, window.location.origin);
    } catch {
      return;
    }
  }

  const isAllowedProtocol =
    !!httpUrl || (options.allowMailto && destination.protocol === 'mailto:');

  if (
    !isAllowedProtocol ||
    destination.username ||
    destination.password ||
    (destination.protocol === 'mailto:' && !destination.pathname.includes('@'))
  ) {
    return;
  }

  window.open(destination.href, '_blank', 'noopener,noreferrer');
}
