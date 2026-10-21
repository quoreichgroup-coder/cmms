const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

function harness(apiMock) {
  const runtime = mobileRuntime({ apiMock });
  const module = runtime.load('slices/asset.ts');
  const { revertAll } = runtime.load('utils/redux.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const getState = () => ({ assets: state });
  const dispatch = (action) => {
    if (typeof action === 'function') return action(dispatch, getState);
    state = module.reducer(state, action);
    return action;
  };
  return {
    module,
    dispatch,
    getState,
    revertAll,
    get state() {
      return state;
    }
  };
}

test('late asset mini-list response is ignored after a session reset', async () => {
  let resolveRequest;
  const app = harness({
    get: () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
  });

  const pending = app.dispatch(app.module.getAssetsMini());
  app.dispatch(app.revertAll());
  resolveRequest([{ id: 81, name: 'Asset from previous company' }]);
  await pending;

  assert.deepEqual(Array.from(app.state.assetsMini), []);
  assert.equal(app.state.loadingGet, false);
  assert.equal(app.state.sessionGeneration, 1);
});

test('late asset detail response is ignored after a session reset', async () => {
  let resolveRequest;
  const app = harness({
    get: () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
  });

  const pending = app.dispatch(app.module.getAssetDetails(82));
  app.dispatch(app.revertAll());
  resolveRequest({ id: 82, name: 'Asset detail from previous company' });
  await pending;

  assert.deepEqual(Object.keys(app.state.assetInfos), []);
  assert.equal(app.state.loadingGet, false);
  assert.equal(app.state.sessionGeneration, 1);
});
