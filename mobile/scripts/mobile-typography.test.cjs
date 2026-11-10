const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Montserrat ships with the app from a pinned local package', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.dependencies['@expo-google-fonts/montserrat'] ?? '', /^\d+\.\d+\.\d+$/);
  const fonts = read('theme/fonts.ts');
  for (const weight of ['400Regular', '500Medium', '600SemiBold', '700Bold']) {
    assert.match(fonts, new RegExp(`@expo-google-fonts/montserrat/${weight}`));
  }
  assert.doesNotMatch(fonts, /https?:\/\//, 'fonts must not be fetched at runtime');
});

test('the fonts are loaded before the first render and used by the Paper theme', () => {
  assert.match(read('hooks/useCachedResources.ts'), /\.\.\.qpmFontFiles/);
  assert.match(read('custom-theme.ts'), /fonts:\s*qpmFonts/);
});
