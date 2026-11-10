const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

test('the QPM brand typeface Montserrat is bundled locally and used by all themes', () => {
  const html = read('public/index.html');
  const entry = read('src/index.tsx');
  const themes = [
    'src/theme/schemes/PureLightTheme.ts',
    'src/theme/schemes/GreyGooseTheme.ts',
    'src/theme/schemes/PurpleFlowTheme.ts'
  ].map(read);

  // The visual identity charter forbids loading fonts from an external CDN at runtime.
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  for (const weight of ['400', '500', '600', '700']) {
    assert.match(entry, new RegExp(`import '@fontsource/montserrat/${weight}\\.css';`));
  }
  assert.match(html, /<meta name="theme-color" content="#0062DB" \/>/);
  for (const theme of themes) {
    assert.match(theme, /"Montserrat", "Inter"/);
    assert.match(theme, /h4: \{\s*fontWeight: 700,\s*fontSize: 20/);
  }
});
