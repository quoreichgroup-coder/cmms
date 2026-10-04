/**
 * Pick the most specific available language without making authentication
 * depend on optional company preferences being present.
 */
export function getPreferredLanguage(
  userLanguage?: string | null,
  companyLanguage?: string | null
): string {
  return (userLanguage?.trim() || companyLanguage?.trim() || 'en').toLowerCase();
}
