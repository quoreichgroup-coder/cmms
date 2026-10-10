const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadApi(fetchImpl) {
  const moduleExports = {};
  const errorExports = {};
  const errorSource = ts.transpileModule(
    fs.readFileSync('src/utils/apiError.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }
  ).outputText;
  vm.runInNewContext(errorSource, {
    exports: errorExports,
    require: () => ({ __esModule: true, default: { language: 'fr' } })
  });
  const source = ts.transpileModule(
    fs.readFileSync('src/utils/api.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }
  ).outputText;
  vm.runInNewContext(source, {
    exports: moduleExports,
    fetch: fetchImpl,
    localStorage: { getItem: () => 'test-token', setItem() {}, removeItem() {} },
    require(id) {
      if (id === '../config') return { apiUrl: 'https://cmms.example/api/' };
      if (id === './storageUrl') return { normalizeStorageUrls: (value) => value };
      if (id === './apiError') return errorExports;
      return require(id);
    }
  });
  return moduleExports;
}

function response(status, body, contentType = 'application/json') {
  return {
    ok: false,
    status,
    headers: { get: () => contentType },
    text: async () => body
  };
}

test('preserves a structured backend error and its HTTP status', async () => {
  const api = loadApi(async () => response(500, JSON.stringify({ success: false, message: 'Analytics query failed' })));
  await assert.rejects(api.default.post('analytics/work-orders/complete/overview', {}), (error) => {
    assert.equal(error.status, 500);
    assert.deepEqual(JSON.parse(JSON.stringify(error.responseBody)), {
      success: false,
      message: 'Analytics query failed'
    });
    assert.equal(api.getErrorMessage(error), 'Analytics query failed');
    return true;
  });
});

test('uses the status instead of displaying an HTML proxy response', async () => {
  const api = loadApi(async () => response(502, '<html><body>upstream unavailable</body></html>', 'text/html'));
  await assert.rejects(api.default.post('analytics/assets/time-cost', {}), (error) => {
    assert.equal(error.status, 502);
    assert.equal(api.getErrorMessage(error), 'Le serveur est temporairement indisponible (HTTP 502).');
    return true;
  });
});

test('uses the status for an empty or JSON null response body', async () => {
  for (const body of ['', 'null']) {
    const api = loadApi(async () => response(503, body));
    await assert.rejects(api.default.post('analytics/work-orders/incomplete/overview', {}), (error) => {
      assert.equal(error.status, 503);
      assert.equal(api.getErrorMessage(error), 'Le serveur est temporairement indisponible (HTTP 503).');
      return true;
    });
  }
});
