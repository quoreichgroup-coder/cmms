const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const { dispatchAfterDiscard } = mobileRuntime().load(
  'utils/unsavedChanges.ts'
);

test('discard clears the navigation guard before replaying the blocked action', () => {
  const dirtyRef = { current: true };
  let dispatchCount = 0;

  dispatchAfterDiscard(dirtyRef, () => {
    dispatchCount += 1;
    assert.equal(dirtyRef.current, false);
  });

  assert.equal(dispatchCount, 1);
  assert.equal(dirtyRef.current, false);
});
