const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { configureStore } = require('@reduxjs/toolkit');

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
      if (id.endsWith('/redux')) {
        return {
          revertAll: require('@reduxjs/toolkit').createAction('REVERT_ALL')
        };
      }
      if (id.includes('cancellableRequest')) return {};
      return require(id);
    }
  });

  return exports;
}

test('direct request load failure stops loading and can be retried', async () => {
  let shouldFail = true;
  const requests = loadRequestSlice({
    get: async () => {
      if (shouldFail) throw new Error('Request unavailable');
      return { id: 17, title: 'Repair pump seal' };
    }
  });
  const store = configureStore({ reducer: requests.reducer });

  await store.dispatch(requests.getSingleRequest(17));
  assert.equal(store.getState().loadingGet, false);
  assert.equal(store.getState().singleRequestLoading, false);
  assert.equal(store.getState().singleRequestError, 'Request unavailable');

  shouldFail = false;
  await store.dispatch(requests.getSingleRequest(17));
  assert.equal(store.getState().loadingGet, false);
  assert.equal(store.getState().singleRequestLoading, false);
  assert.equal(store.getState().singleRequestError, null);
  assert.equal(store.getState().singleRequest.id, 17);
});

test('late request detail response cannot replace the most recently requested item', async () => {
  const resolveByUrl = new Map();
  const requests = loadRequestSlice({
    get: (url) => new Promise((resolve) => resolveByUrl.set(url, resolve))
  });
  const store = configureStore({ reducer: requests.reducer });

  const firstLoad = store.dispatch(requests.getSingleRequest(17));
  const latestLoad = store.dispatch(requests.getSingleRequest(18));
  resolveByUrl.get('requests/18')({ id: 18, title: 'Latest request' });
  await latestLoad;
  resolveByUrl.get('requests/17')({ id: 17, title: 'Stale request' });
  await firstLoad;

  assert.equal(store.getState().singleRequest.id, 18);
  assert.equal(store.getState().singleRequestLoading, false);
  assert.equal(store.getState().loadingGet, false);
});
