import { normalizeApiUrl } from '../config';

type Translator = (key: string) => string;

/** Return the same localized validation error used when saving a server URL. */
export function getServerUrlValidationError(
  value: string | undefined,
  t: Translator
): string | null {
  if (!value?.trim()) return null;
  try {
    normalizeApiUrl(value, t);
    return null;
  } catch (error) {
    return error?.message || t('invalid_server_url_scheme');
  }
}
