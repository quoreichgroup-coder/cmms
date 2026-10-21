const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

test('meter empty state uses its localized create hint', () => {
  const component = fs.readFileSync(
    path.join(__dirname, '../src/content/own/Meters/index.tsx'),
    'utf8'
  );
  const english = fs.readFileSync(
    path.join(__dirname, '../src/i18n/translations/en.ts'),
    'utf8'
  );
  const french = fs.readFileSync(
    path.join(__dirname, '../src/i18n/translations/fr.ts'),
    'utf8'
  );

  assert.match(component, /noRowsAction=\{t\('noRows\.meter\.action'\)\}/);
  assert.match(
    english,
    /'noRows\.meter\.action':\s*"Press the '\+' button to create a Meter"/
  );
  assert.match(
    french,
    /'noRows\.meter\.action':\s*"Appuyez sur le bouton '\+' pour créer un Compteur"/
  );
});
