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
      if (id.includes('cancellableRequest')) {
        return {
          cancellableFetch: async (
            dispatch,
            key,
            apiCall,
            onSuccess,
            setLoading
          ) => {
            setLoading?.(true);
            try {
              onSuccess(await apiCall(new AbortController().signal));
            } finally {
              setLoading?.(false);
            }
          }
        };
      }
      return require(id);
    }
  });

  return exports;
}

test('request list failures are visible and a retry clears the error', async () => {
  let shouldFail = true;
  const requests = loadRequestSlice({
    post: async () => {
      if (shouldFail) throw new Error('Service unavailable');
      return {
        content: [{ id: 12, title: 'Pump inspection' }],
        totalElements: 1
      };
    }
  });
  const store = configureStore({ reducer: requests.reducer });
  const criteria = { pageNum: 0, pageSize: 10, direction: 'DESC' };

  await store.dispatch(requests.getRequests(criteria));
  assert.equal(store.getState().loadingGet, false);
  assert.equal(store.getState().requestsError, 'Service unavailable');
  assert.deepEqual(store.getState().requests.content, []);

  shouldFail = false;
  await store.dispatch(requests.getRequests(criteria));
  assert.equal(store.getState().loadingGet, false);
  assert.equal(store.getState().requestsError, null);
  assert.equal(store.getState().requests.content[0].id, 12);
});
