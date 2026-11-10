const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const sourcePath = path.resolve(__dirname, '../src/utils/approvalCoverage.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }
}).outputText;
const coverageModule = new Module(sourcePath, module);
coverageModule.filename = sourcePath;
coverageModule._compile(compiled, sourcePath);
const { findAmountGaps, formatAmountGap } = coverageModule.exports;

const policy = (...conditions) => ({
  conditions: conditions.map(([operator, value]) => ({ operator, value: String(value) }))
});
const text = (gaps) => gaps.map((gap) => formatAmountGap(gap, String, 'and'));

test('no active policy means no approval, so nothing is reported', () => {
  assert.deepEqual(findAmountGaps([]), []);
});

test('a policy without conditions covers every amount', () => {
  assert.deepEqual(findAmountGaps([policy(), policy(['GREATER_THAN', 1000])]), []);
});

test('only large amounts covered: small amounts are a gap', () => {
  assert.deepEqual(text(findAmountGaps([policy(['GREATER_THAN', 1000])])), ['≥ 0 and ≤ 1000']);
});

test('adjacent ranges with matching bounds leave no gap', () => {
  const gaps = findAmountGaps([
    policy(['LESS_THAN', 1000]),
    policy(['GREATER_THAN_OR_EQUAL', 1000])
  ]);
  assert.deepEqual(gaps, []);
});

test('two strict bounds on the same value leave that exact value uncovered', () => {
  const gaps = findAmountGaps([policy(['LESS_THAN', 1000]), policy(['GREATER_THAN', 1000])]);
  assert.deepEqual(text(gaps), ['= 1000']);
});

test('a missing middle range and an open top are both reported', () => {
  const gaps = findAmountGaps([
    policy(['LESS_THAN_OR_EQUAL', 500]),
    policy(['GREATER_THAN', 1000], ['LESS_THAN_OR_EQUAL', 5000])
  ]);
  assert.deepEqual(text(gaps), ['> 500 and ≤ 1000', '> 5000']);
});

test('a value excluded by NOT_EQUALS is a gap unless another policy accepts it', () => {
  assert.deepEqual(text(findAmountGaps([policy(['NOT_EQUALS', 0])])), ['= 0']);
  assert.deepEqual(findAmountGaps([policy(['NOT_EQUALS', 0]), policy(['EQUALS', 0])]), []);
});
