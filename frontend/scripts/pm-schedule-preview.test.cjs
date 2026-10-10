const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const sourcePath = path.resolve(
  __dirname,
  '../src/utils/pmSchedulePreview.ts'
);
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true
  }
}).outputText;
const previewModule = new Module(sourcePath, module);
previewModule.filename = sourcePath;
previewModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
previewModule._compile(compiled, sourcePath);
const { getPMBaseCycleNumber, getPMSchedulePreview } = previewModule.exports;

const dateStrings = (dates) => dates.map((date) => date.toISOString());

test('daily calendar recurrence preserves company wall-clock time over DST', () => {
  const dates = getPMSchedulePreview(
    {
      startsOn: '2026-10-24T07:00:00.000Z',
      frequency: 7,
      recurrenceType: { value: 'DAILY' },
      recurrenceBasedOn: { value: 'SCHEDULED_DATE' }
    },
    'Europe/Berlin',
    2,
    new Date('2026-10-24T06:00:00.000Z')
  );

  assert.deepEqual(dateStrings(dates), [
    '2026-10-24T07:00:00.000Z',
    '2026-10-31T08:00:00.000Z'
  ]);
});

test('weekly preview respects selected days and interval weeks', () => {
  const dates = getPMSchedulePreview(
    {
      startsOn: '2026-10-21T07:00:00.000Z',
      frequency: 2,
      recurrenceType: { value: 'WEEKLY' },
      recurrenceBasedOn: { value: 'SCHEDULED_DATE' },
      daysOfWeek: [{ value: 0 }]
    },
    'Europe/Berlin',
    2,
    new Date('2026-10-20T00:00:00.000Z')
  );

  assert.deepEqual(dateStrings(dates), [
    '2026-10-26T08:00:00.000Z',
    '2026-11-09T08:00:00.000Z'
  ]);
});

test('preview is bounded by schedule end date and requires weekly days', () => {
  const common = {
    startsOn: '2026-10-24T07:00:00.000Z',
    frequency: 1,
    recurrenceType: 'DAILY',
    recurrenceBasedOn: 'SCHEDULED_DATE'
  };
  assert.equal(
    getPMSchedulePreview(
      { ...common, endsOn: '2026-10-30T08:00:00.000Z' },
      'Europe/Berlin',
      8,
      new Date('2026-10-24T06:00:00.000Z')
    ).length,
    7
  );
  assert.deepEqual(
    getPMSchedulePreview(
      { ...common, recurrenceType: 'WEEKLY' },
      'Europe/Berlin',
      8,
      new Date('2026-10-24T06:00:00.000Z')
    ),
    []
  );
});

test('long-running plans fast-forward to the next date instead of truncating history', () => {
  const dates = getPMSchedulePreview(
    {
      startsOn: '2000-01-01T09:00:00.000Z',
      frequency: 1,
      recurrenceType: 'DAILY'
    },
    'UTC',
    2,
    new Date('2026-10-04T10:00:00.000Z')
  );

  assert.deepEqual(dateStrings(dates), [
    '2026-10-05T09:00:00.000Z',
    '2026-10-06T09:00:00.000Z'
  ]);
});

test('strategy cycle numbering remains anchored to the original start date', () => {
  const schedule = {
    startsOn: '2000-01-03T09:00:00.000Z',
    frequency: 1,
    recurrenceType: 'WEEKLY',
    daysOfWeek: [{ value: 0 }]
  };

  assert.equal(getPMBaseCycleNumber(schedule, '2026-10-12T09:00:00.000Z', 'UTC'), 1398);
  assert.equal(getPMBaseCycleNumber(schedule, '2026-10-19T09:00:00.000Z', 'UTC'), 1399);
});
