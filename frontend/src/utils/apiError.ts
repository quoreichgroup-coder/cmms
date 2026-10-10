import i18n from '../i18n/i18n';

type ApiError = {
  message?: unknown;
  status?: number;
  responseBody?: unknown;
};

const statusMessage = (status?: number): string => {
  const french = i18n.language?.toLowerCase().startsWith('fr');
  switch (status) {
    case 400:
      return french ? 'La requête est invalide (HTTP 400).' : 'The request is invalid (HTTP 400).';
    case 401:
      return french ? 'La session a expiré. Reconnectez-vous (HTTP 401).' : 'Your session has expired. Sign in again (HTTP 401).';
    case 403:
      return french ? 'Accès refusé (HTTP 403).' : 'Access denied (HTTP 403).';
    case 404:
      return french ? 'La ressource demandée est introuvable (HTTP 404).' : 'The requested resource was not found (HTTP 404).';
    case 409:
      return french ? 'Cette opération entre en conflit avec une autre modification (HTTP 409).' : 'This operation conflicts with another change (HTTP 409).';
    case 422:
      return french ? 'Les données envoyées ne sont pas valides (HTTP 422).' : 'The submitted data is invalid (HTTP 422).';
    case 500:
      return french ? 'Le serveur a rencontré une erreur (HTTP 500).' : 'The server encountered an error (HTTP 500).';
    case 502:
    case 503:
    case 504:
      return french ? `Le serveur est temporairement indisponible (HTTP ${status}).` : `The server is temporarily unavailable (HTTP ${status}).`;
    default:
      return status ? (french ? `La requête a échoué (HTTP ${status}).` : `The request failed (HTTP ${status}).`) : '';
  }
};

function meaningfulMessage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') return undefined;
    if (/^<!doctype html|^<html[\s>]/i.test(trimmed)) return undefined;
    try {
      return meaningfulMessage(JSON.parse(trimmed));
    } catch {
      return trimmed;
    }
  }
  if (value && typeof value === 'object') {
    const body = value as Record<string, unknown>;
    for (const key of ['message', 'error', 'detail', 'title']) {
      const message = meaningfulMessage(body[key]);
      if (message) return message;
    }
  }
  return undefined;
}

export function getApiErrorMessage(
  error: ApiError | string | null | undefined,
  defaultMessage = 'Une erreur est survenue.'
): string {
  const apiError: ApiError = typeof error === 'string' ? { message: error } : error || {};
  const bodyMessage = meaningfulMessage(apiError.responseBody);
  const errorMessage = meaningfulMessage(apiError.message);
  // `Error.message` often contains the serialized response. Do not display an
  // opaque `null`/HTML body or internal server details when the status is known.
  if (errorMessage && errorMessage !== '[object Object]') {
    const looksLikeHttpFallback = /^Request failed \(\d+\)$/.test(errorMessage);
    if (!looksLikeHttpFallback) return errorMessage;
  }
  return bodyMessage || statusMessage(apiError.status) || defaultMessage;
}
