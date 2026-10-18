const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'screens/modals/SelectPartsModal.tsx'),
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

test('parts and sets selector distinguish empty search results from empty catalogs', () => {
  assert.equal((source.match(/ListEmptyComponent=/g) || []).length, 2);
  assert.match(
    source,
    /searchQuery\.trim\(\) \? t\('no_results'\) : t\('no_parts'\)/
  );
  assert.match(source, /t\('no_part_sets_available'\)/);
  assert.match(english, /no_part_sets_available: 'No sets of parts available'/);
  assert.match(
    french,
    /no_part_sets_available: 'Aucun jeu de pièces disponible'/
  );
});

test('failed refresh keeps cached choices visible and provides retry feedback', () => {
  assert.equal((source.match(/mode="banner"/g) || []).length, 2);
  assert.match(source, /loadError && partsMini\.length > 0/);
  assert.match(source, /loadError && multiParts\.length > 0/);
  assert.equal((source.match(/onRetry=\{onRetry\}/g) || []).length, 4);
});

test('empty failed loads and initial loads expose explicit retry and loading states', () => {
  assert.equal((source.match(/mode="error"/g) || []).length, 2);
  assert.equal((source.match(/mode="loading"/g) || []).length, 2);
  assert.match(source, /loadError && partsMini\.length === 0/);
  assert.match(source, /loadError && multiParts\.length === 0/);
});
