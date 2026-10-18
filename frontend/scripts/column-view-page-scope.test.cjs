const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const columnView = fs.readFileSync(
  'src/content/own/WorkOrders/ColumnView/index.tsx',
  'utf8'
);
const english = fs.readFileSync('src/i18n/translations/en.ts', 'utf8');
const french = fs.readFileSync('src/i18n/translations/fr.ts', 'utf8');

test('column counts explain that they represent only the displayed page', () => {
  assert.match(columnView, /pageCount > 1/);
  assert.match(columnView, /role="note"/);
  assert.match(columnView, /column_view_page_scope/);
  assert.match(english, /column_view_page_scope:/);
  assert.match(french, /column_view_page_scope:/);
});
