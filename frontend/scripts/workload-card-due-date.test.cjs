const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const helperSource = ts.transpileModule(
  fs.readFileSync('src/content/own/WorkOrders/dueDate.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }
).outputText;
const helperExports = {};
vm.runInNewContext(helperSource, {
  exports: helperExports,
  require
});

test('workload cards use calendar-day overdue rules for due dates', () => {
  const originalTimezone = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';

  try {
    const now = new Date('2026-10-18T20:00:00.000Z'); // Oct 18 locally
    assert.equal(
      helperExports.isDueDateBeforeDay('2026-10-18T00:00:00.000Z', now),
      false
    );
    assert.equal(
      helperExports.isDueDateBeforeDay('2026-10-17T00:00:00.000Z', now),
      true
    );

    const workloadSource = fs.readFileSync(
      'src/content/own/WorkOrders/WorkloadView/index.tsx',
      'utf8'
    );
    assert.match(workloadSource, /isDueDateBeforeDay\(\s*wo\.dueDate/);
    assert.doesNotMatch(
      workloadSource,
      /new Date\(wo\.dueDate\)\s*<\s*new Date\(\)/
    );
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test('asset work-order cards share the calendar-day overdue rule', () => {
  const assetWorkOrdersSource = fs.readFileSync(
    'src/content/own/Assets/Show/AssetWorkOrders.tsx',
    'utf8'
  );

  assert.match(assetWorkOrdersSource, /isDueDateBeforeDay\(workOrder\.dueDate/);
  assert.doesNotMatch(
    assetWorkOrdersSource,
    /new Date\(workOrder\.dueDate\).*Date\.now\(\)/
  );
});
