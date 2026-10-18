const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/slices/workload.ts', 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true
    }
  }
).outputText;

const loadWorkloadSlice = (api) => {
  const moduleExports = {};
  const module = { exports: moduleExports };
  vm.runInNewContext(source, {
    exports: moduleExports,
    module,
    URLSearchParams,
    require: (name) => {
      if (name === '@reduxjs/toolkit') return require(name);
      if (name === '../utils/api') {
        return {
          __esModule: true,
          default: api,
          getErrorMessage: (error) => error.message
        };
      }
      if (name === './workOrder') {
        return { updateWorkOrderInContent: () => ({ type: 'unused' }) };
      }
      throw new Error(`Unexpected import: ${name}`);
    }
  });
  return module.exports;
};

const invokeThunk = async (thunk) => {
  const actions = [];
  await thunk(
    (action) => actions.push(action),
    () => ({})
  );
  return actions;
};

test('workload overview API failure becomes a retryable error state', async () => {
  const slice = loadWorkloadSlice({
    get: async () => {
      throw new Error('overview unavailable');
    }
  });
  const actions = await invokeThunk(
    slice.getOverview('2026-10-12', '2026-10-18')
  );

  assert.ok(
    actions.some(
      (action) =>
        action.type === 'workload/setOverviewError' &&
        action.payload.error === 'overview unavailable'
    )
  );
  assert.equal(actions.at(-1).type, 'workload/setLoadingOverview');
  assert.equal(actions.at(-1).payload.loading, false);
});

test('unscheduled work order API failure becomes a retryable error state', async () => {
  const slice = loadWorkloadSlice({
    get: async () => {
      throw new Error('unscheduled unavailable');
    }
  });
  const actions = await invokeThunk(slice.getUnscheduled());

  assert.ok(
    actions.some(
      (action) =>
        action.type === 'workload/setUnscheduledError' &&
        action.payload.error === 'unscheduled unavailable'
    )
  );
  assert.equal(actions.at(-1).type, 'workload/setLoadingUnscheduled');
  assert.equal(actions.at(-1).payload.loading, false);
});

test('unscheduling API failure rejects without optimistic state mutations', async () => {
  const slice = loadWorkloadSlice({
    patch: async () => {
      throw new Error('unschedule unavailable');
    }
  });
  const actions = [];

  await assert.rejects(
    slice.unscheduleWorkOrder(617, {
      id: 617,
      customId: 'WO-617',
      title: 'Pump inspection',
      status: 'OPEN',
      estimatedDuration: 1,
      estimatedStartDate: '2026-10-20T08:00:00.000Z',
      dueDate: '2026-10-20'
    })(
      (action) => actions.push(action),
      () => ({})
    ),
    /unschedule unavailable/
  );

  assert.deepEqual(actions, []);
});
