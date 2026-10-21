const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const sourcePath = path.join(
  __dirname,
  '../src/utils/hierarchyImportPreflight.ts'
);
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports });
const findHierarchyImportIssues = (...args) =>
  JSON.parse(JSON.stringify(moduleExports.findHierarchyImportIssues(...args)));

test('hierarchy preflight accepts valid out-of-order parent-child rows', () => {
  assert.deepEqual(
    findHierarchyImportIssues([
      { name: 'Pump 01', parentName: 'Area A' },
      { name: 'Area A', parentName: '' }
    ]),
    []
  );
});

test('hierarchy preflight blocks ambiguous and case-mismatched in-file parents', () => {
  assert.deepEqual(
    findHierarchyImportIssues([
      { name: 'Area A', parentName: '' },
      { name: 'area a', parentName: '' },
      { name: 'Pump 01', parentName: 'AREA A' }
    ]),
    [{ row: 2, type: 'ambiguous-parent' }]
  );

  assert.deepEqual(
    findHierarchyImportIssues([
      { name: 'Area A', parentName: '' },
      { name: 'Pump 01', parentName: 'area a' }
    ]),
    [{ row: 1, type: 'parent-name-mismatch' }]
  );
});

test('hierarchy preflight blocks self-parenting and multi-row cycles', () => {
  assert.deepEqual(
    findHierarchyImportIssues([{ name: 'Pump 01', parentName: 'Pump 01' }]),
    [{ row: 0, type: 'cycle' }]
  );

  assert.deepEqual(
    findHierarchyImportIssues([
      { name: 'A', parentName: 'B' },
      { name: 'B', parentName: 'A' }
    ]),
    [
      { row: 0, type: 'cycle' },
      { row: 1, type: 'cycle' }
    ]
  );
});

test('hierarchy preflight leaves possible existing database parents to the API', () => {
  assert.deepEqual(
    findHierarchyImportIssues([
      { name: 'Pump 01', parentName: 'Existing assembly' }
    ]),
    []
  );
});

test('hierarchy preflight validates stable exchange keys and uses them for parent cycles', () => {
  const parent = 'a5b38bc8-4e8c-4fe1-9b72-1fa48e6e99aa';
  const child = 'fc3a6e0e-0ced-45e7-9ebc-f1b5bd2d62d1';
  assert.deepEqual(
    findHierarchyImportIssues([
      { name: 'Child', parentName: '', exchangeId: child, parentExchangeId: parent },
      { name: 'Parent', parentName: '', exchangeId: parent, parentExchangeId: '' }
    ]),
    []
  );
  assert.deepEqual(
    findHierarchyImportIssues([
      { name: 'A', parentName: '', exchangeId: parent, parentExchangeId: child },
      { name: 'B', parentName: '', exchangeId: child, parentExchangeId: parent }
    ]),
    [
      { row: 0, type: 'cycle' },
      { row: 1, type: 'cycle' }
    ]
  );
  assert.deepEqual(
    findHierarchyImportIssues([
      { name: 'A', parentName: '', exchangeId: parent },
      { name: 'B', parentName: '', exchangeId: parent }
    ]),
    [{ row: 1, type: 'duplicate-exchange-id' }]
  );
  assert.deepEqual(
    findHierarchyImportIssues([{ name: 'Bad key', parentName: '', exchangeId: 123 }]),
    [{ row: 0, type: 'invalid-exchange-id' }]
  );
  assert.deepEqual(
    findHierarchyImportIssues([
      { name: 'Bad parent', parentName: '', parentExchangeId: 'not-a-uuid' }
    ]),
    [{ row: 0, type: 'invalid-exchange-id' }]
  );
});

test('the import wizard blocks review when a hierarchy reference is unsafe', () => {
  const wizard = fs.readFileSync(
    path.join(__dirname, '../src/content/own/Imports/index.tsx'),
    'utf8'
  );
  assert.match(wizard, /findHierarchyImportIssues\([\s\S]*?jsonData\.map/);
  assert.match(wizard, /hierarchy_import_invalid/);
  assert.match(wizard, /hierarchy_issue_\$\{type\}/);
  assert.match(wizard, /if \(issues\.length\)[\s\S]*?return;/);
});
