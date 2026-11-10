// Pages of the licence console. Every value from the server is inserted as text (see dom.js).
import { api } from './api.js';
import { h, clear, fill, add, field, openDialog, toast } from './dom.js';
import {
  STATE_LABELS, EVENT_LABELS, ROLE_LABELS, formatDate, formatDateTime, expiryHint, renewalPreview,
  entitlementDiff, sameSet, plural, describeEvent, actorLabel, businessDateToInstant
} from './format.js';
import { session, isAdmin, entitlementLabel, navigate, refresh, signOut } from './app.js';

const chip = (state) => h('span', { class: `chip ${state}`, text: STATE_LABELS[state] || state });
const pageHead = (title, subtitle, ...actions) => h('div', { class: 'page-head' },
  h('div', {}, h('h1', { text: title }), subtitle ? h('p', { class: 'muted', text: subtitle }) : null),
  actions.length ? h('div', { class: 'actions left' }, ...actions) : null);
const cell = (label, ...content) => h('td', { 'data-label': label }, ...content);
const input = (props) => h('input', props);

function licenseRow(license, { showCustomer = true, compact = false } = {}) {
  return h('tr', { class: 'clickable', tabindex: '0', onclick: () => navigate(`#/licenses/${license.id}`),
    onkeydown: (event) => { if (event.key === 'Enter') navigate(`#/licenses/${license.id}`); } },
    showCustomer ? cell('Client', h('strong', { text: license.customerName })) : null,
    cell('Plan', license.planName || '—'),
    cell('État', chip(license.state)),
    cell('Échéance', h('div', { text: license.licenseType === 'PERPETUAL' ? 'Perpétuelle' : formatDate(license.expiresAt) }),
      license.expiresAt ? h('small', { class: 'muted', text: expiryHint(license.expiresAt) }) : null),
    compact ? null : cell('Places', `${license.seatsFull} complètes · ${license.seatsLight} légères`),
    compact ? null : cell('Installations', String(license.installations)));
}

function licenseTable(licenses, options = {}) {
  if (!licenses.length) return h('p', { class: 'empty', text: options.empty || 'Aucune licence.' });
  return h('table', { class: 'responsive' },
    h('thead', {}, h('tr', {}, options.showCustomer === false ? null : h('th', { text: 'Client' }),
      h('th', { text: 'Plan' }), h('th', { text: 'État' }), h('th', { text: 'Échéance' }),
      options.compact ? null : h('th', { text: 'Places' }), options.compact ? null : h('th', { text: 'Installations' }))),
    h('tbody', {}, licenses.map((license) => licenseRow(license, options))));
}

// ------------------------------------------------------------------ dashboard

async function dashboard(main) {
  const data = await api('/dashboard');
  const s = data.byState;
  const kpi = (value, label, kind, href) => h('a', { class: `kpi ${kind || ''}`, href },
    h('div', { class: 'value', text: String(value) }), h('div', { class: 'label', text: label }));
  fill(main, 
    pageHead('Tableau de bord', `Bonjour ${session.me.displayName}.`,
      h('a', { class: 'button primary', href: '#/licenses/new', text: 'Nouvelle licence' })),
    h('div', { class: 'kpis' },
      kpi(s.ACTIVE + s.EXPIRING, 'Licences en cours', 'primary', '#/licenses'),
      kpi(s.EXPIRING, 'À renouveler (60 jours)', 'warning', '#/licenses?state=EXPIRING'),
      kpi(s.EXPIRED, 'Expirées', 'danger', '#/licenses?state=EXPIRED'),
      kpi(s.SUSPENDED, 'Suspendues', '', '#/licenses?state=SUSPENDED'),
      kpi(data.customers, 'Clients', '', '#/customers'),
      kpi(`${data.seatsFull} / ${data.seatsLight}`, 'Places vendues (complètes / légères)', '', '#/licenses')),
    h('div', { class: 'grid-2' },
      h('section', { class: 'card' }, h('h2', { text: 'Renouvellements à traiter' }),
        h('p', { class: 'muted', text: 'Licences qui expirent dans les 60 jours ou déjà expirées. À l’expiration, l’instance du client repasse aux limites gratuites.' }),
        licenseTable(data.renewals, { compact: true, empty: 'Aucun renouvellement à traiter.' })),
      h('section', { class: 'card' }, h('h2', { text: 'Licences jamais installées' }),
        h('p', { class: 'muted', text: 'Clé émise mais pas encore activée sur une instance QPM.' }),
        licenseTable(data.withoutInstallation, { compact: true, empty: 'Toutes les licences en cours sont installées.' }))));
}

// ------------------------------------------------------------------ customers

function customerForm(customer = {}) {
  const fields = [
    ['name', 'Nom du client *', { required: true, maxlength: 240 }],
    ['legalName', 'Raison sociale', { maxlength: 240 }],
    ['country', 'Pays', { maxlength: 80 }], ['city', 'Ville', { maxlength: 120 }],
    ['contactName', 'Contact', { maxlength: 160 }], ['contactEmail', 'E-mail du contact', { type: 'email', maxlength: 254 }],
    ['contactPhone', 'Téléphone', { type: 'tel', maxlength: 40 }]
  ];
  return h('div', {},
    h('div', { class: 'form-grid' }, fields.map(([name, label, props]) =>
      field(label, input({ name, value: customer[name] || '', ...props })))),
    field('Notes', h('textarea', { name: 'notes', maxlength: 4000, text: customer.notes || '' })));
}

const customerPayload = (form) => Object.fromEntries(['name', 'legalName', 'country', 'city', 'contactName',
  'contactEmail', 'contactPhone', 'notes'].map((key) => [key, form.get(key) || null]));

async function editCustomer(customer) {
  return openDialog({
    title: customer ? 'Modifier le client' : 'Nouveau client', wide: true, body: customerForm(customer || { country: 'Burkina Faso' }),
    onSubmit: (form) => customer
      ? api(`/customers/${customer.id}`, { method: 'PUT', body: customerPayload(form) })
      : api('/customers', { method: 'POST', body: customerPayload(form) })
  });
}

async function customers(main) {
  const search = input({ type: 'search', placeholder: 'Rechercher un client, un contact, une ville…', 'aria-label': 'Rechercher' });
  const results = h('div', {});
  const load = async () => {
    const list = await api(`/customers?q=${encodeURIComponent(search.value)}`);
    fill(results, list.length ? h('table', { class: 'responsive' },
      h('thead', {}, h('tr', {}, ['Client', 'Contact', 'Ville', 'Licences en cours', 'Prochaine échéance'].map((t) => h('th', { text: t })))),
      h('tbody', {}, list.map((customer) => h('tr', { class: 'clickable', tabindex: '0',
        onclick: () => navigate(`#/customers/${customer.id}`),
        onkeydown: (event) => { if (event.key === 'Enter') navigate(`#/customers/${customer.id}`); } },
      cell('Client', h('strong', { text: customer.name }), customer.legalName ? h('div', { class: 'muted', text: customer.legalName }) : null),
      cell('Contact', customer.contactName || '—', customer.contactEmail ? h('div', { class: 'muted', text: customer.contactEmail }) : null),
      cell('Ville', [customer.city, customer.country].filter(Boolean).join(', ') || '—'),
      cell('Licences en cours', String(customer.activeLicenses)),
      cell('Prochaine échéance', formatDate(customer.nextExpiry))))))
      : h('p', { class: 'empty', text: search.value ? 'Aucun client ne correspond.' : 'Aucun client. Créez le premier.' }));
  };
  let timer;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => load().catch((e) => toast(e.message, 'error')), 250); });
  fill(main, pageHead('Clients', 'Entreprises abonnées à QPM.',
    h('button', { type: 'button', class: 'primary', text: 'Nouveau client', onclick: async () => {
      const created = await editCustomer(null);
      if (created) navigate(`#/customers/${created.id}`);
    } })), h('section', { class: 'card' }, h('div', { class: 'toolbar' }, search), results));
  await load();
}

async function customerDetail(main, [id]) {
  const customer = await api(`/customers/${id}`);
  const fact = (label, value) => [h('dt', { text: label }), h('dd', { text: value || '—' })];
  fill(main, 
    pageHead(customer.name, customer.legalName,
      h('button', { type: 'button', class: 'secondary', text: 'Modifier', onclick: async () => {
        if (await editCustomer(customer)) { toast('Client enregistré'); refresh(); }
      } }),
      h('a', { class: 'button primary', href: `#/licenses/new?customer=${customer.id}`, text: 'Nouvelle licence' })),
    h('div', { class: 'grid-2' },
      h('section', { class: 'card' }, h('h2', { text: 'Coordonnées' }), h('dl', { class: 'facts' },
        fact('Pays', customer.country), fact('Ville', customer.city), fact('Contact', customer.contactName),
        fact('E-mail', customer.contactEmail), fact('Téléphone', customer.contactPhone),
        fact('Créé le', formatDate(customer.createdAt)), fact('Créé par', customer.createdBy))),
      h('section', { class: 'card' }, h('h2', { text: 'Notes' }),
        h('p', { class: customer.notes ? '' : 'muted', text: customer.notes || 'Aucune note.' }))),
    h('section', { class: 'card' }, h('h2', { text: 'Licences' }),
      licenseTable(customer.licenses, { showCustomer: false, empty: 'Aucune licence pour ce client.' })));
}

// ------------------------------------------------------------------ licences

async function licenses(main, _args, params) {
  const state = params.get('state') || '';
  const list = await api(`/licenses${state ? `?state=${state}` : ''}`);
  const filter = h('select', { 'aria-label': 'Filtrer par état', onchange: (event) =>
    navigate(event.target.value ? `#/licenses?state=${event.target.value}` : '#/licenses') },
  h('option', { value: '', text: 'Tous les états' }),
  Object.entries(STATE_LABELS).map(([value, label]) => h('option', { value, text: label, selected: value === state })));
  fill(main, pageHead('Licences', plural(list.length, 'licence'),
    h('a', { class: 'button primary', href: '#/licenses/new', text: 'Nouvelle licence' })),
  h('section', { class: 'card' }, h('div', { class: 'toolbar' }, filter), licenseTable(list)));
}

/** Entitlement checkboxes grouped by module; `editable` false shows them read-only (sales). */
function entitlementPicker(selected, { editable, onChange } = {}) {
  const chosen = new Set(selected);
  const container = h('div', { class: 'modules' });
  for (const module of session.catalog.modules) {
    const boxes = module.entitlements.map((item) => {
      const box = input({ type: 'checkbox', value: item.code, checked: chosen.has(item.code), disabled: !editable });
      box.addEventListener('change', () => {
        if (box.checked) chosen.add(item.code); else chosen.delete(item.code);
        onChange?.([...chosen]);
      });
      return h('label', { class: `check ${item.warning ? 'warning' : ''}` }, box,
        h('span', {}, item.label, h('small', { text: item.description })));
    });
    const count = module.entitlements.filter((item) => chosen.has(item.code)).length;
    add(container, h('div', { class: 'module' },
      h('h3', {}, module.label, h('span', { class: 'chip neutral', text: `${count}/${module.entitlements.length}` })), boxes));
  }
  return container;
}

async function newLicense(main, _args, params) {
  const customersList = await api('/customers');
  const plans = session.catalog.plans;
  const state = {
    customerId: params.get('customer') || '', plan: plans[0] || null, entitlements: [...(plans[0]?.entitlements || [])],
    seatsFull: plans[0]?.seatsFull ?? 0, seatsLight: plans[0]?.seatsLight ?? 0, duration: plans[0]?.durationMonths || 12,
    startDate: new Date().toISOString().slice(0, 10), step: 0
  };
  const steps = ['Client', 'Plan et droits', 'Places et durée', 'Vérification'];
  const content = h('div', {});
  const stepper = h('ol', { class: 'steps', 'aria-label': 'Étapes' });

  const render = () => {
    fill(stepper, steps.map((label, index) => h('li', {
      class: index < state.step ? 'done' : '', 'aria-current': index === state.step ? 'step' : null, text: `${index + 1}. ${label}` })));
    clear(content);
    if (state.step === 0) {
      const select = h('select', { required: true }, h('option', { value: '', text: 'Choisir un client…' }),
        customersList.map((customer) => h('option', { value: customer.id, text: customer.name, selected: customer.id === state.customerId })));
      select.addEventListener('change', () => { state.customerId = select.value; });
      add(content, field('Client', select),
        h('button', { type: 'button', class: 'link', text: '+ Créer un nouveau client', onclick: async () => {
          const created = await editCustomer(null);
          if (created) { customersList.push(created); state.customerId = created.id; render(); }
        } }));
    } else if (state.step === 1) {
      const diff = entitlementDiff(state.plan?.entitlements || [], state.entitlements);
      add(content, h('div', { class: 'plans', role: 'group', 'aria-label': 'Plans' }, plans.map((plan) => h('button', {
        type: 'button', class: 'plan-option', 'aria-pressed': String(plan.code === state.plan?.code), onclick: () => {
          Object.assign(state, { plan, entitlements: [...plan.entitlements], seatsFull: plan.seatsFull,
            seatsLight: plan.seatsLight, duration: plan.durationMonths || 12 });
          render();
        } }, h('strong', { text: plan.name }), h('span', { class: 'muted', text: plan.description || '' }),
      h('div', { class: 'hint', text: `${plan.entitlements.length} droits · ${plan.seatsFull} / ${plan.seatsLight} places` })))),
      isAdmin() ? null : h('p', { class: 'notice info', text: 'Les droits suivent le plan choisi. Un administrateur peut les ajuster.' }),
      diff.added.length || diff.removed.length ? h('p', { class: 'notice warning', text:
        `Écart avec le plan : ${diff.added.length ? `+ ${diff.added.map(entitlementLabel).join(', ')}` : ''}${diff.added.length && diff.removed.length ? ' · ' : ''}${diff.removed.length ? `− ${diff.removed.map(entitlementLabel).join(', ')}` : ''}` }) : null,
      state.entitlements.includes('UNLIMITED_USERS') ? h('p', { class: 'notice danger', text:
        'Utilisateurs illimités : le contrôle des places vendues est désactivé chez le client.' }) : null,
      entitlementPicker(state.entitlements, { editable: isAdmin(), onChange: (next) => { state.entitlements = next; render(); } }));
    } else if (state.step === 2) {
      const full = input({ type: 'number', min: 0, value: state.seatsFull, required: true });
      const light = input({ type: 'number', min: 0, value: state.seatsLight, required: true });
      const start = input({ type: 'date', value: state.startDate, required: true });
      const perpetual = state.plan?.licenseType === 'PERPETUAL';
      const duration = h('select', {}, [12, 24, 36, 6, 3, 1].map((months) =>
        h('option', { value: months, text: plural(months, 'mois', 'mois'), selected: months === Number(state.duration) })));
      const preview = h('p', { class: 'notice info' });
      const update = () => {
        Object.assign(state, { seatsFull: Number(full.value), seatsLight: Number(light.value), startDate: start.value,
          duration: Number(duration.value) });
        preview.textContent = perpetual ? 'Licence perpétuelle : sans échéance.'
          : `Échéance : ${formatDate(renewalPreview(null, state.duration, new Date(`${state.startDate}T00:00:00Z`)))} (heure de Ouagadougou)`;
      };
      [full, light, start, duration].forEach((element) => element.addEventListener('input', update));
      add(content, h('div', { class: 'form-grid' },
        field('Places complètes', full, 'Techniciens, responsables : utilisateurs payants.'),
        field('Places légères', light, 'Demandeurs, consultation.'),
        field('Début', start), perpetual ? null : field('Durée', duration)), preview);
      update();
    } else {
      const customer = customersList.find((item) => item.id === state.customerId);
      const fact = (label, value) => [h('dt', { text: label }), h('dd', { text: value })];
      add(content, h('dl', { class: 'facts' },
        fact('Client', customer?.name || '—'), fact('Plan', state.plan?.name || '—'),
        fact('Droits', `${state.entitlements.length} (${sameSet(state.entitlements, state.plan?.entitlements || []) ? 'conformes au plan' : 'ajustés'})`),
        fact('Places', `${state.seatsFull} complètes · ${state.seatsLight} légères`),
        fact('Période', state.plan?.licenseType === 'PERPETUAL' ? `Perpétuelle, à partir du ${formatDate(state.startDate)}`
          : `${formatDate(state.startDate)} → ${formatDate(renewalPreview(null, state.duration, new Date(`${state.startDate}T00:00:00Z`)))}`)),
      h('p', { class: 'notice warning', text: 'La clé ne sera affichée qu’une seule fois. Préparez-vous à la transmettre au client par un canal sûr.' }));
    }
  };

  const back = h('button', { type: 'button', class: 'secondary', text: 'Précédent', onclick: () => { state.step -= 1; render(); sync(); } });
  const next = h('button', { type: 'button', class: 'primary', text: 'Suivant' });
  const sync = () => {
    back.hidden = state.step === 0;
    next.textContent = state.step === steps.length - 1 ? 'Émettre la licence' : 'Suivant';
  };
  next.addEventListener('click', async () => {
    if (state.step === 0 && !state.customerId) return toast('Choisissez un client.', 'error');
    if (state.step === 1 && !state.plan) return toast('Choisissez un plan.', 'error');
    if (state.step === 2 && (state.seatsFull < 0 || state.seatsLight < 0)) return toast('Places invalides.', 'error');
    if (state.step < steps.length - 1) { state.step += 1; render(); sync(); return; }
    next.disabled = true;
    try {
      const issued = await api('/licenses', { method: 'POST', body: {
        customerId: state.customerId, planCode: state.plan.code, startsAt: businessDateToInstant(state.startDate),
        durationMonths: state.duration, seatsFull: state.seatsFull, seatsLight: state.seatsLight,
        entitlements: sameSet(state.entitlements, state.plan.entitlements) ? null : state.entitlements } });
      showIssuedKey(main, issued);
    } catch (failure) {
      toast(failure.message, 'error');
      next.disabled = false;
    }
  });
  fill(main, pageHead('Nouvelle licence', 'Émise depuis un plan du catalogue.'),
    h('section', { class: 'card' }, stepper, content, h('div', { class: 'actions' }, back, next)));
  render();
  sync();
}

function showIssuedKey(main, issued) {
  const copy = h('button', { type: 'button', class: 'secondary', text: 'Copier la clé', onclick: async () => {
    try { await navigator.clipboard.writeText(issued.licenseKey); copy.textContent = 'Copiée'; } catch { toast('Copie impossible : sélectionnez la clé.', 'error'); }
  } });
  fill(main, pageHead('Licence émise', 'Transmettez cette clé au client : elle n’est pas conservée.'),
    h('section', { class: 'card' },
      h('p', { class: 'notice warning', text: 'Cette clé ne sera plus jamais affichée. Copiez-la maintenant.' }),
      h('div', { class: 'key-box' }, h('code', { class: 'mono', text: issued.licenseKey }), copy),
      h('p', { class: 'muted', text: 'Le client la saisit dans QPM : Paramètres > Licence.' }),
      h('div', { class: 'actions left' }, h('a', { class: 'button primary', href: `#/licenses/${issued.id}`, text: 'Voir la licence' }))));
}

async function licenseDetail(main, [id]) {
  const license = await api(`/licenses/${id}`);
  const live = license.status === 'ACTIVE';
  const fact = (label, value) => [h('dt', { text: label }), h('dd', {}, value || '—')];
  const act = async (promise, message) => { await promise; toast(message); refresh(); };

  const actions = [];
  if (live && license.licenseType === 'SUBSCRIPTION') actions.push(h('button', { type: 'button', class: 'primary', text: 'Renouveler',
    onclick: () => renewDialog(license) }));
  if (live) actions.push(h('button', { type: 'button', class: 'secondary', text: 'Places', onclick: () => seatsDialog(license) }));
  if (live && isAdmin()) {
    actions.push(h('button', { type: 'button', class: 'secondary', text: 'Droits', onclick: () => entitlementsDialog(license) }));
    actions.push(license.state === 'SUSPENDED'
      ? h('button', { type: 'button', class: 'secondary', text: 'Reprendre', onclick: () =>
        act(api(`/licenses/${id}/resume`, { method: 'POST', body: {} }), 'Licence reprise') })
      : h('button', { type: 'button', class: 'secondary', text: 'Suspendre', onclick: () => reasonDialog(license, 'suspend') }));
    actions.push(h('button', { type: 'button', class: 'danger', text: 'Révoquer', onclick: () => reasonDialog(license, 'revoke') }));
  }

  const byModule = session.catalog.modules.map((module) => ({ module,
    items: module.entitlements.filter((item) => license.entitlements.includes(item.code)) })).filter(({ items }) => items.length);

  fill(main, 
    pageHead(license.customerName, `${license.planName || 'Licence'} · clé …${license.keyHint}`, ...actions),
    license.state === 'SUSPENDED' ? h('p', { class: 'notice warning', text: `Suspendue : ${license.suspensionReason || ''}. L’instance du client ne peut plus renouveler son bail.` }) : null,
    license.catalogVersion < 2 ? h('p', { class: 'notice info', text: 'Licence antérieure au catalogue : QPM garde tous les nouveaux modules actifs pour ce client. Appliquez un plan (Droits) pour la faire entrer dans le catalogue.' }) : null,
    license.entitlements.includes('UNLIMITED_USERS') ? h('p', { class: 'notice danger', text: 'Utilisateurs illimités : les places vendues ne sont pas contrôlées.' }) : null,
    h('div', { class: 'grid-2' },
      h('section', { class: 'card' }, h('h2', { text: 'Licence' }), h('dl', { class: 'facts' },
        fact('État', chip(license.state)),
        fact('Client', license.customerId ? h('a', { href: `#/customers/${license.customerId}`, text: license.customerName }) : license.customerName),
        fact('Type', license.licenseType === 'PERPETUAL' ? 'Perpétuelle' : 'Abonnement'),
        fact('Début', formatDate(license.startsAt)),
        fact('Échéance', license.expiresAt ? `${formatDate(license.expiresAt)} · ${expiryHint(license.expiresAt)}` : 'Sans expiration'),
        fact('Places', `${license.seatsFull} complètes · ${license.seatsLight} légères`),
        fact('Dernier bail', formatDateTime(license.lastLeaseAt)))),
      h('section', { class: 'card' }, h('h2', { text: 'Installations' }),
        license.installationsList.length ? h('table', {}, h('tbody', {}, license.installationsList.map((item) => h('tr', {},
          h('td', {}, h('strong', { text: item.environment === 'PRODUCTION' ? 'Production' : 'Préproduction' }),
            h('div', { class: 'muted mono', text: item.fingerprint })),
          h('td', {}, item.deactivatedAt ? h('span', { class: 'chip neutral', text: `Désactivée le ${formatDate(item.deactivatedAt)}` })
            : h('span', { class: 'chip ACTIVE', text: `Active depuis le ${formatDate(item.activatedAt)}` })),
          h('td', {}, !item.deactivatedAt && isAdmin() ? h('button', { type: 'button', class: 'secondary', text: 'Désactiver',
            onclick: async () => {
              const confirmed = await openDialog({ title: 'Désactiver l’installation', danger: true, submitLabel: 'Désactiver',
                body: h('p', { text: 'L’instance devra être réactivée avec la clé. Utilisez-le lors d’un changement de serveur.' }),
                onSubmit: () => api(`/installations/${item.id}/deactivate`, { method: 'POST', body: {} }) });
              if (confirmed) { toast('Installation désactivée'); refresh(); }
            } }) : null)))))
          : h('p', { class: 'empty', text: 'Jamais activée. Le client saisit la clé dans QPM : Paramètres > Licence.' }))),
    h('section', { class: 'card' }, h('h2', { text: `Droits (${license.entitlements.length})` }),
      byModule.length ? h('div', { class: 'modules' }, byModule.map(({ module, items }) => h('div', { class: 'module' },
        h('h3', { text: module.label }), items.map((item) => h('div', { class: 'check', text: item.label })))))
        : h('p', { class: 'empty', text: 'Aucun droit.' })),
    h('section', { class: 'card' }, h('h2', { text: 'Historique' }),
      license.events.length ? h('ol', { class: 'timeline' }, license.events.map((event) => h('li', {},
        h('strong', { text: EVENT_LABELS[event.type] || event.type }),
        h('div', { text: describeEvent(event, entitlementLabel) }),
        h('div', { class: 'when', text: `${formatDateTime(event.at)} · ${actorLabel(event.actor)}` }))))
        : h('p', { class: 'empty', text: 'Aucun événement.' })));
}

async function renewDialog(license) {
  const months = h('select', { name: 'months' }, [12, 24, 36, 6, 3, 1].map((value) => h('option', { value, text: plural(value, 'mois', 'mois') })));
  const preview = h('p', { class: 'notice info' });
  const update = () => { preview.textContent = `Nouvelle échéance : ${formatDate(renewalPreview(license.expiresAt, Number(months.value)))}`; };
  months.addEventListener('change', update);
  update();
  const done = await openDialog({ title: 'Renouveler la licence', submitLabel: 'Renouveler',
    body: h('div', {}, h('p', { class: 'muted', text: 'À partir de l’échéance actuelle, ou d’aujourd’hui si elle est passée.' }),
      field('Durée', months), preview),
    onSubmit: (form) => api(`/licenses/${license.id}/renew`, { method: 'POST', body: { months: Number(form.get('months')) } }) });
  if (done) { toast('Licence renouvelée. Le client l’actualise depuis QPM : Paramètres > Licence.'); refresh(); }
}

async function seatsDialog(license) {
  const done = await openDialog({ title: 'Modifier les places', body: h('div', { class: 'form-grid' },
    field('Places complètes', input({ type: 'number', name: 'seatsFull', min: 0, value: license.seatsFull, required: true })),
    field('Places légères', input({ type: 'number', name: 'seatsLight', min: 0, value: license.seatsLight, required: true }))),
  onSubmit: (form) => api(`/licenses/${license.id}/seats`, { method: 'POST',
    body: { seatsFull: Number(form.get('seatsFull')), seatsLight: Number(form.get('seatsLight')) } }) });
  if (done) { toast('Places enregistrées. Elles s’appliquent au prochain renouvellement du bail.'); refresh(); }
}

async function entitlementsDialog(license) {
  let selected = [...license.entitlements];
  const plan = h('select', { name: 'plan' }, h('option', { value: '', text: 'Droits personnalisés' }),
    session.catalog.plans.map((item) => h('option', { value: item.code, text: `Appliquer le plan ${item.name}`, selected: item.code === license.planCode })));
  const pickerHost = h('div', {});
  const drawPicker = () => fill(pickerHost, entitlementPicker(selected, { editable: true, onChange: (next) => { selected = next; } }));
  plan.addEventListener('change', () => {
    const chosen = session.catalog.plans.find((item) => item.code === plan.value);
    if (chosen) { selected = [...chosen.entitlements]; drawPicker(); }
  });
  drawPicker();
  const done = await openDialog({ title: 'Droits de la licence', wide: true, body: h('div', {}, field('Plan', plan), pickerHost),
    onSubmit: () => api(`/licenses/${license.id}/entitlements`, { method: 'POST',
      body: { planCode: plan.value || null, entitlements: selected } }) });
  if (done) { toast('Droits enregistrés'); refresh(); }
}

async function reasonDialog(license, action) {
  const revoke = action === 'revoke';
  const done = await openDialog({ title: revoke ? 'Révoquer la licence' : 'Suspendre la licence', danger: true,
    submitLabel: revoke ? 'Révoquer définitivement' : 'Suspendre',
    body: h('div', {}, h('p', { class: `notice ${revoke ? 'danger' : 'warning'}`, text: revoke
      ? 'Définitif : la clé ne pourra plus jamais être activée.'
      : 'Réversible : l’instance du client ne pourra plus renouveler son bail jusqu’à la reprise.' }),
    field('Motif', h('textarea', { name: 'reason', required: true, maxlength: 500 }))),
    onSubmit: (form) => api(`/licenses/${license.id}/${action}`, { method: 'POST', body: { reason: form.get('reason') } }) });
  if (done) { toast(revoke ? 'Licence révoquée' : 'Licence suspendue'); refresh(); }
}

// ------------------------------------------------------------------ plans (administrators)

async function planDialog(plan) {
  let selected = [...(plan?.entitlements || [])];
  const type = h('select', { name: 'licenseType' }, h('option', { value: 'SUBSCRIPTION', text: 'Abonnement', selected: plan?.licenseType !== 'PERPETUAL' }),
    h('option', { value: 'PERPETUAL', text: 'Perpétuelle', selected: plan?.licenseType === 'PERPETUAL' }));
  const body = h('div', {}, h('div', { class: 'form-grid' },
    field('Code', input({ name: 'code', value: plan?.code || '', required: true, pattern: '[A-Z][A-Z0-9_]{1,39}', readonly: Boolean(plan) }), 'Majuscules, chiffres et _'),
    field('Nom', input({ name: 'name', value: plan?.name || '', required: true, maxlength: 120 })),
    field('Type', type),
    field('Durée (mois)', input({ type: 'number', name: 'durationMonths', min: 1, max: 120, value: plan?.durationMonths || 12 })),
    field('Places complètes', input({ type: 'number', name: 'seatsFull', min: 0, value: plan?.seatsFull ?? 5, required: true })),
    field('Places légères', input({ type: 'number', name: 'seatsLight', min: 0, value: plan?.seatsLight ?? 10, required: true })),
    field('Ordre d’affichage', input({ type: 'number', name: 'sortOrder', value: plan?.sortOrder ?? 100 }))),
  field('Description', input({ name: 'description', value: plan?.description || '', maxlength: 500 })),
  h('label', { class: 'check' }, input({ type: 'checkbox', name: 'active', checked: plan ? plan.active : true }),
    h('span', { text: 'Commercialisé (proposé à l’émission)' })),
  entitlementPicker(selected, { editable: true, onChange: (next) => { selected = next; } }));
  return openDialog({ title: plan ? `Plan ${plan.name}` : 'Nouveau plan', wide: true, body,
    onSubmit: (form) => {
      const payload = { code: form.get('code'), name: form.get('name'), description: form.get('description') || null,
        licenseType: form.get('licenseType'), durationMonths: Number(form.get('durationMonths')) || null,
        seatsFull: Number(form.get('seatsFull')), seatsLight: Number(form.get('seatsLight')),
        entitlements: selected, active: form.get('active') === 'on', sortOrder: Number(form.get('sortOrder')) || 100 };
      return plan ? api(`/plans/${plan.code}`, { method: 'PUT', body: payload }) : api('/plans', { method: 'POST', body: payload });
    } });
}

async function plans(main) {
  const list = await api('/plans');
  fill(main, pageHead('Plans', 'Catalogue commercial : droits et places par défaut. Les licences existantes ne changent pas quand un plan est modifié.',
    h('button', { type: 'button', class: 'primary', text: 'Nouveau plan', onclick: async () => {
      if (await planDialog(null)) { session.catalog = await api('/catalog'); toast('Plan créé'); refresh(); }
    } })),
  h('div', { class: 'plans' }, list.map((plan) => h('section', { class: 'card' },
    h('h2', {}, plan.name, ' ', plan.active ? null : h('span', { class: 'chip neutral', text: 'Non commercialisé' })),
    h('p', { class: 'muted', text: plan.description || '' }),
    h('p', { text: `${plan.entitlements.length} droits · ${plan.seatsFull} / ${plan.seatsLight} places · ${plan.licenseType === 'PERPETUAL' ? 'perpétuelle' : `${plan.durationMonths} mois`}` }),
    h('button', { type: 'button', class: 'secondary', text: 'Modifier', onclick: async () => {
      if (await planDialog(plan)) { session.catalog = await api('/catalog'); toast('Plan enregistré'); refresh(); }
    } })))));
}

// ------------------------------------------------------------------ accounts (administrators)

async function users(main) {
  const list = await api('/users');
  const createAccount = async () => {
    const done = await openDialog({ title: 'Nouveau compte', body: h('div', {},
      field('Nom', input({ name: 'displayName', required: true, maxlength: 160 })),
      field('E-mail', input({ type: 'email', name: 'email', required: true })),
      field('Rôle', h('select', { name: 'role' }, h('option', { value: 'SALES', text: 'Commercial' }), h('option', { value: 'ADMIN', text: 'Administrateur' }))),
      field('Mot de passe initial', input({ type: 'password', name: 'password', required: true, minlength: 12, autocomplete: 'new-password' }),
        '12 caractères minimum. À transmettre en personne ; la vérification en deux étapes sera demandée à la première connexion.')),
    onSubmit: (form) => api('/users', { method: 'POST', body: Object.fromEntries(form) }) });
    if (done) { toast('Compte créé'); refresh(); }
  };
  const accountActions = (account) => {
    const self = account.id === session.me.id;
    return h('div', { class: 'actions left' },
      self ? h('span', { class: 'muted', text: 'Vous' }) : [
        h('button', { type: 'button', class: 'secondary', text: account.role === 'ADMIN' ? 'Passer commercial' : 'Passer administrateur',
          onclick: async () => { await api(`/users/${account.id}`, { method: 'PATCH', body: { role: account.role === 'ADMIN' ? 'SALES' : 'ADMIN' } })
            .then(() => { toast('Rôle modifié'); refresh(); }, (e) => toast(e.message, 'error')); } }),
        h('button', { type: 'button', class: 'secondary', text: account.active ? 'Désactiver' : 'Réactiver',
          onclick: async () => { await api(`/users/${account.id}`, { method: 'PATCH', body: { active: !account.active } })
            .then(() => { toast('Compte mis à jour'); refresh(); }, (e) => toast(e.message, 'error')); } }),
        h('button', { type: 'button', class: 'secondary', text: 'Réinitialiser la 2FA', onclick: async () => {
          const done = await openDialog({ title: 'Réinitialiser la vérification en deux étapes', submitLabel: 'Réinitialiser',
            body: h('p', { text: `${account.displayName} enregistrera une nouvelle application à sa prochaine connexion (téléphone perdu ou changé).` }),
            onSubmit: () => api(`/users/${account.id}/reset-second-factor`, { method: 'POST', body: {} }) });
          if (done) { toast('Vérification réinitialisée'); refresh(); }
        } }),
        h('button', { type: 'button', class: 'secondary', text: 'Nouveau mot de passe', onclick: async () => {
          const done = await openDialog({ title: `Mot de passe de ${account.displayName}`, body:
            field('Nouveau mot de passe', input({ type: 'password', name: 'password', required: true, minlength: 12, autocomplete: 'new-password' })),
          onSubmit: (form) => api(`/users/${account.id}/reset-password`, { method: 'POST', body: { password: form.get('password') } }) });
          if (done) toast('Mot de passe modifié ; les sessions de ce compte sont fermées.');
        } })]);
  };
  fill(main, pageHead('Comptes', 'Accès à la console : administrateurs et commerciaux.',
    h('button', { type: 'button', class: 'primary', text: 'Nouveau compte', onclick: createAccount })),
  h('section', { class: 'card' }, h('table', { class: 'responsive' },
    h('thead', {}, h('tr', {}, ['Nom', 'Rôle', 'Sécurité', 'Dernière connexion', 'Actions'].map((t) => h('th', { text: t })))),
    h('tbody', {}, list.map((account) => h('tr', {},
      cell('Nom', h('strong', { text: account.displayName }), h('div', { class: 'muted', text: account.email })),
      cell('Rôle', ROLE_LABELS[account.role] || account.role),
      cell('Sécurité', account.active ? null : h('span', { class: 'chip neutral', text: 'Désactivé' }), ' ',
        account.locked ? h('span', { class: 'chip EXPIRED', text: 'Bloqué 15 min' }) : null, ' ',
        h('span', { class: `chip ${account.totpEnabled ? 'ACTIVE' : 'EXPIRING'}`, text: account.totpEnabled ? '2FA active' : '2FA à configurer' })),
      cell('Dernière connexion', formatDateTime(account.lastLoginAt)),
      cell('Actions', accountActions(account))))))));
}

async function account(main) {
  const current = input({ type: 'password', name: 'currentPassword', required: true, autocomplete: 'current-password' });
  const next = input({ type: 'password', name: 'newPassword', required: true, minlength: 12, autocomplete: 'new-password' });
  const form = h('form', {}, field('Mot de passe actuel', current), field('Nouveau mot de passe', next, '12 caractères minimum.'),
    h('div', { class: 'actions left' }, h('button', { type: 'submit', class: 'primary', text: 'Changer le mot de passe' })));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/auth/password', { method: 'POST', body: { currentPassword: current.value, newPassword: next.value } });
      toast('Mot de passe changé. Reconnectez-vous.');
      signOut();
    } catch (failure) {
      toast(failure.message, 'error');
    }
  });
  fill(main, pageHead('Mon compte', `${session.me.email} · ${ROLE_LABELS[session.me.role]}`),
    h('section', { class: 'card' }, h('h2', { text: 'Mot de passe' }), form),
    h('section', { class: 'card' }, h('h2', { text: 'Vérification en deux étapes' }),
      h('p', { class: 'muted', text: 'Active. En cas de perte du téléphone, demandez à un administrateur de la réinitialiser.' })));
}

export const routes = [
  { pattern: /^\/$/, render: dashboard },
  { pattern: /^\/customers$/, render: customers },
  { pattern: /^\/customers\/([0-9a-f-]{36})$/, render: customerDetail },
  { pattern: /^\/licenses$/, render: licenses },
  { pattern: /^\/licenses\/new$/, render: newLicense },
  { pattern: /^\/licenses\/([0-9a-f-]{36})$/, render: licenseDetail },
  { pattern: /^\/plans$/, render: plans, admin: true },
  { pattern: /^\/users$/, render: users, admin: true },
  { pattern: /^\/account$/, render: account }
];
