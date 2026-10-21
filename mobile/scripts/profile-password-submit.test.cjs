const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'screens/peopleTeams/Profile.tsx'),
  'utf8'
);

test('password update uses a synchronous lock around the existing auth call', async () => {
  assert.match(
    source,
    /changePasswordLockRef\.current = createAsyncActionLock\(\)/
  );
  assert.ok(source.includes('return changePasswordLock(async () => {'));
  assert.ok(source.includes('await updatePassword(_values)'));
  assert.ok(
    source.includes("showSnackBar(t('password_change_success'), 'success')")
  );
  assert.ok(source.includes("showSnackBar(t('wrong_password'), 'error')"));

  const run = mobileRuntime()
    .load('utils/asyncActionLock.ts')
    .createAsyncActionLock();
  let release;
  let calls = 0;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const updatePassword = async () => {
    calls += 1;
    await pending;
  };
  const submit = () =>
    run(async () => {
      await updatePassword();
      return 'updated';
    });

  const first = submit();
  const second = submit();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await Promise.all([first, second]), ['updated', 'updated']);
});

test('a failed password update allows the user to retry', async () => {
  const run = mobileRuntime()
    .load('utils/asyncActionLock.ts')
    .createAsyncActionLock();
  await assert.rejects(
    run(async () => {
      throw new Error('rejected');
    })
  );
  assert.equal(await run(async () => 'retry'), 'retry');
});
