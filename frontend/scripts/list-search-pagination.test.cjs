const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/listSearch.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports, require });
const { buildFirstPageSearchCriteria } = moduleExports;

test('searching from a later page preserves other filters and resets to page 0', () => {
  const criteria = {
    pageNum: 6,
    pageSize: 20,
    direction: 'DESC',
    filterFields: [
      { field: 'archived', operation: 'eq', value: false },
      { field: 'title', operation: 'cn', value: 'old search' }
    ]
  };

  const result = buildFirstPageSearchCriteria(criteria, 'pump', [
    'title',
    'description',
    'customId'
  ]);

  assert.equal(result.pageNum, 0);
  assert.equal(result.pageSize, 20);
  assert.equal(result.direction, 'DESC');
  assert.deepEqual(JSON.parse(JSON.stringify(result.filterFields)), [
    { field: 'archived', operation: 'eq', value: false },
    {
      field: 'title',
      operation: 'cn',
      value: 'pump',
      alternatives: [
        { field: 'description', operation: 'cn', value: 'pump' },
        { field: 'customId', operation: 'cn', value: 'pump' }
      ]
    }
  ]);
});

test('clearing a search removes search filters and still resets the page', () => {
  const result = buildFirstPageSearchCriteria(
    {
      pageNum: 4,
      filterFields: [
        { field: 'status', operation: 'eq', value: 'OPEN' },
        { field: 'title', operation: 'cn', value: 'pump' }
      ]
    },
    '',
    ['title', 'description']
  );

  assert.equal(result.pageNum, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(result.filterFields)), [
    { field: 'status', operation: 'eq', value: 'OPEN' }
  ]);
});
