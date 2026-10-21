const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/formatCurrency.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports, Intl });

test('UEMOA XOF amounts display as localized FCFA without decimal places', () => {
  assert.equal(
    moduleExports.formatXofAmount(1250000, 'fr-FR'),
    '1 250 000 FCFA'
  );
  assert.equal(
    moduleExports.formatXofAmount('1250000', 'en-US'),
    '1,250,000 FCFA'
  );
});

test('invalid and empty amounts are not silently changed to zero', () => {
  assert.equal(moduleExports.formatXofAmount('', 'fr-FR'), '');
  assert.equal(moduleExports.formatXofAmount('n/a', 'fr-FR'), 'n/a XOF');
});

test('company formatter safely handles XOF, ISO currencies and legacy symbols', () => {
  const format = moduleExports.formatCompanyCurrency;
  assert.equal(format(1250000, 'XOF', 'fr-FR'), '1 250 000 FCFA');
  assert.match(format(1234, 'EUR', 'fr-FR'), /1\s?234,00\s?€/);
  assert.equal(format(1234, '$', 'en-US'), '$ 1,234');
  assert.equal(format(1234, 'BAD-CODE', 'en-US'), 'BAD-CODE 1,234');
  assert.equal(format('', '$', 'en-US'), '');
});
