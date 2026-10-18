const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/slices/workload.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }
).outputText;

function loadWorkloadSlice(api) {
  const exports = {};
  const module = { exports };
  vm.runInNewContext(source, {
    exports,
    module,
    URLSearchParams,
    require(name) {
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
}

test('workload scheduling sends the exact LocalDate string to the existing API', async () => {
  const calls = [];
  const slice = loadWorkloadSlice({
    patch: async (url, body) => {
      calls.push({ url, body });
      return {
        userId: 42,
        userFirstName: 'Awa',
        userLastName: 'Diallo',
        estimatedStartDate: '2026-10-20T08:00:00.000Z'
      };
    }
  });
  const dispatch = () => {};
  const getState = () => ({
    workOrders: { workOrders: { content: [] } },
    workload: { overview: null, unscheduled: null }
  });

  await slice.scheduleWorkOrder(617, {
    localDate: '2026-10-20',
    estimatedDuration: 2.5,
    primaryUserId: 42
  })(dispatch, getState);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'workload/work-orders/617/schedule');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].body)), {
    localDate: '2026-10-20',
    estimatedDuration: 2.5,
    primaryUserId: 42
  });
});
