const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const sourcePath = path.resolve(__dirname, '../src/utils/pmMeterReference.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019
  }
}).outputText;
const helperModule = new Module(sourcePath, module);
helperModule.filename = sourcePath;
helperModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
helperModule._compile(compiled, sourcePath);
const { getAutoMeterReferenceValue, getLatestMeterReadingValue } = helperModule.exports;

test('meter PM reference defaults to the latest actual reading', () => {
  assert.equal(getAutoMeterReferenceValue(null, null, 125.5), 125.5);
});

test('meter PM without readings defaults to zero', () => {
  assert.equal(getAutoMeterReferenceValue(undefined, null, undefined), 0);
});

test('selecting another meter refreshes an untouched automatic reference', () => {
  assert.equal(getAutoMeterReferenceValue(125.5, 125.5, 310), 310);
});

test('manually entered or saved meter references are preserved', () => {
  assert.equal(getAutoMeterReferenceValue(80, null, 125.5), null);
  assert.equal(getAutoMeterReferenceValue(80, 125.5, 310), null);
});

test('latest actual reading uses the same timestamp and id ordering as the API', () => {
  assert.equal(
    getLatestMeterReadingValue([
      { id: 12, createdAt: '2026-10-05T10:00:00.000Z', value: 125 },
      { id: 13, createdAt: '2026-10-05T10:00:00.000Z', value: 130 },
      { id: 14, createdAt: '2026-10-04T10:00:00.000Z', value: 200 }
    ]),
    130
  );
});
