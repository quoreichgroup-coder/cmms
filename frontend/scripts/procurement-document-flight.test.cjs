const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadSingleFlight() {
  const exports = {};
  const source = fs.readFileSync('src/utils/runSingleFlight.ts', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText;
  vm.runInNewContext(compiled, { exports, Promise });
  return exports.runSingleFlight;
}

test('procurement document actions reject a duplicate while the first request is pending', async () => {
  const runSingleFlight = loadSingleFlight();
  const lock = { current: false };
  let completeFirst;
  let actionCount = 0;
  const first = runSingleFlight(lock, () => {
    actionCount += 1;
    return new Promise((resolve) => { completeFirst = resolve; });
  });

  const duplicateRan = await runSingleFlight(lock, async () => { actionCount += 1; });
  assert.equal(duplicateRan, false);
  assert.equal(actionCount, 1);
  assert.equal(lock.current, true);

  completeFirst();
  assert.equal(await first, true);
  assert.equal(lock.current, false);
});

test('procurement document action releases its lock after a failed request', async () => {
  const runSingleFlight = loadSingleFlight();
  const lock = { current: false };

  await assert.rejects(runSingleFlight(lock, async () => { throw new Error('request failed'); }), /request failed/);
  assert.equal(lock.current, false);
  assert.equal(await runSingleFlight(lock, async () => {}), true);
});
