const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

const helpCenter = read('../src/content/own/HelpCenter/index.tsx');
const english = read('../src/i18n/translations/en.ts');
const french = read('../src/i18n/translations/fr.ts');

test('help center exposes one semantic page heading and announces result counts', () => {
  assert.match(helpCenter, /variant="h3"\s+component="h1"/);
  assert.match(helpCenter, /role="status"/);
  assert.match(helpCenter, /aria-live="polite"/);
  assert.match(helpCenter, /help_results_count_singular/);
  assert.match(helpCenter, /help_results_count_plural/);
});

test('help guide steps use ordered-list semantics', () => {
  assert.match(helpCenter, /component="ol"/);
  assert.match(helpCenter, /component="li"/);
});

test('result-count announcements are translated with singular and plural forms', () => {
  for (const locale of [english, french]) {
    assert.match(locale, /help_results_count_singular:/);
    assert.match(locale, /help_results_count_plural:/);
  }
});
