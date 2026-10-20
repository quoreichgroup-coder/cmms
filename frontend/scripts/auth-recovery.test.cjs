const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const source = fs.readFileSync('src/utils/authRecovery.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const authRecovery = {};
vm.runInNewContext(compiled, { exports: authRecovery });

test('auth recovery backs off and caps unattended retries', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 20].map(authRecovery.getAuthRecoveryDelayMs),
    [5000, 10000, 20000, 40000, 60000, 60000, 60000]
  );
});

test('auth recovery retries temporary failures but not authorization denials', () => {
  for (const status of [408, 429, 500, 502, 503]) {
    assert.equal(authRecovery.shouldRetryAuthRecovery({ status }), true);
  }
  for (const status of [400, 401, 403, 404]) {
    assert.equal(authRecovery.shouldRetryAuthRecovery({ status }), false);
  }
  assert.equal(
    authRecovery.shouldRetryAuthRecovery({ name: 'RequestTimeoutError' }),
    true
  );
  assert.equal(
    authRecovery.shouldRetryAuthRecovery(new TypeError('offline')),
    true
  );
  assert.equal(
    authRecovery.shouldRetryAuthRecovery(new Error('invalid token')),
    false
  );
});

test('Web auth initialization schedules recovery only when credentials remain', () => {
  const auth = fs.readFileSync('src/contexts/JWTAuthContext.tsx', 'utf8');
  assert.match(auth, /hasStoredCredentials && shouldRetryAuthRecovery\(err\)/);
  assert.match(auth, /if \(retryAuthRecovery\) scheduleAuthRecovery\(\)/);
  assert.match(auth, /if \(navigator\.onLine\) void getInfosRef\.current\(\)/);
});
