const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { configureStore, createAction } = require('@reduxjs/toolkit');

function loadRequestSlice(api) {
  const exports = {};
  const source = fs.readFileSync('src/slices/request.ts', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true
    }
  }).outputText;

  vm.runInNewContext(compiled, {
    exports,
    require(id) {
      if (id.endsWith('/api')) {
        return {
          __esModule: true,
          default: api,
          getErrorMessage: (error) => error.message || 'Request failed'
        };
      }
      if (id.endsWith('/page')) {
        return {
          getInitialPage: () => ({ content: [], totalElements: 0 })
        };
      }
      if (id.endsWith('/redux'))
        return { revertAll: createAction('REVERT_ALL') };
      if (id.includes('cancellableRequest')) return {};
      return require(id);
    }
  });

  return exports;
}

test('late Web request detail is ignored after a session reset', async () => {
  let resolveRequest;
  const requestSlice = loadRequestSlice({
    get: () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
  });
  const store = configureStore({
    reducer: { requests: requestSlice.reducer }
  });

  const pending = store.dispatch(requestSlice.getSingleRequest(91));
  store.dispatch(createAction('REVERT_ALL')());
  resolveRequest({ id: 91, title: 'Previous account request' });
  await pending;

  assert.equal(store.getState().requests.singleRequest, null);
  assert.equal(store.getState().requests.sessionGeneration, 1);
  assert.equal(store.getState().requests.singleRequestLoading, false);
});

test('late Web pending-count response is ignored after a session reset', async () => {
  let resolvePendingCount;
  const requestSlice = loadRequestSlice({
    get: () =>
      new Promise((resolve) => {
        resolvePendingCount = resolve;
      })
  });
  const store = configureStore({
    reducer: { requests: requestSlice.reducer }
  });

  const pending = store.dispatch(requestSlice.getPendingRequestsCount());
  store.dispatch(createAction('REVERT_ALL')());
  resolvePendingCount({ success: true, message: '7' });
  await pending;

  assert.equal(store.getState().requests.pendingCount, 0);
  assert.equal(store.getState().requests.sessionGeneration, 1);
});
