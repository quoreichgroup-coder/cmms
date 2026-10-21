const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { createAction } = require('@reduxjs/toolkit');

const slicePath = path.join(__dirname, '../src/slices/task.ts');
const sliceSource = fs.readFileSync(slicePath, 'utf8');
const compiledSlice = ts.transpileModule(sliceSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;
const pageSource = fs.readFileSync(
  path.join(
    __dirname,
    '../src/content/own/PreventiveMaintenance/PMDetails.tsx'
  ),
  'utf8'
);

test('preventive-maintenance task failure is visible and retry clears it', async () => {
  let attempts = 0;
  const moduleExports = {};
  vm.runInNewContext(compiledSlice, {
    exports: moduleExports,
    require(id) {
      if (id === '@reduxjs/toolkit') return require('@reduxjs/toolkit');
      if (id === '../utils/api')
        return {
          __esModule: true,
          default: {
            get: async () => {
              attempts += 1;
              if (attempts === 1) throw new Error('temporary failure');
              return [];
            }
          }
        };
      if (id === 'src/utils/redux')
        return { revertAll: createAction('revertAll') };
      return require(id);
    }
  });

  let state = moduleExports.reducer(undefined, { type: 'test/init' });
  const dispatch = async (action) => {
    if (typeof action === 'function') return action(dispatch);
    state = moduleExports.reducer(state, action);
    return action;
  };

  await dispatch(moduleExports.getTasksByPreventiveMaintenance(42));
  assert.equal(
    state.taskLoadErrorsByPreventiveMaintenance[42],
    true,
    'failed task load is recorded instead of appearing empty'
  );
  assert.equal(state.loadingTasksByPreventiveMaintenance[42], false);

  await dispatch(moduleExports.getTasksByPreventiveMaintenance(42));
  assert.deepEqual(state.tasksByPreventiveMaintenance[42], []);
  assert.equal(state.taskLoadErrorsByPreventiveMaintenance[42], undefined);
  assert.equal(state.loadingTasksByPreventiveMaintenance[42], false);

  assert.match(pageSource, /pm_tasks_load_error/);
  assert.match(pageSource, /setTaskReloadKey\(\(key\) => key \+ 1\)/);
});
