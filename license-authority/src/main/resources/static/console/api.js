// HTTP client of the console: same-origin session cookie, CSRF header on every request, French errors.
const MESSAGES = {
  'Invalid e-mail or password': 'E-mail ou mot de passe incorrect (le compte est bloqué 15 minutes après 5 échecs).',
  'Invalid code': 'Code incorrect. Vérifiez l’heure de votre téléphone et saisissez le code affiché.',
  'Sign in again': 'Votre session a expiré. Reconnectez-vous.',
  'Sign in required': 'Votre session a expiré. Reconnectez-vous.',
  'Administrator access required': 'Action réservée aux administrateurs.',
  'Only an administrator can change the entitlements of a plan': 'Seul un administrateur peut modifier les droits d’un plan.',
  'A customer with this name already exists': 'Un client porte déjà ce nom.',
  'This e-mail already has an account': 'Un compte existe déjà pour cet e-mail.',
  'At least one active administrator is required': 'Il faut au moins un administrateur actif.',
  'You cannot remove your own administrator access': 'Vous ne pouvez pas retirer votre propre accès administrateur.',
  'Current password is incorrect': 'Mot de passe actuel incorrect.',
  'A reason is required': 'Indiquez un motif.',
  'This plan is no longer sold': 'Ce plan n’est plus commercialisé.'
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const translateError = (message) => {
  if (!message) return 'Une erreur est survenue.';
  if (MESSAGES[message]) return MESSAGES[message];
  if (message.startsWith('The password must contain')) return 'Le mot de passe doit contenir au moins 12 caractères.';
  if (message.startsWith('Unknown entitlements')) return `Droits inconnus : ${message.split(':').slice(1).join(':').trim()}`;
  return message;
};

export async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/console-api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'X-QPM-Console': '1', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (response.status === 401 && !path.startsWith('/auth/')) {
    window.dispatchEvent(new CustomEvent('console:signed-out'));
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) throw new ApiError(response.status, translateError(data?.message || (response.status === 403
    ? 'Administrator access required' : `Erreur ${response.status}`)));
  return data;
}
