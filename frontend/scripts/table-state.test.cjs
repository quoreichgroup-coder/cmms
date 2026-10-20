const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/tableState.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports, require });
const { restorePaginationState, restoreTableState } = moduleExports;
const assertPagination = (actual, expected) =>
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);

test('restores page index and page size from current persisted pagination', () => {
  assertPagination(
    restorePaginationState(
      { pagination: { pageIndex: 3, pageSize: 25 } },
      { pageIndex: 0, pageSize: 10 },
      true
    ),
    { pageIndex: 3, pageSize: 25 }
  );
});

test('keeps the current page reset while restoring a legacy page size', () => {
  assertPagination(
    restorePaginationState(
      { pageSize: 50 },
      { pageIndex: 2, pageSize: 10 },
      false
    ),
    { pageIndex: 2, pageSize: 50 }
  );
});

test('falls back safely when persisted pagination is invalid or incomplete', () => {
  assertPagination(
    restorePaginationState(
      { pagination: { pageIndex: -1, pageSize: 0 }, pageSize: 25 },
      { pageIndex: 0, pageSize: 10 },
      true
    ),
    { pageIndex: 0, pageSize: 10 }
  );
});

test('restores only valid table preference values from persisted JSON', () => {
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        restoreTableState(
          {
            sorting: [
              { id: 'updatedAt', desc: true },
              { id: 2, desc: false }
            ],
            pagination: { pageIndex: 4, pageSize: 25 },
            columnOrder: ['name', null, 3],
            columnSizing: { name: 240, bad: 'wide', negative: -1 },
            columnVisibility: { name: false, bad: 'hidden' },
            pinnedColumns: ['name', 1]
          },
          { pageIndex: 0, pageSize: 10 },
          true
        )
      )
    ),
    {
      sorting: [{ id: 'updatedAt', desc: true }],
      pagination: { pageIndex: 4, pageSize: 25 },
      columnOrder: ['name'],
      columnSizing: { name: 240 },
      columnVisibility: { name: false },
      pinnedColumns: ['name']
    }
  );
});

test('malformed table preference shapes fall back to empty optional state', () => {
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        restoreTableState('unexpected', { pageIndex: 1, pageSize: 20 }, false)
      )
    ),
    {
      sorting: [],
      pagination: { pageIndex: 1, pageSize: 20 },
      columnOrder: [],
      columnSizing: {},
      columnVisibility: {},
      pinnedColumns: []
    }
  );
});
