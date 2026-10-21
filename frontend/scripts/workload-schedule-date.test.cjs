const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const sourcePath = path.join(
  __dirname,
  '../src/content/own/WorkOrders/WorkloadView/scheduleDestination.ts'
);
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, {
  exports: moduleExports,
  module: { exports: moduleExports }
});

test('workload drop target preserves the local calendar date for the API DTO', () => {
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(moduleExports.getWorkloadDestination('user-42-2026-10-20'))
    ),
    { userId: 42, dateStr: '2026-10-20' }
  );
});

test('workload drop target rejects non-column and malformed dates', () => {
  assert.equal(moduleExports.getWorkloadDestination('unscheduled'), null);
  assert.equal(moduleExports.getWorkloadDestination('user-x-2026-10-20'), null);
  assert.equal(moduleExports.getWorkloadDestination('user-42-2026-1-2'), null);
  assert.equal(moduleExports.getWorkloadDestination('user-0-2026-10-20'), null);
  assert.equal(
    moduleExports.getWorkloadDestination('user-42-2026-02-30'),
    null
  );
  assert.equal(
    moduleExports.getWorkloadDestination('user-9007199254740992-2026-10-20'),
    null
  );
});
