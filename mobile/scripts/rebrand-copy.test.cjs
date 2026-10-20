const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const translationsDir = path.join(__dirname, '../i18n/translations');

test('mobile feature copy uses QPM rather than the former product name', () => {
  const localeFiles = fs
    .readdirSync(translationsDir)
    .filter((file) => file.endsWith('.ts'));

  for (const file of localeFiles) {
    const source = fs.readFileSync(path.join(translationsDir, file), 'utf8');
    assert.doesNotMatch(
      source,
      /Atlas\p{L}*/iu,
      `${file} contains former product branding`
    );
  }
});
