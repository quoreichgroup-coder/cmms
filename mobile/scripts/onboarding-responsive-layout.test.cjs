const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const source = fs.readFileSync(
  path.resolve(__dirname, '../screens/OnboardingScreen.tsx'),
  'utf8'
);

test('onboarding offset stays on the selected slide when viewport width changes', () => {
  const { getOnboardingPageOffset } = mobileRuntime().load(
    'utils/onboardingLayout.ts'
  );

  assert.equal(getOnboardingPageOffset(2, 390, 5), 780);
  assert.equal(getOnboardingPageOffset(2, 600, 5), 1200);
  assert.equal(getOnboardingPageOffset(-1, 600, 5), 0);
  assert.equal(getOnboardingPageOffset(8, 600, 5), 2400);
  assert.equal(getOnboardingPageOffset(2, 0, 5), 0);
});

test('onboarding realigns the native pager only when the viewport width changes', () => {
  assert.match(source, /const layoutWidthRef = React\.useRef\(width\)/);
  assert.match(source, /if \(layoutWidthRef\.current === width\) return/);
  assert.match(
    source,
    /getOnboardingPageOffset\(page, width, slides\.length\)/
  );
  assert.match(source, /\}, \[page, width\]\)/);
});
