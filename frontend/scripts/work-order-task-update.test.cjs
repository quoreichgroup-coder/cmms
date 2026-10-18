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

test('clearing every work order task sends an empty update and clears Redux task state', async () => {
  const calls = [];
  const tasks = loadTaskSlice({
    patch: async (url, body) => {
      calls.push({ url, body });
      return [];
    }
  });
  const store = configureStore({ reducer: tasks.reducer });
  store.dispatch(
    tasks.default.actions.getTasksByWorkOrder({ id: 73, tasks: [{ id: 1 }] })
  );

  await store.dispatch(tasks.patchTasksOfWorkOrder(73, []));

  assert.deepEqual(calls, [{ url: 'tasks/work-order/73', body: [] }]);
  assert.deepEqual(store.getState().tasksByWorkOrder[73], []);
});
