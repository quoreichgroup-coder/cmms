const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '../src/utils/importPayload.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports });

test('round-trip hierarchy export keeps API keys and excludes readable path columns', () => {
  const exchangeId = '58cbb5c0-b504-4ad1-85f2-98d7a126f18f';
  const parentExchangeId = '20b8d4dd-9fd9-4dd6-a1f3-3dc20c6263e2';
  const payload = moduleExports.buildImportPayload(
    [
      {
        Exchange_ID: exchangeId,
        Parent_Exchange_ID: parentExchangeId,
        Location_Exchange_ID: 'dcae1065-f7a3-4ad5-a858-91ad20fd0611',
        Equipment_Hierarchy_Path: 'Plant A / Pump Train / Pump 01',
        Functional_Location_Path: 'Plant A / Utilities / Water'
      }
    ],
    [
      { keyName: 'exchangeId' },
      { keyName: 'parentExchangeId' },
      { keyName: 'locationExchangeId' }
    ],
    [
      { keyName: 'exchangeId', userHeader: 'Exchange_ID' },
      { keyName: 'parentExchangeId', userHeader: 'Parent_Exchange_ID' },
      { keyName: 'locationExchangeId', userHeader: 'Location_Exchange_ID' }
    ]
  );

  assert.deepEqual(JSON.parse(JSON.stringify(payload)), [
    {
      exchangeId,
      parentExchangeId,
      locationExchangeId: 'dcae1065-f7a3-4ad5-a858-91ad20fd0611'
    }
  ]);
});

test('import payload retains existing formatters and ignores unmapped columns', () => {
  const payload = moduleExports.buildImportPayload(
    [{ Emails: 'tech@example.com,planner@example.com', Extra: 'ignored' }],
    [
      {
        keyName: 'assignedToEmails',
        formatter: (value) => value?.split(',') ?? []
      }
    ],
    [{ keyName: 'assignedToEmails', userHeader: 'Emails' }]
  );

  assert.deepEqual(JSON.parse(JSON.stringify(payload)), [
    { assignedToEmails: ['tech@example.com', 'planner@example.com'] }
  ]);
});
