const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

test('part detail failure clears loading and remains available to the screen', async () => {
  const failure = new Error('network unavailable');
  const runtime = mobileRuntime({
    apiMock: {
      get: async () => {
        throw failure;
      }
    }
  });
  const { reducer, getPartDetails } = runtime.load('slices/part.ts');
  let state = reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = reducer(state, action)), action);

  await assert.rejects(dispatch(getPartDetails(42)), failure);
  assert.equal(state.loadingGet, false);
  assert.equal(state.partInfos[42], undefined);

  const screen = fs.readFileSync(
    path.join(__dirname, '..', 'screens/parts/details/index.tsx'),
    'utf8'
  );
  assert.match(screen, /catch\s*\(_error\)\s*\{\s*setPartLoadError\(true\);/);
  assert.match(
    screen,
    /mode="error"[\s\S]*?onRetry=\{\(\)\s*=>\s*void loadPart\(\)\}/
  );
});
