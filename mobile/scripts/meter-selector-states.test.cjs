const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'screens/modals/SelectMetersModal.tsx'),
  'utf8'
);
const english = fs.readFileSync(
  path.join(__dirname, '..', 'i18n/translations/en.ts'),
  'utf8'
);
const french = fs.readFileSync(
  path.join(__dirname, '..', 'i18n/translations/fr.ts'),
  'utf8'
);

test('meter selector distinguishes first-load failure from empty results', () => {
  assert.match(source, /loadError && !metersMini\.length/);
  assert.match(
    source,
    /mode="error"[\s\S]*?message=\{t\('meters_load_error'\)\}/
  );
  assert.match(
    source,
    /!loading && !loadError && filteredMeters\.length === 0/
  );
  assert.match(english, /meters_load_error:[\s\S]*Could not load meters/);
  assert.match(
    french,
    /meters_load_error:[\s\S]*Impossible de charger les compteurs/
  );
});

test('meter selector keeps cached options visible with retry feedback after refresh failure', () => {
  assert.match(source, /loadError && metersMini\.length > 0/);
  assert.match(
    source,
    /mode="banner"[\s\S]*?onRetry=\{\(\) => void loadMeters\(\)\}/
  );
  assert.match(source, /data=\{filteredMeters\}/);
  assert.doesNotMatch(source, /ListFooterComponent/);
});
