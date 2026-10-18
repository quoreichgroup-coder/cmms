const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { configureStore, createAction } = require('@reduxjs/toolkit');

function loadWorkOrderSlice(api) {
  const exports = {};
  const source = fs.readFileSync('src/slices/workOrder.ts', 'utf8');
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
      if (id.endsWith('cancellableRequest')) {
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
      if (id.endsWith('/workload')) return { addToUnscheduled: () => ({}) };
      return require(id);
    }
  });

  return exports;
}

test('work order list failures are visible and a retry clears the error', async () => {
  let shouldFail = true;
  const workOrders = loadWorkOrderSlice({
    post: async () => {
      if (shouldFail) throw new Error('Service unavailable');
      return {
        content: [{ id: 24, title: 'Inspect conveyor' }],
        totalElements: 1
      };
    }
  });
  const store = configureStore({ reducer: workOrders.reducer });
  const criteria = { pageNum: 0, pageSize: 10, direction: 'DESC' };

  await store.dispatch(workOrders.getWorkOrders(criteria));
  assert.equal(store.getState().loadingGet, false);
  assert.equal(store.getState().workOrdersError, 'Service unavailable');
  assert.deepEqual(store.getState().workOrders.content, []);

  shouldFail = false;
  await store.dispatch(workOrders.getWorkOrders(criteria));
  assert.equal(store.getState().loadingGet, false);
  assert.equal(store.getState().workOrdersError, null);
  assert.equal(store.getState().workOrders.content[0].id, 24);
});
