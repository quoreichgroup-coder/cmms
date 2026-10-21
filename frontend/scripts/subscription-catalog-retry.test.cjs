const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const source = readFileSync(
  path.join(__dirname, '../src/content/own/Settings/SubscriptionCatalog.tsx'),
  'utf8'
);

test('catalog load error exposes a retry that resets and repeats the request', () => {
  assert.match(
    source,
    /const retryLoad = \(\) => \{[\s\S]*?setFailed\(false\);[\s\S]*?setLoading\(true\);[\s\S]*?setLoadAttempt\(\(attempt\) => attempt \+ 1\);/
  );
  assert.match(source, /\}, \[isSuperAdmin, loadAttempt\]\);/);
  assert.match(
    source,
    /severity="error"[\s\S]*?action=\{[\s\S]*?onClick=\{retryLoad\}[\s\S]*?\{t\('retry'\)\}/
  );
});
