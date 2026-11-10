// Pure helpers of the licence console (no DOM): dates in Ouagadougou time, licence states, renewal previews.
export const BUSINESS_TIME_ZONE = 'Africa/Ouagadougou';

export const STATE_LABELS = {
  ACTIVE: 'Active',
  EXPIRING: 'À renouveler',
  EXPIRED: 'Expirée',
  SUSPENDED: 'Suspendue',
  REVOKED: 'Révoquée'
};

export const EVENT_LABELS = {
  LICENSE_ISSUED: 'Licence émise',
  LICENSE_RENEWED: 'Licence renouvelée',
  LICENSE_SUSPENDED: 'Licence suspendue',
  LICENSE_RESUMED: 'Licence reprise',
  LICENSE_REVOKED: 'Licence révoquée',
  SEATS_CHANGED: 'Places modifiées',
  ENTITLEMENTS_CHANGED: 'Droits modifiés',
  INSTALLATION_DEACTIVATED: 'Installation désactivée'
};

export const ROLE_LABELS = { ADMIN: 'Administrateur', SALES: 'Commercial' };

const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: BUSINESS_TIME_ZONE, day: '2-digit', month: 'long', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: BUSINESS_TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

export const formatDate = (value) => (value ? dateFormat.format(new Date(value)) : '—');
export const formatDateTime = (value) => (value ? dateTimeFormat.format(new Date(value)) : '—');

/** Whole days from `now` to `value` (negative when past), or null. */
export const daysUntil = (value, now = new Date()) =>
  value ? Math.ceil((new Date(value).getTime() - now.getTime()) / 86_400_000) : null;

export const expiryHint = (value, now = new Date()) => {
  const days = daysUntil(value, now);
  if (days === null) return 'Sans expiration';
  if (days < 0) return `Expirée depuis ${-days} jour${-days > 1 ? 's' : ''}`;
  if (days === 0) return 'Expire aujourd’hui';
  return `Expire dans ${days} jour${days > 1 ? 's' : ''}`;
};

/**
 * Same rule as the server (ConsoleController.renew): from the current expiry, or from today when already
 * expired, plus `months` calendar months (end of month is clamped, e.g. 31 Jan + 1 month = 28/29 Feb).
 */
export const renewalPreview = (currentExpiry, months, now = new Date()) => {
  const base = currentExpiry && new Date(currentExpiry) > now ? new Date(currentExpiry) : new Date(now);
  return addMonths(base, months);
};

export const addMonths = (date, months) => {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
};

/** Differences between a plan and the entitlements chosen for a licence. */
export const entitlementDiff = (planEntitlements, selected) => {
  const plan = new Set(planEntitlements);
  const chosen = new Set(selected);
  return {
    added: [...chosen].filter((code) => !plan.has(code)).sort(),
    removed: [...plan].filter((code) => !chosen.has(code)).sort()
  };
};

export const sameSet = (a, b) => {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((value) => right.has(value));
};

export const plural = (count, singular, pluralForm = `${singular}s`) => `${count} ${count > 1 ? pluralForm : singular}`;

/** Readable version of an event's details for the history timeline. */
export const describeEvent = (event, entitlementLabel = (code) => code) => {
  const details = event.details || {};
  switch (event.type) {
    case 'LICENSE_ISSUED':
      return [details.plan ? `Plan ${details.plan}` : details.edition, details.seatsFull != null
        ? `${details.seatsFull} places complètes, ${details.seatsLight} légères` : null].filter(Boolean).join(' · ');
    case 'LICENSE_RENEWED':
      return details.expiresAt ? `Nouvelle échéance : ${formatDate(details.expiresAt)}` : '';
    case 'LICENSE_SUSPENDED':
    case 'LICENSE_REVOKED':
      return details.reason ? `Motif : ${details.reason}` : '';
    case 'SEATS_CHANGED':
      return `${details.seatsFull} places complètes, ${details.seatsLight} légères`;
    case 'ENTITLEMENTS_CHANGED':
      return [details.plan ? `Plan ${details.plan}` : null,
        Array.isArray(details.entitlements) ? `${details.entitlements.length} droits` : null].filter(Boolean).join(' · ');
    default:
      return '';
  }
};

export const actorLabel = (actor) => {
  if (!actor) return 'Système';
  if (actor === 'api-token') return 'API opérateur';
  if (actor === 'installation') return 'Installation QPM';
  return actor;
};

/** UTC instant for a yyyy-mm-dd date at midnight in Ouagadougou (UTC+0, no daylight saving). */
export const businessDateToInstant = (value) => (value ? new Date(`${value}T00:00:00Z`).toISOString() : null);
