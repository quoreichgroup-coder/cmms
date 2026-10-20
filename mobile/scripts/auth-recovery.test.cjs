const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

test('Mobile auth recovery backs off and caps unattended retries', () => {
  const recovery = mobileRuntime().load('utils/authRecovery.ts');
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 20].map(recovery.getAuthRecoveryDelayMs),
    [5000, 10000, 20000, 40000, 60000, 60000, 60000]
  );
});

test('Mobile auth recovery retries transient errors but not authorization denials', () => {
  const recovery = mobileRuntime().load('utils/authRecovery.ts');
  for (const status of [408, 429, 500, 502, 503]) {
    assert.equal(recovery.shouldRetryAuthRecovery({ status }), true);
  }
  for (const status of [400, 401, 403, 404]) {
    assert.equal(recovery.shouldRetryAuthRecovery({ status }), false);
  }
  assert.equal(
    recovery.shouldRetryAuthRecovery({ name: 'RequestTimeoutError' }),
    true
  );
  assert.equal(
    recovery.shouldRetryAuthRecovery(new TypeError('offline')),
    true
  );
  assert.equal(
    recovery.shouldRetryAuthRecovery(new Error('invalid token')),
    false
  );
});

test('Mobile auth initialization schedules recovery only when credentials remain', () => {
  const auth = fs.readFileSync('contexts/AuthContext.tsx', 'utf8');
  assert.match(auth, /hasStoredCredentials && shouldRetryAuthRecovery\(err\)/);
  assert.match(auth, /if \(retryAuthRecovery\) scheduleAuthRecovery\(\)/);
  assert.match(auth, /AppState\.currentState === 'active'/);
});

test('transient session refresh failures show recovery instead of the login screen', () => {
  const auth = fs.readFileSync('contexts/AuthContext.tsx', 'utf8');
  const navigation = fs.readFileSync('navigation/index.tsx', 'utf8');
  const loading = fs.readFileSync('screens/auth/LoadingScreen.tsx', 'utf8');
  assert.match(auth, /type: 'AUTH_RECOVERY_PENDING'/);
  assert.match(
    auth,
    /if \(retryAuthRecovery\) \{\s*dispatch\(\{ type: 'AUTH_RECOVERY_PENDING' \}\)/
  );
  assert.match(navigation, /<LoadingScreen recovering=\{isRecoveringSession\}/);
  assert.match(loading, /auth_recovering_session/);
});
