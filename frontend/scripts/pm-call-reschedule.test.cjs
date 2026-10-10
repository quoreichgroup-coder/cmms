const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

process.env.TZ = 'America/Los_Angeles';

const sourcePath = path.resolve(
  __dirname,
  '../src/utils/pmCallReschedule.ts'
);
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true
  }
}).outputText;
const helperModule = new Module(sourcePath, module);
helperModule.filename = sourcePath;
helperModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
helperModule._compile(compiled, sourcePath);
const {
  getDefaultRescheduleDate,
  getNextCompanyDateInput,
  getRescheduledCallDate,
  isRescheduledCallDateInFuture
} = helperModule.exports;

test('next reschedule date follows the company calendar, not browser timezone', () => {
  assert.equal(
    getNextCompanyDateInput('2026-03-08T00:00:00.000Z', 'UTC'),
    '2026-03-09'
  );
});

test('next reschedule date crosses a company daylight-saving boundary correctly', () => {
  assert.equal(
    getNextCompanyDateInput('2026-03-28T22:30:00.000Z', 'Europe/Berlin'),
    '2026-03-29'
  );
});

test('overdue calls default to tomorrow instead of another date in the past', () => {
  assert.equal(
    getDefaultRescheduleDate(
      '2026-10-01T10:00:00.000Z',
      new Date('2026-10-06T12:00:00.000Z'),
      'Europe/Berlin'
    ),
    '2026-10-07'
  );
});

test('future calls default to the day after their scheduled occurrence', () => {
  assert.equal(
    getDefaultRescheduleDate(
      '2026-10-10T10:00:00.000Z',
      new Date('2026-10-06T12:00:00.000Z'),
      'Europe/Berlin'
    ),
    '2026-10-11'
  );
});

test('rescheduled date preserves the occurrence time in the company timezone', () => {
  assert.equal(
    getRescheduledCallDate(
      '2026-10-07',
      '2026-10-06T13:29:00.000Z',
      'Europe/Berlin'
    ).toISOString(),
    '2026-10-07T13:29:00.000Z'
  );
});

test('reschedule validation matches the backend future-timestamp rule', () => {
  const now = new Date('2026-10-06T09:00:00.000Z');
  assert.equal(
    isRescheduledCallDateInFuture('2026-10-06', '2026-10-06T08:00:00.000Z', 'UTC', now),
    false
  );
  assert.equal(
    isRescheduledCallDateInFuture('2026-10-07', '2026-10-06T08:00:00.000Z', 'UTC', now),
    true
  );
});
