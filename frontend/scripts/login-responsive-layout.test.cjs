const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const login = fs.readFileSync(
  path.join(__dirname, '../src/content/pages/Auth/Login/LoginJWT.tsx'),
  'utf8'
);

test('login recovery link remains intact when mobile controls wrap', () => {
  assert.match(login, /flexWrap:\s*\{\s*xs:\s*'wrap',\s*md:\s*'nowrap'\s*\}/);
  assert.match(login, /rowGap:\s*0\.5/);
  assert.match(login, /whiteSpace:\s*'nowrap'/);
  assert.match(login, /ml:\s*\{\s*xs:\s*'auto',\s*md:\s*0\s*\}/);
});
