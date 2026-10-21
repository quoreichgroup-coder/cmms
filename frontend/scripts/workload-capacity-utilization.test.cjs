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
  assert.ok(getPercent(600.1, 600) > 100);
  assert.ok(getPercent(480.1, 600) > 80);
});

test('reports capacity balance as unavailable, remaining, or over capacity', () => {
  const getBalance = moduleExports.getCapacityBalance;
  assert.deepEqual(JSON.parse(JSON.stringify(getBalance(30, 0))), {
    kind: 'unavailable'
  });
  assert.deepEqual(JSON.parse(JSON.stringify(getBalance(90, 120))), {
    kind: 'remaining',
    hours: 0,
    minutes: 30
  });
  assert.deepEqual(JSON.parse(JSON.stringify(getBalance(150, 120))), {
    kind: 'over',
    hours: 0,
    minutes: 30
  });
  assert.deepEqual(JSON.parse(JSON.stringify(getBalance(0, 450))), {
    kind: 'remaining',
    hours: 7,
    minutes: 30
  });
});

test('workload renders over-capacity and unavailable labels explicitly', () => {
  const view = fs.readFileSync(
    'src/content/own/WorkOrders/WorkloadView/index.tsx',
    'utf8'
  );
  assert.match(view, /getCapacityBalance\(/);
  assert.match(view, /t\('workload_capacity_over'/);
  assert.match(
    view,
    /aria-valuetext=\{t\('workload_capacity_used', \{\s*percent: Math\.round\(percent\)\s*\}\)\}/
  );
  assert.match(view, /balance\.kind === 'unavailable'/);
});
