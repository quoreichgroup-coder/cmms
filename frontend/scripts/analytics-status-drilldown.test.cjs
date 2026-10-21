const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/content/own/Analytics/WorkOrder/statusDrilldown.ts'
  ),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;
const drilldown = (() => {
  const exports = {};
  vm.runInNewContext(compiled, { exports });
  return exports;
})();

test('status drilldown keeps the selected period, tenant and server pagination', () => {
  const start = new Date('2026-10-01T00:00:00.000Z');
  const end = new Date('2026-10-20T23:59:59.999Z');
  const criteria = drilldown.buildStatusWorkOrderCriteria(
    'IN_PROGRESS',
    start,
    end,
    2,
    25,
    47
  );

  assert.equal(criteria.pageNum, 2);
  assert.equal(criteria.pageSize, 25);
  assert.equal(criteria.direction, 'DESC');
  assert.deepEqual(JSON.parse(JSON.stringify(criteria.filterFields)), [
    {
      field: 'status',
      operation: 'eq',
      value: 'IN_PROGRESS',
      enumName: 'STATUS'
    },
    {
      field: 'createdAt',
      operation: 'ge',
      value: start.toISOString(),
      enumName: 'JS_DATE'
    },
    {
      field: 'createdAt',
      operation: 'le',
      value: end.toISOString(),
      enumName: 'JS_DATE'
    },
    {
      field: 'company',
      operation: 'inm',
      joinType: 'LEFT',
      value: '',
      values: [47]
    }
  ]);
});

test('status drilldown rejects unsupported statuses, invalid dates and bad scope', () => {
  const start = new Date('2026-10-01T00:00:00.000Z');
  const end = new Date('2026-10-20T23:59:59.999Z');
  assert.equal(
    drilldown.buildStatusWorkOrderCriteria('COMPLETE', start, end, 0, 10),
    null
  );
  assert.equal(
    drilldown.buildStatusWorkOrderCriteria(
      'OPEN',
      new Date('invalid'),
      end,
      0,
      10
    ),
    null
  );
  assert.equal(
    drilldown.buildStatusWorkOrderCriteria('OPEN', end, start, 0, 10),
    null
  );
  assert.equal(
    drilldown.buildStatusWorkOrderCriteria('OPEN', start, end, -1, 10),
    null
  );
  assert.equal(
    drilldown.buildStatusWorkOrderCriteria('OPEN', start, end, 0, 10, 0),
    null
  );
});
