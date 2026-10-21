const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'screens/meters/MeterDetails.tsx'),
  'utf8'
);

test('meter reading submission coalesces rapid taps and permits retry', async () => {
  assert.match(source, /addReadingLockRef.current = createAsyncActionLock()/);
  assert.ok(source.includes('return addReadingLock(async () => {'));
  assert.ok(
    source.includes('dispatch(createReading(meter.id, { value: parsedValue }))')
  );

  const run = mobileRuntime()
    .load('utils/asyncActionLock.ts')
    .createAsyncActionLock();
  let release;
  let calls = 0;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const create = async () => {
    calls += 1;
    await pending;
    return 'created';
  };

  const first = run(create);
  const second = run(create);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await Promise.all([first, second]), ['created', 'created']);
  assert.equal(await run(create), 'created');
  assert.equal(calls, 2);
});

test('a failed meter reading request releases the submission lock for retry', async () => {
  const run = mobileRuntime()
    .load('utils/asyncActionLock.ts')
    .createAsyncActionLock();
  await assert.rejects(
    run(async () => {
      throw new Error('network');
    })
  );
  assert.equal(await run(async () => 'retried'), 'retried');
});
