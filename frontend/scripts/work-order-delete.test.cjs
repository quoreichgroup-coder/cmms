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
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require(id) {
      if (id.endsWith('/api')) return { __esModule: true, default: api };
      if (id.endsWith('/page'))
        return { getInitialPage: () => ({ content: [], totalElements: 0 }) };
      if (id.endsWith('/redux'))
        return { revertAll: createAction('REVERT_ALL') };
      if (id.endsWith('cancellableRequest')) return {};
      if (id.endsWith('/workload')) return { addToUnscheduled: () => ({}) };
      return require(id);
    }
  });
  return exports;
}

test('work order delete only removes the item after server confirmation', async () => {
  let succeeds = false;
  const workOrders = loadWorkOrderSlice({
    deletes: async () => ({ success: succeeds })
  });
  const store = configureStore({ reducer: { workOrders: workOrders.reducer } });
  const workOrder = { id: 81, title: 'Inspect gearbox', status: 'OPEN' };
  store.dispatch(
    workOrders.default.actions.getWorkOrders({
      workOrders: { content: [workOrder], totalElements: 1 }
    })
  );

  const failedDelete = await store.dispatch(workOrders.deleteWorkOrder(81));
  assert.equal(failedDelete, false);
  assert.equal(store.getState().workOrders.workOrders.content[0].id, 81);

  succeeds = true;
  const successfulDelete = await store.dispatch(workOrders.deleteWorkOrder(81));
  assert.equal(successfulDelete, true);
  assert.equal(store.getState().workOrders.workOrders.content.length, 0);
});
