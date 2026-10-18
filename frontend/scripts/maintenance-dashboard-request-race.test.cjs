const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { configureStore } = require('@reduxjs/toolkit');

const source = ts.transpileModule(
  fs.readFileSync('src/slices/analytics/workOrder.ts', 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true
    }
  }
).outputText;

const loadAnalyticsSlice = (api) => {
  const moduleExports = {};
  const module = { exports: moduleExports };
  vm.runInNewContext(source, {
    exports: moduleExports,
    module,
    require(name) {
      if (name === '@reduxjs/toolkit') return require(name);
      if (name === 'src/utils/redux') {
        return {
          revertAll: require('@reduxjs/toolkit').createAction('REVERT_ALL')
        };
      }
      if (name === '../../utils/api') {
        return {
          __esModule: true,
          default: api,
          getErrorMessage: (error) => error.message
        };
      }
      throw new Error(`Unexpected import: ${name}`);
    }
  });
  return module.exports;
};

test('maintenance dashboard ignores an overview response from an older date range', async () => {
  const pending = [];
  const slice = loadAnalyticsSlice({
    post: () =>
      new Promise((resolve, reject) => pending.push({ resolve, reject }))
  });
  const store = configureStore({ reducer: slice.reducer });
  const previous = store.dispatch(
    slice.getOverviewStats(new Date('2026-10-01'), new Date('2026-10-07'))
  );
  const current = store.dispatch(
    slice.getOverviewStats(new Date('2026-10-08'), new Date('2026-10-14'))
  );

  pending[1].resolve({
    total: 10,
    complete: 8,
    compliant: 7,
    avgCycleTime: 2,
    mtta: 1
  });
  await current;
  pending[0].resolve({
    total: 4,
    complete: 1,
    compliant: 1,
    avgCycleTime: 9,
    mtta: 8
  });
  await previous;

  assert.equal(store.getState().overview.total, 10);
  assert.equal(store.getState().overview.complete, 8);
  assert.equal(store.getState().loading.overview, false);
});
