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
    getWorkOrderLoadErrorKey({ code: 'REQUEST_TIMEOUT' }),
    'work_orders_network_error'
  );
  assert.equal(
    getWorkOrderLoadErrorKey({ message: 'Network Error' }),
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
