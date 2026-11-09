const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const ts = require('typescript');
const { findMissingKeys } = require('./i18n-key-coverage.cjs');

const root = path.resolve(__dirname, '..');

test('every literal t() key used by the web app exists in English and French', () => {
  const missing = findMissingKeys({
    sourceDirs: [path.join(root, 'src')],
    enFile: path.join(root, 'src/i18n/translations/en.ts'),
    frFile: path.join(root, 'src/i18n/translations/fr.ts'),
    ts,
    root
  });
  assert.deepEqual(
    missing.map((entry) => `${entry.locale} ${entry.key} (${entry.where})`),
    [],
    'Raw translation keys would be shown to users'
  );
});
