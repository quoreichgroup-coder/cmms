const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { configureStore } = require('@reduxjs/toolkit');

function loadLicenseSlice(api) {
  const source = ts.transpileModule(
    fs.readFileSync('src/slices/license.ts', 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true
      }
    }
  ).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(id) {
      if (id.endsWith('/api')) return { __esModule: true, default: api };
      if (id.endsWith('/redux'))
        return { revertAll: { type: 'test/revertAll' } };
      return require(id);
    }
  });
  return exports;
}

test('license state success records availability and entitlement data', async () => {
  const expected = {
    valid: true,
    entitlements: ['API_ACCESS'],
    expirationDate: null,
    planName: 'ENTERPRISE'
  };
  const api = { get: async () => expected };
  const slice = loadLicenseSlice(api);
  const store = configureStore({ reducer: slice.reducer });

  const request = store.dispatch(slice.getLicenseValidity());
  assert.equal(store.getState().requestStatus, 'loading');
  await request;

  assert.equal(store.getState().requestStatus, 'succeeded');
  assert.equal(store.getState().state.valid, true);
  assert.deepEqual(
    JSON.parse(JSON.stringify(store.getState().state.entitlements)),
    ['API_ACCESS']
  );
});

test('license state failure marks authority unavailable and remains retryable', async () => {
  let shouldFail = true;
  const api = {
    get: async () => {
      if (shouldFail) throw new Error('licensing authority unavailable');
      return {
        valid: false,
        entitlements: [],
        expirationDate: null,
        planName: null
      };
    }
  };
  const slice = loadLicenseSlice(api);
  const store = configureStore({ reducer: slice.reducer });

  await assert.rejects(
    store.dispatch(slice.getLicenseValidity()),
    /licensing authority unavailable/
  );
  assert.equal(store.getState().requestStatus, 'failed');
  assert.equal(store.getState().state.valid, false);

  shouldFail = false;
  await store.dispatch(slice.getLicenseValidity());
  assert.equal(store.getState().requestStatus, 'succeeded');
});
