const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const loadRequestFormFields = () => {
  const sourcePath = path.join(
    __dirname,
    '../src/content/own/Requests/requestFormFields.ts'
  );
  const source = fs.readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports }, { filename: sourcePath });
  return exports;
};

test('request field configuration ignores fields hidden by UI configuration', () => {
  const { findVisibleRequestFieldConfiguration } = loadRequestFormFields();
  const fields = [{ name: 'title', type: 'text' }];
  const configurations = [
    { fieldName: 'location', fieldType: 'REQUIRED' },
    { fieldName: 'title', fieldType: 'REQUIRED' }
  ];

  assert.equal(
    findVisibleRequestFieldConfiguration(fields, configurations, 'location'),
    null
  );
  const visible = findVisibleRequestFieldConfiguration(
    fields,
    configurations,
    'title'
  );
  assert.equal(visible.fieldIndex, 0);
  assert.equal(visible.field, fields[0]);
  assert.equal(visible.configuration, configurations[1]);
});

test('request field configuration safely ignores absent company configuration', () => {
  const { findVisibleRequestFieldConfiguration } = loadRequestFormFields();

  assert.equal(
    findVisibleRequestFieldConfiguration(
      [{ name: 'asset', type: 'select' }],
      undefined,
      'asset'
    ),
    null
  );
});

test('request form applies required and hidden rules only to visible configured fields', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/content/own/Requests/index.tsx'),
    'utf8'
  );

  assert.match(source, /findVisibleRequestFieldConfiguration\(/);
  assert.match(source, /if \(!visibleFieldConfiguration\) return/);
});
