const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/content/own/WorkOrders/WorkloadView/userDisplayName.ts'
  ),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, {
  exports: moduleExports,
  module: { exports: moduleExports }
});

test('workload filter labels show both given and family names', () => {
  assert.equal(
    moduleExports.getWorkloadUserDisplayName(42, [
      { id: 42, firstName: 'Awa', lastName: 'Diallo' }
    ]),
    'Awa Diallo'
  );
});

test('workload labels fall back safely when a name is not available', () => {
  assert.equal(moduleExports.getWorkloadUserDisplayName(42, []), '42');
  assert.equal(
    moduleExports.getWorkloadUserDisplayName(42, [
      { id: 42, firstName: 'Awa', lastName: null }
    ]),
    'Awa'
  );
});
