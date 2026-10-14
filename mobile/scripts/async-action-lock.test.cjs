const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const { createAsyncActionLock } = mobileRuntime().load(
  'utils/asyncActionLock.ts'
);

test('concurrent form submits share one in-flight action and allow retry', async () => {
  const run = createAsyncActionLock();
  let release;
  let calls = 0;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const action = async () => {
    calls += 1;
    await pending;
    return 'saved';
  };

  const first = run(action);
  const second = run(action);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await Promise.all([first, second]), ['saved', 'saved']);

  assert.equal(await run(action), 'saved');
  assert.equal(calls, 2);
});

test('form submit lock releases after a failed request', async () => {
  const run = createAsyncActionLock();
  await assert.rejects(
    run(async () => {
      throw new Error('network');
    })
  );
  assert.equal(await run(async () => 'retried'), 'retried');
});
