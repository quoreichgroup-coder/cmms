const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync(
    'src/content/own/WorkOrders/WorkloadView/capacityUtilization.ts',
    'utf8'
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports });

test('returns no utilization when capacity is zero or invalid', () => {
  const getPercent = moduleExports.getCapacityUtilizationPercent;
  assert.equal(getPercent(30, 0), null);
  assert.equal(getPercent(0, 0), null);
  assert.equal(getPercent(30, Number.NaN), null);
  assert.equal(getPercent(-1, 60), null);
});

test('calculates utilization and preserves over-capacity values', () => {
  const getPercent = moduleExports.getCapacityUtilizationPercent;
  assert.equal(getPercent(45, 60), 75);
  assert.equal(getPercent(75, 60), 125);
});
