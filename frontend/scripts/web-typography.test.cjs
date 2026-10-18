const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

test('the global IBM Plex Sans typography is loaded and used by all QPM themes', () => {
  const html = read('public/index.html');
  const themes = [
    'src/theme/schemes/PureLightTheme.ts',
    'src/theme/schemes/GreyGooseTheme.ts',
    'src/theme/schemes/PurpleFlowTheme.ts'
  ].map(read);

  assert.match(
    html,
    /family=IBM\+Plex\+Sans:wght@400;500;600;700&display=swap/
  );
  assert.match(
    html,
    /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/
  );
  assert.match(
    html,
    /rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/
  );
  for (const theme of themes) {
    assert.match(theme, /"IBM Plex Sans", "Inter"/);
    assert.match(theme, /h4: \{\s*fontWeight: 700,\s*fontSize: 20/);
  }
});
