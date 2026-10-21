const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { createAction } = require('@reduxjs/toolkit');

const slicePath = path.join(__dirname, '../src/slices/file.ts');
const compiledSlice = ts.transpileModule(fs.readFileSync(slicePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;
const pageSource = fs.readFileSync(
  path.join(__dirname, '../src/content/own/Files/index.tsx'),
  'utf8'
);

test('file list load errors are visible and retry clears the error', async () => {
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
            post: async () => {
              attempts += 1;
              if (attempts === 1) throw new Error('temporary network failure');
              return { content: [], totalElements: 0, totalPages: 0 };
            }
          }
        };
      if (id === '../models/owns/page')
        return {
          getInitialPage: () => ({
            content: [],
            totalElements: 0,
            totalPages: 0
          })
        };
      if (id === 'src/utils/redux')
        return { revertAll: createAction('revertAll') };
      if (id === '../utils/safeErrorLog') return { logSafeError() {} };
      if (id === 'i18next') return {};
      if (id === 'downloadjs') return { __esModule: true, default: () => {} };
      return require(id);
    }
  });

  let state = moduleExports.reducer(undefined, { type: 'test/init' });
  const dispatch = async (action) => {
    if (typeof action === 'function') return action(dispatch);
    state = moduleExports.reducer(state, action);
    return action;
  };

  await dispatch(moduleExports.getFiles({ pageNum: 0, pageSize: 10 }));
  assert.equal(state.loadError, true);
  assert.equal(state.loadingGet, false);

  await dispatch(moduleExports.getFiles({ pageNum: 0, pageSize: 10 }));
  assert.equal(state.loadError, false);
  assert.equal(state.files.totalElements, 0);
  assert.equal(state.loadingGet, false);
  assert.match(pageSource, /file_load_error/);
  assert.match(pageSource, /dispatch\(getFiles\(criteria\)\)/);
});
