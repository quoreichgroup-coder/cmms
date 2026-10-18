const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

test('deleting an asset absent from the current page leaves visible assets intact', () => {
  const { reducer } = mobileRuntime().load('slices/asset.ts');
  let state = reducer(undefined, { type: '@@init' });
  state = {
    ...state,
    assets: {
      ...state.assets,
      content: [
        { id: 10, name: 'Conveyor motor' },
        { id: 11, name: 'Transfer belt' }
      ]
    }
  };

  const nextState = reducer(state, {
    type: 'assets/deleteAsset',
    payload: { id: 99 }
  });

  assert.deepEqual(
    nextState.assets.content.map(({ id }) => id),
    [10, 11]
  );
});

test('deleting an asset on the current page removes only the matching asset', () => {
  const { reducer } = mobileRuntime().load('slices/asset.ts');
  let state = reducer(undefined, { type: '@@init' });
  state = {
    ...state,
    assets: {
      ...state.assets,
      content: [
        { id: 10, name: 'Conveyor motor' },
        { id: 11, name: 'Transfer belt' }
      ]
    }
  };

  const nextState = reducer(state, {
    type: 'assets/deleteAsset',
    payload: { id: 10 }
  });

  assert.deepEqual(
    nextState.assets.content.map(({ id }) => id),
    [11]
  );
});
