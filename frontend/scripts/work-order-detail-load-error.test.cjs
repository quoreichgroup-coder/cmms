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
      if (id.endsWith('cancellableRequest')) return {};
      if (id.endsWith('/workload')) return { addToUnscheduled: () => ({}) };
      return require(id);
    }
  });

  return exports;
}

test('direct work order load failure stops both loaders and can be retried', async () => {
  let shouldFail = true;
  const workOrders = loadWorkOrderSlice({
    get: async () => {
      if (shouldFail) throw new Error('Work order unavailable');
      return { id: 42, title: 'Inspect main pump' };
    }
  });
  const store = configureStore({ reducer: workOrders.reducer });

  await store.dispatch(workOrders.getSingleWorkOrder(42));
  assert.equal(store.getState().loadingGet, false);
  assert.equal(store.getState().singleWorkOrderLoading, false);
  assert.equal(store.getState().singleWorkOrderError, 'Work order unavailable');

  shouldFail = false;
  await store.dispatch(workOrders.getSingleWorkOrder(42));
  assert.equal(store.getState().loadingGet, false);
  assert.equal(store.getState().singleWorkOrderLoading, false);
  assert.equal(store.getState().singleWorkOrderError, null);
  assert.equal(store.getState().singleWorkOrder.id, 42);
});

test('late work order detail response cannot replace the most recently requested item', async () => {
  const resolveByUrl = new Map();
  const workOrders = loadWorkOrderSlice({
    get: (url) => new Promise((resolve) => resolveByUrl.set(url, resolve))
  });
  const store = configureStore({ reducer: workOrders.reducer });

  const firstLoad = store.dispatch(workOrders.getSingleWorkOrder(42));
  const latestLoad = store.dispatch(workOrders.getSingleWorkOrder(43));
  resolveByUrl.get('work-orders/43')({ id: 43, title: 'Latest work order' });
  await latestLoad;
  resolveByUrl.get('work-orders/42')({ id: 42, title: 'Stale work order' });
  await firstLoad;

  assert.equal(store.getState().singleWorkOrder.id, 43);
  assert.equal(store.getState().singleWorkOrderLoading, false);
  assert.equal(store.getState().loadingGet, false);
});
