const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/content/own/Analytics/Request/requestDrilldown.ts'
  ),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports });
const buildCriteria = moduleExports.buildRequestAnalyticsCriteria;
const analyticsIndex = fs.readFileSync(
  path.join(__dirname, '../src/content/own/Analytics/Request/index.tsx'),
  'utf8'
);
const analyticsModal = fs.readFileSync(
  path.join(
    __dirname,
    '../src/content/own/Analytics/Request/RequestAnalyticsModal.tsx'
  ),
  'utf8'
);
const requestsByDate = fs.readFileSync(
  path.join(
    __dirname,
    '../src/content/own/Analytics/Request/Analysis/RequestsByDate.tsx'
  ),
  'utf8'
);
const start = new Date('2026-10-01T00:00:00.000Z');
const end = new Date('2026-10-31T23:59:59.999Z');

test('request analytics maps priority and status to the existing search contract', () => {
  const priority = buildCriteria(
    [{ key: 'priority', value: 'HIGH' }],
    start,
    end,
    0,
    10
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(priority.filterFields)).map((filter) => [
      filter.field,
      filter.operation,
      filter.values?.[0]
    ]),
    [
      ['createdAt', 'ge', undefined],
      ['createdAt', 'le', undefined],
      ['priority', 'in', 'High']
    ]
  );

  const status = buildCriteria(
    [{ key: 'status', value: 'PENDING' }],
    start,
    end,
    0,
    10
  );
  assert.equal(status.filterFields[2].field, 'status');
  assert.deepEqual(JSON.parse(JSON.stringify(status.filterFields[2].values)), [
    'PENDING'
  ]);
});

test('request analytics constrains category, report dates and selected company', () => {
  const criteria = buildCriteria(
    [{ key: 'category', value: 14 }],
    start,
    end,
    2,
    25,
    9
  );
  assert.equal(criteria.pageNum, 2);
  assert.equal(criteria.pageSize, 25);
  assert.equal(criteria.filterFields[0].value, start.toISOString());
  assert.equal(criteria.filterFields[1].value, end.toISOString());
  assert.deepEqual(JSON.parse(JSON.stringify(criteria.filterFields[2])), {
    field: 'category',
    operation: 'eq',
    value: 14
  });
  assert.equal(criteria.filterFields[3].field, 'company');
  assert.deepEqual(
    JSON.parse(JSON.stringify(criteria.filterFields[3].values)),
    [9]
  );
});

test('request analytics narrows range points to a day and rejects unsafe filters', () => {
  const day = buildCriteria(
    [{ key: 'range', value: '2026-10-14T12:00:00.000Z' }],
    start,
    end,
    0,
    10
  );
  assert.equal(day.filterFields[2].value, '2026-10-14T00:00:00.000Z');
  assert.equal(day.filterFields[3].value, '2026-10-14T23:59:59.999Z');
  assert.equal(
    buildCriteria([{ key: 'fs', value: false }], start, end, 0, 10),
    null
  );
  assert.equal(
    buildCriteria([{ key: 'status', value: 'IN_PROGRESS' }], start, end, 0, 10),
    null
  );
  assert.equal(
    buildCriteria([{ key: 'category', value: -1 }], start, end, 0, 10),
    null
  );
  assert.equal(
    buildCriteria([{ key: 'priority', value: 'CRITICAL' }], start, end, 0, 10),
    null
  );
});

test('request analytics rejects invalid periods and pagination', () => {
  assert.equal(
    buildCriteria([{ key: 'status', value: 'PENDING' }], end, start, 0, 10),
    null
  );
  assert.equal(
    buildCriteria([{ key: 'status', value: 'PENDING' }], start, end, -1, 10),
    null
  );
  assert.equal(
    buildCriteria([{ key: 'status', value: 'PENDING' }], start, end, 0, 0),
    null
  );
  assert.equal(
    buildCriteria([{ key: 'status', value: 'PENDING' }], start, end, 0, 10, 0),
    null
  );
});

test('supported request analytics opens the real request search and detail workflow', () => {
  assert.doesNotMatch(analyticsIndex, /return\s*;\s*\/\/\s*TODO/);
  assert.match(
    analyticsModal,
    /api\s*\.post<Page<Request>>\(\s*'requests\/search'/
  );
  assert.match(
    analyticsModal,
    /navigate\(`\/app\/requests\/\$\{params\.row\.id\}`\)/
  );
  assert.match(analyticsModal, /paginationMode="server"/);
  assert.match(analyticsModal, /signal:\s*controller\.signal/);
});

test('cycle-time aggregates do not claim an inaccurate request drilldown', () => {
  assert.doesNotMatch(
    requestsByDate,
    /handleOpenModal|role="button"|onKeyDown/
  );
  assert.match(requestsByDate, /dot=\{\{/);
  assert.match(requestsByDate, /dataKey: 'cycleTime'/);
});
