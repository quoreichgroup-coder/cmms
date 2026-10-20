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
const formSource = fs.readFileSync(
  'src/content/own/components/form/CustomSelect2.tsx',
  'utf8'
);
const selectorCases = [...formSource.matchAll(/^ {4}case '([^']+)'/gm)];
const assetModalSource = fs.readFileSync(
  'src/content/own/components/form/SelectAssetModal.tsx',
  'utf8'
);
const locationModalSource = fs.readFileSync(
  'src/content/own/components/form/SelectLocationModal.tsx',
  'utf8'
);

function getSelectorCase(name) {
  const currentIndex = selectorCases.findIndex((match) => match[1] === name);
  assert.notEqual(currentIndex, -1, `missing ${name} selector`);
  const start = selectorCases[currentIndex].index;
  const nextIndex =
    name === 'location' &&
    selectorCases[currentIndex + 1]?.[1] === 'parentLocation'
      ? currentIndex + 2
      : currentIndex + 1;
  const end = selectorCases[nextIndex]?.index;
  return formSource.slice(start, end);
}

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

test('asset and location selectors retain MUI controls and label their modal action', () => {
  for (const [caseName, modalName] of [
    ['asset', 'setAssetModalOpen'],
    ['location', 'setLocationModalOpen']
  ]) {
    const caseSource = getSelectorCase(caseName);
    assert.match(caseSource, /\{params\.InputProps\.endAdornment\}/);
    assert.match(caseSource, /aria-label=\{field\.label\}/);
    assert.ok(caseSource.includes(`${modalName}(true)`));
  }
});

test('permission-gated user and category actions do not remove MUI controls', () => {
  for (const caseName of ['user', 'category']) {
    const caseSource = getSelectorCase(caseName);
    assert.match(caseSource, /\{params\.InputProps\.endAdornment\}/);
  }
});

test('single-select asset and location modals keep their existing selection on open', () => {
  for (const [modalName, source, selectedState] of [
    ['asset', assetModalSource, 'setSelectedAssets'],
    ['location', locationModalSource, 'setSelectedLocations']
  ]) {
    assert.match(source, new RegExp(`${selectedState}\\(initialSelected`));
    assert.doesNotMatch(source, /if \(single && open\)/);
    assert.doesNotMatch(
      source,
      new RegExp(
        `if \\(single && open\\)[\\s\\S]*?${selectedState}\\(\\[\\]\\)`
      ),
      `${modalName} selection must not be cleared on open`
    );
  }
});
