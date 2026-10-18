const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/mergeSelectedOptions.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports });

test('keeps the selected asset visible after filtered options refresh', () => {
  const selected = { label: 'Pump P-102', value: 102 };
  const available = [
    { label: 'Pump P-101', value: 101 },
    { label: 'Pump P-103', value: 103 }
  ];

  assert.deepEqual(
    [...moduleExports.mergeSelectedOptions(available, [selected])],
    [...available, selected]
  );
});

test('deduplicates selected asset IDs and retains the controlled label', () => {
  const available = [
    { label: 'Pump P-102', value: 102 },
    { label: 'Pump P-103', value: 103 }
  ];
  const selected = { label: 'Pump P-102 (selected)', value: '102' };

  assert.deepEqual(
    [...moduleExports.mergeSelectedOptions(available, [selected])],
    [selected, available[1]]
  );
});
