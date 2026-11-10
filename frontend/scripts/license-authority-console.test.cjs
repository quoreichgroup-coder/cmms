const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

// Licence console served by license-authority (plain ES modules, no build step).
const root = path.resolve(__dirname, '../../license-authority/src/main/resources/static');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const load = (file) => import(pathToFileURL(path.join(root, file)).href);

test('renewal preview extends from the current expiry, or from today once expired', async () => {
  const { renewalPreview, addMonths } = await load('console/format.js');
  const now = new Date('2026-11-10T12:00:00Z');
  assert.equal(renewalPreview('2027-03-15T00:00:00Z', 12, now).toISOString(), '2028-03-15T00:00:00.000Z');
  assert.equal(renewalPreview('2026-01-01T00:00:00Z', 12, now).toISOString(), '2027-11-10T12:00:00.000Z');
  // Same end-of-month rule as the server (ZonedDateTime.plusMonths).
  assert.equal(addMonths(new Date('2027-01-31T00:00:00Z'), 1).toISOString(), '2027-02-28T00:00:00.000Z');
  assert.equal(addMonths(new Date('2028-01-31T00:00:00Z'), 1).toISOString(), '2028-02-29T00:00:00.000Z');
});

test('expiry hints, entitlement differences and history wording', async () => {
  const { expiryHint, entitlementDiff, sameSet, describeEvent, actorLabel } = await load('console/format.js');
  const now = new Date('2026-11-10T12:00:00Z');
  assert.equal(expiryHint('2026-11-20T12:00:00Z', now), 'Expire dans 10 jours');
  assert.equal(expiryHint('2026-11-09T12:00:00Z', now), 'Expirée depuis 1 jour');
  assert.equal(expiryHint(null, now), 'Sans expiration');
  assert.deepEqual(entitlementDiff(['A', 'B'], ['B', 'C']), { added: ['C'], removed: ['A'] });
  assert.equal(sameSet(['A', 'B'], ['B', 'A']), true);
  assert.equal(describeEvent({ type: 'LICENSE_SUSPENDED', details: { reason: 'Facture impayée' } }), 'Motif : Facture impayée');
  assert.equal(actorLabel('api-token'), 'API opérateur');
  assert.equal(actorLabel('sales@quoreich.bf'), 'sales@quoreich.bf');
});

test('API errors are shown in French', async () => {
  const { translateError } = await load('console/api.js');
  assert.match(translateError('Invalid e-mail or password'), /bloqué 15 minutes/);
  assert.match(translateError('The password must contain at least 12 characters'), /12 caractères/);
  assert.equal(translateError('Unknown entitlements: FOO'), 'Droits inconnus : FOO');
});

test('console code never parses server data as HTML and works under the strict CSP', () => {
  for (const file of ['console/app.js', 'console/pages.js', 'console/dom.js', 'console/api.js']) {
    const source = read(file);
    assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/, `${file} builds DOM as text`);
    assert.doesNotMatch(source, /\bstyle:\s*['"{]/, `${file} sets no inline style attributes (style-src 'self')`);
    // Native append() prints null as "null" and arrays as "[object …]": pages go through fill()/add().
    if (file !== 'console/dom.js') assert.doesNotMatch(source, /\.append\(/, `${file} uses fill()/add()`);
  }
  const html = read('index.html');
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/, 'no inline script');
  assert.doesNotMatch(html, /<style|style="/, 'no inline style');
  assert.match(html, /<script type="module" src="console\/app\.js"><\/script>/);
});

test('every state-changing call carries the CSRF header and stays same-origin', () => {
  const source = read('console/api.js');
  assert.match(source, /'X-QPM-Console': '1'/);
  assert.match(source, /credentials: 'same-origin'/);
  assert.match(source, /fetch\(`\/console-api\$\{path\}`/);
});

test('fonts are bundled with the console, not loaded from a CDN', () => {
  const css = read('console/console.css');
  assert.doesNotMatch(css, /https?:\/\//);
  for (const weight of [400, 500, 600, 700]) {
    assert.ok(fs.existsSync(path.join(root, `fonts/montserrat-latin-${weight}-normal.woff2`)));
  }
});
