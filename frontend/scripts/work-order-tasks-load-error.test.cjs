const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { configureStore, createAction } = require('@reduxjs/toolkit');

function loadTaskSlice(api) {
  const exports = {};
  const source = fs.readFileSync('src/slices/task.ts', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
  }).outputText;

  vm.runInNewContext(compiled, {
    exports,
    require(id) {
      if (id.endsWith('/api')) return { __esModule: true, default: api };
      if (id.endsWith('/redux'))
        return { revertAll: createAction('REVERT_ALL') };
      return require(id);
    }
  });

  return exports;
}

test('failed checklist load is visible in Redux and retry clears the error', async () => {
  let shouldFail = true;
  const tasks = loadTaskSlice({
    get: async () => {
      if (shouldFail) throw new Error('private server detail');
      return [{ id: 7, description: 'Inspect coupling guard' }];
    }
  });
  const store = configureStore({ reducer: tasks.reducer });

  await store.dispatch(tasks.getTasksByWorkOrder(42));

  assert.equal(store.getState().loadingTasks[42], false);
  assert.equal(store.getState().taskLoadErrorsByWorkOrder[42], true);
  assert.equal(
    JSON.stringify(store.getState()).includes('private server detail'),
    false
  );

  shouldFail = false;
  await store.dispatch(tasks.getTasksByWorkOrder(42));

  assert.equal(store.getState().taskLoadErrorsByWorkOrder[42], undefined);
  assert.equal(store.getState().tasksByWorkOrder[42][0].id, 7);
  assert.equal(store.getState().loadingTasks[42], false);
});

test('work order details show a localized retry action when checklist loading fails', () => {
  const source = fs.readFileSync(
    'src/content/own/WorkOrders/Details/WorkOrderDetails.tsx',
    'utf8'
  );

  assert.match(source, /taskLoadErrorsByWorkOrder\[workOrder\.id\]/);
  assert.match(source, /work_order_tasks_load_error/);
  assert.match(source, /dispatch\(getTasksByWorkOrder\(workOrder\.id\)\)/);
});
