const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { configureStore, createAction } = require('@reduxjs/toolkit');

function loadTaskSlice(api) {
  const exports = {};
  const compiled = ts.transpileModule(
    fs.readFileSync('src/slices/task.ts', 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
    }
  ).outputText;
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

test('clearing every preventive maintenance task sends an empty update and clears Redux task state', async () => {
  const calls = [];
  const tasks = loadTaskSlice({
    patch: async (url, body) => {
      calls.push({ url, body });
      return [];
    }
  });
  const store = configureStore({ reducer: tasks.reducer });
  store.dispatch(
    tasks.default.actions.getTasksByPM({ id: 74, tasks: [{ id: 2 }] })
  );

  await store.dispatch(tasks.patchTasksOfPreventiveMaintenance(74, []));

  assert.deepEqual(calls, [
    { url: 'tasks/preventive-maintenance/74', body: [] }
  ]);
  assert.deepEqual(store.getState().tasksByPreventiveMaintenance[74], []);
});
