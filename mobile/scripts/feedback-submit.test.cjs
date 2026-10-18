const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

test('feedback submission is synchronously coalesced and keeps its API payload', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/FeedbackScreen.tsx'),
    'utf8'
  );

  assert.match(source, /submitLockRef\.current = createAsyncActionLock\(\)/);
  assert.match(source, /return submitLock\(async \(\) => \{/);
  assert.match(source, /api\.post\('reviews\/feedback', \{ value \}\)/);
  assert.match(source, /if \(!value\) return;/);
  assert.match(source, /setSubmitting\(false\);/);
  assert.match(source, /label=\{t\('feedback_placeholder'\)\}/);
  assert.doesNotMatch(source, /placeholder=\{t\('feedback_placeholder'\)\}/);
});

test('feedback form remains reachable with the keyboard and uses the primary mobile target', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/FeedbackScreen.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /<ScrollView[\s\S]*?keyboardShouldPersistTaps="handled"/
  );
  assert.match(source, /keyboardDismissMode=\{Platform\.OS/);
  assert.match(source, /minHeight:\s*qpmLayoutTokens\.touchTarget\.prominent/);
  assert.match(source, /accessibilityState=\{\{[\s\S]*?busy: submitting/);
});
