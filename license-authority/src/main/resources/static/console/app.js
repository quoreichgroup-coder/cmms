// Licence console: sign-in (password + authenticator), shell, routing. Pages live in pages.js.
import { api } from './api.js';
import { h, clear, fill, add, field, toast } from './dom.js';
import { ROLE_LABELS } from './format.js';
import { routes } from './pages.js';

const app = document.getElementById('app');
export const session = { me: null, catalog: null };

export const isAdmin = () => session.me?.role === 'ADMIN';

/** Label of an entitlement code, from the catalogue the server sent. */
export const entitlementLabel = (code) => {
  for (const module of session.catalog?.modules || []) {
    const found = module.entitlements.find((item) => item.code === code);
    if (found) return found.label;
  }
  return code;
};

const brand = (large = false) => h('div', { class: 'brand-block' },
  h('div', { class: 'word' }, 'QUOREICH', h('span', { text: 'GROUP' })),
  h('div', { class: 'bar', 'aria-hidden': 'true' }),
  large ? null : h('div', { class: 'product', text: 'Console des licences QPM' }));

// ------------------------------------------------------------------ sign-in

function authLayout(...content) {
  fill(app, h('div', { class: 'auth' },
    h('section', { class: 'panel' },
      h('div', {}, h('div', { class: 'word' }, 'QUOREICH', h('span', { text: 'GROUP' })),
        h('div', { class: 'bar', 'aria-hidden': 'true' })),
      h('div', {},
        h('h1', { text: 'Console des licences QPM' }),
        h('p', { text: 'Gestion des clients, des abonnements et des licences de la plateforme QPM. Accès réservé à QUOREICH GROUP SARL.' })),
      h('small', { text: 'Intelligence Beyond Boundaries' })),
    h('section', { class: 'form-side' }, h('div', { class: 'card' }, ...content))));
}

function errorLine() {
  return h('p', { class: 'form-error', role: 'alert', hidden: true });
}

function showError(element, message) {
  element.textContent = message;
  element.hidden = !message;
}

function renderLogin() {
  const email = h('input', { type: 'email', name: 'email', autocomplete: 'username', required: true });
  const password = h('input', { type: 'password', name: 'password', autocomplete: 'current-password', required: true });
  const error = errorLine();
  const submit = h('button', { type: 'submit', class: 'primary', text: 'Continuer' });
  const form = h('form', {}, field('E-mail', email), field('Mot de passe', password), error,
    h('div', { class: 'actions' }, submit));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    showError(error, '');
    try {
      const result = await api('/auth/login', { method: 'POST', body: { email: email.value, password: password.value } });
      result.nextStep === 'TOTP' ? renderTotp() : renderEnrollment();
    } catch (failure) {
      showError(error, failure.message);
      password.value = '';
    } finally {
      submit.disabled = false;
    }
  });
  authLayout(h('h2', { text: 'Connexion' }), form);
  email.focus();
}

function codeForm(onCode, label = 'Valider') {
  const code = h('input', { name: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', pattern: '[0-9]{6}',
    maxlength: 6, required: true, placeholder: '123456' });
  const error = errorLine();
  const submit = h('button', { type: 'submit', class: 'primary', text: label });
  const form = h('form', {}, field('Code à 6 chiffres', code), error, h('div', { class: 'actions' },
    h('button', { type: 'button', class: 'secondary', text: 'Annuler', onclick: () => signOut() }), submit));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    showError(error, '');
    try {
      await onCode(code.value.trim());
      await start();
    } catch (failure) {
      showError(error, failure.message);
      code.value = '';
      if (failure.status === 401 && failure.message.includes('session')) renderLogin();
    } finally {
      submit.disabled = false;
    }
  });
  queueMicrotask(() => code.focus());
  return form;
}

function renderTotp() {
  authLayout(h('h2', { text: 'Vérification en deux étapes' }),
    h('p', { class: 'muted', text: 'Saisissez le code affiché par votre application d’authentification.' }),
    codeForm((code) => api('/auth/totp', { method: 'POST', body: { code } })));
}

async function renderEnrollment() {
  authLayout(h('p', { class: 'muted', text: 'Préparation…' }));
  let enrollment;
  try {
    enrollment = await api('/auth/enroll');
  } catch (failure) {
    toast(failure.message, 'error');
    renderLogin();
    return;
  }
  const grouped = enrollment.secret.match(/.{1,4}/g).join(' ');
  authLayout(h('h2', { text: 'Activer la vérification en deux étapes' }),
    h('p', { class: 'muted', text: 'Obligatoire pour tous les comptes de la console.' }),
    h('ol', { class: 'instructions' },
      h('li', { text: 'Installez une application d’authentification (Google Authenticator, Microsoft Authenticator, FreeOTP…).' }),
      h('li', { text: 'Ajoutez un compte avec la clé de configuration ci-dessous (ou ouvrez le lien sur votre téléphone).' }),
      h('li', { text: 'Saisissez le code à 6 chiffres affiché par l’application.' })),
    h('p', { class: 'secret', text: grouped }),
    h('p', {}, h('a', { href: enrollment.uri, text: 'Ouvrir dans l’application d’authentification' })),
    codeForm((code) => api('/auth/enroll', { method: 'POST', body: { code } }), 'Activer'));
}

export async function signOut() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    /* already signed out */
  }
  session.me = null;
  renderLogin();
}

// ------------------------------------------------------------------ shell

const NAV = [
  { path: '#/', label: 'Tableau de bord' },
  { path: '#/customers', label: 'Clients' },
  { path: '#/licenses', label: 'Licences' },
  { path: '#/plans', label: 'Plans', admin: true },
  { path: '#/users', label: 'Comptes', admin: true }
];

function shell() {
  const nav = h('nav', { class: 'menu', 'aria-label': 'Navigation principale' },
    NAV.filter((item) => !item.admin || isAdmin()).map((item) => h('a', { href: item.path, text: item.label })));
  const main = h('main', { id: 'main', tabindex: '-1' });
  fill(app, h('div', { class: 'shell' },
    h('aside', { class: 'sidebar' },
      h('a', { class: 'brand', href: '#/' }, brand()),
      nav,
      h('div', { class: 'account' },
        h('div', {}, h('strong', { text: session.me.displayName }),
          h('span', { class: 'muted', text: ROLE_LABELS[session.me.role] || session.me.role })),
        h('div', {},
          h('a', { href: '#/account', text: 'Mon compte' }), ' · ',
          h('button', { type: 'button', class: 'link', text: 'Se déconnecter', onclick: () => signOut() })))),
    main));
  return { nav, main };
}

let layout = null;

async function route() {
  if (!session.me) return;
  if (!layout || !document.body.contains(layout.main)) layout = shell();
  const hash = window.location.hash || '#/';
  const [path, query = ''] = hash.slice(1).split('?');
  const params = new URLSearchParams(query);
  for (const link of layout.nav.querySelectorAll('a')) {
    const target = link.getAttribute('href').slice(1);
    const current = target === '/' ? path === '/' : path.startsWith(target);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const match = routes.map((candidate) => ({ candidate, found: path.match(candidate.pattern) })).find(({ found }) => found);
  clear(layout.main);
  if (!match || (match.candidate.admin && !isAdmin())) {
    add(layout.main, h('h1', { text: 'Page introuvable' }), h('p', {}, h('a', { href: '#/', text: 'Retour au tableau de bord' })));
    return;
  }
  add(layout.main, h('p', { class: 'muted', text: 'Chargement…' }));
  try {
    await match.candidate.render(layout.main, match.found.slice(1), params);
  } catch (failure) {
    if (failure.status === 401) return;
    fill(layout.main, h('div', { class: 'notice danger', role: 'alert', text: failure.message }),
      h('button', { type: 'button', class: 'secondary', text: 'Réessayer', onclick: () => route() }));
  }
  layout.main.focus({ preventScroll: true });
}

export const navigate = (hash) => {
  if (window.location.hash === hash) route();
  else window.location.hash = hash;
};
export const refresh = () => route();

async function start() {
  try {
    const state = await api('/auth/state');
    if (state.stage === 'SIGNED_IN') {
      session.me = state.account;
      session.catalog = await api('/catalog');
      layout = null;
      route();
    } else if (state.stage === 'TOTP') renderTotp();
    else if (state.stage === 'ENROLL') renderEnrollment();
    else renderLogin();
  } catch (failure) {
    authLayout(h('div', { class: 'notice danger', role: 'alert', text: failure.message }),
      h('button', { type: 'button', class: 'secondary', text: 'Réessayer', onclick: () => start() }));
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('console:signed-out', () => {
  if (session.me) {
    session.me = null;
    toast('Votre session a expiré. Reconnectez-vous.', 'error');
    renderLogin();
  }
});
start();
