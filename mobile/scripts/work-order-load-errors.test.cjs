const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('utils/workOrderLoadError.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports });
const { getWorkOrderLoadErrorKey } = moduleExports;

test('classifies Work Order API failures without exposing server messages', () => {
  assert.equal(
    getWorkOrderLoadErrorKey({ status: 403, message: 'Forbidden' }),
    'work_orders_access_error'
  );
  assert.equal(
    getWorkOrderLoadErrorKey({ status: 502, message: 'Database stack trace' }),
    'work_orders_server_error'
  );
  assert.equal(
    getWorkOrderLoadErrorKey({
      response: { status: 503 },
      message: 'Internal error'
    }),
    'work_orders_server_error'
  );
  assert.equal(
    getWorkOrderLoadErrorKey({ response: { status: 403 } }),
    'work_orders_access_error'
  );
  assert.equal(
    getWorkOrderLoadErrorKey({ code: 'REQUEST_TIMEOUT' }),
    'work_orders_network_error'
  );
  assert.equal(
    getWorkOrderLoadErrorKey({ message: 'Network Error' }),
    'work_orders_network_error'
  );
  assert.equal(
    getWorkOrderLoadErrorKey(new Error('Network request failed')),
    'work_orders_network_error'
  );
  assert.equal(
    getWorkOrderLoadErrorKey({ code: 'ERR_NETWORK' }),
    'work_orders_network_error'
  );
  assert.equal(
    getWorkOrderLoadErrorKey({ code: 'ECONNRESET' }),
    'work_orders_network_error'
  );
  assert.equal(
    getWorkOrderLoadErrorKey({ status: 422, message: 'Validation failed' }),
    'work_orders_load_error'
  );
  assert.equal(
    getWorkOrderLoadErrorKey({ message: 'Could not convert Timestamp' }),
    'work_orders_load_error'
  );
});

test('hides the pagination retry when Work Order search criteria are stale', () => {
  const screen = fs.readFileSync(
    'screens/workOrders/WorkOrdersScreen.tsx',
    'utf8'
  );

  assert.match(
    screen,
    /hasCurrentCriteriaResults && loadMoreError \? \(/,
    'a previous query’s load-more error must not show an inert retry during search debounce'
  );
});
