const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { findMissingKeys } = require('../../frontend/scripts/i18n-key-coverage.cjs');

const root = path.resolve(__dirname, '..');
const sourceDirs = ['screens', 'components', 'navigation', 'contexts', 'utils', 'hooks', 'slices', 'models']
  .map((dir) => path.join(root, dir))
  .filter((dir) => fs.existsSync(dir));

test('every literal t() key used by the mobile app exists in English and French', () => {
  const missing = findMissingKeys({
    sourceDirs,
    enFile: path.join(root, 'i18n/translations/en.ts'),
    frFile: path.join(root, 'i18n/translations/fr.ts'),
    ts,
    root
  });
  assert.deepEqual(
    missing.map((entry) => `${entry.locale} ${entry.key} (${entry.where})`),
    [],
    'Raw translation keys would be shown to users'
  );
});
