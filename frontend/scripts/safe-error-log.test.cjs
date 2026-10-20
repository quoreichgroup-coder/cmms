const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/safeErrorLog.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;

function loadLogger(nodeEnv = 'development') {
  const exports = {};
  const calls = [];
  vm.runInNewContext(source, {
    exports,
    process: { env: { NODE_ENV: nodeEnv } },
    console: { error: (...args) => calls.push(args) }
  });
  return { ...exports, calls };
}

test('safe diagnostics omit Axios messages, headers, request config and body', () => {
  const { logSafeError, calls } = loadLogger();
  const error = {
    message: 'request failed with secret payload',
    code: 'ERR_NETWORK',
    config: { headers: { Authorization: 'Bearer access-token-secret' } },
    response: {
      status: 503,
      data: { detail: 'internal database error and secret response' }
    }
  };

  logSafeError('Request failed', error);

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([['Request failed', { code: 'ERR_NETWORK', status: 503 }]])
  );
  assert.ok(!JSON.stringify(calls).includes('access-token-secret'));
  assert.ok(!JSON.stringify(calls).includes('secret response'));
});

test('unrecognized error fields and codes are not logged', () => {
  const { getSafeErrorDetails, logSafeError, calls } = loadLogger();

  assert.deepEqual(
    { ...getSafeErrorDetails({ code: 'CUSTOM_SECRET', message: 'hidden' }) },
    {}
  );
  logSafeError('Unknown error', { message: 'hidden' });
  assert.deepEqual(calls, [['Unknown error']]);
});

test('production does not write error details to the browser console', () => {
  const { logSafeError, calls } = loadLogger('production');
  logSafeError('Request failed', {
    code: 'ERR_NETWORK',
    response: { status: 503 }
  });

  assert.deepEqual(calls, []);
});

test('auth and API error handlers use the redacting logger', () => {
  for (const file of [
    'src/contexts/JWTAuthContext.tsx',
    'src/content/pages/Auth/Register/RegisterJWT.tsx',
    'src/content/own/components/form/CustomSelect2.tsx',
    'src/content/own/WorkOrders/Details/CommentsSection.tsx',
    'src/content/own/PreventiveMaintenance/MeterCallRegister.tsx'
  ]) {
    assert.match(fs.readFileSync(file, 'utf8'), /logSafeError\(/, file);
  }
});

test('service worker failures use the redacting logger', () => {
  const serviceWorker = fs.readFileSync('src/serviceWorker.ts', 'utf8');
  assert.match(serviceWorker, /import \{ logSafeError \}/);
  assert.match(
    serviceWorker,
    /logSafeError\('Service worker registration failed'/
  );
  assert.match(serviceWorker, /logSafeError\('Service worker cleanup failed'/);
  assert.doesNotMatch(serviceWorker, /console\.error\s*\(/);
});
