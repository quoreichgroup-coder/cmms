const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/content/own/MaintenanceDashboard/metricCalculations.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports });

test('completion metrics avoid divide-by-zero and invalid denominators', () => {
  assert.equal(moduleExports.percentageOrNull(9, 10), 90);
  assert.equal(moduleExports.percentageOrNull(0, 0), null);
  assert.equal(moduleExports.percentageOrNull(2, -1), null);
  assert.equal(moduleExports.percentageOrNull(Number.NaN, 4), null);
});

test('backlog age bands follow the documented 0–7, 8–30, over-30 rules', () => {
  assert.equal(moduleExports.agingBand(0), 'ok');
  assert.equal(moduleExports.agingBand(7), 'ok');
  assert.equal(moduleExports.agingBand(8), 'attention');
  assert.equal(moduleExports.agingBand(30), 'attention');
  assert.equal(moduleExports.agingBand(30.1), 'critical');
});

test('currency formatter supports ISO codes and legacy display symbols', () => {
  const formatCurrency = moduleExports.createDashboardCurrencyFormatter;

  assert.match(formatCurrency('en-US', 'USD').format(1234), /\$1,234/);
  assert.equal(formatCurrency('en-US', '$').format(1234), '$ 1,234');
});
