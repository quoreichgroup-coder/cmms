const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const actionsPath = path.join(
  __dirname,
  '../src/content/own/WorkOrders/Calendar/Actions.tsx'
);
const source = fs.readFileSync(actionsPath, 'utf8');

test('calendar view labels are compact on phones and visible from tablet widths', () => {
  assert.match(source, /display:\s*\{\s*xs:\s*'none',\s*sm:\s*'inline'\s*\}/);
});

test('calendar view controls retain localized accessible names when labels are hidden', () => {
  assert.match(source, /aria-label=\{t\(viewOption\.label\)\}/);
  assert.match(source, /aria-label=\{t\('calendar_view'\)\}/);
});

test('calendar navigation and view controls meet mobile touch target size', () => {
  assert.match(source, /minHeight:\s*\{\s*xs:\s*48,\s*sm:\s*40\s*\}/);
  assert.match(source, /minWidth:\s*\{\s*xs:\s*48,\s*sm:\s*40\s*\}/);
  assert.match(source, /minWidth:\s*\{\s*xs:\s*48,\s*sm:\s*'auto'\s*\}/);
});
