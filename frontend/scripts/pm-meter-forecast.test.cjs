const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const moduleExports = {};
const source = ts.transpileModule(
  fs.readFileSync('src/utils/pmMeterForecast.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }
).outputText;
vm.runInNewContext(source, { exports: moduleExports });
const { estimateMeterTargetDate } = moduleExports;

test('estimates a future target from dated increasing readings', () => {
  const date = estimateMeterTargetDate([
    { id: 1, value: 0, createdAt: '2026-01-01T00:00:00Z' },
    { id: 2, value: 10, createdAt: '2026-01-11T00:00:00Z' }
  ], 20);
  assert.equal(date.toISOString(), '2026-01-21T00:00:00.000Z');
});

test('uses the latest five readings to estimate current usage', () => {
  const date = estimateMeterTargetDate([
    { id: 1, value: 0, createdAt: '2026-01-01T00:00:00Z' },
    { id: 2, value: 100, createdAt: '2026-01-02T00:00:00Z' },
    { id: 3, value: 0, createdAt: '2026-01-03T00:00:00Z' },
    { id: 4, value: 1, createdAt: '2026-01-04T00:00:00Z' },
    { id: 5, value: 2, createdAt: '2026-01-05T00:00:00Z' },
    { id: 6, value: 3, createdAt: '2026-01-06T00:00:00Z' },
    { id: 7, value: 4, createdAt: '2026-01-07T00:00:00Z' }
  ], 5);
  assert.equal(date.toISOString(), '2026-01-08T00:00:00.000Z');
});

test('does not forecast with insufficient, stale, decreasing, or invalid readings', () => {
  assert.equal(estimateMeterTargetDate([], 10), undefined);
  assert.equal(estimateMeterTargetDate([
    { id: 1, value: 0, createdAt: '2026-01-01T00:00:00Z' }
  ], 10), undefined);
  assert.equal(estimateMeterTargetDate([
    { id: 1, value: 10, createdAt: '2026-01-01T00:00:00Z' },
    { id: 2, value: 9, createdAt: '2026-01-02T00:00:00Z' }
  ], 20), undefined);
  assert.equal(estimateMeterTargetDate([
    { id: 1, value: 1, createdAt: 'invalid' },
    { id: 2, value: 2, createdAt: '2026-01-02T00:00:00Z' }
  ], 10), undefined);
});
