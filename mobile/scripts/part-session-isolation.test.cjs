const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

function harness(apiMock) {
  const runtime = mobileRuntime({ apiMock });
  const module = runtime.load('slices/part.ts');
  const { revertAll } = runtime.load('utils/redux.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const getState = () => ({ parts: state });
  const dispatch = (action) => {
    if (typeof action === 'function') return action(dispatch, getState);
    state = module.reducer(state, action);
    return action;
  };
  return {
    module,
    dispatch,
    revertAll,
    get state() {
      return state;
    }
  };
}

test('late part detail does not repopulate the previous account cache', async () => {
  let resolveRequest;
  const app = harness({
    get: () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
  });

  const pending = app.dispatch(app.module.getPartDetails(101));
  app.dispatch(app.revertAll());
  resolveRequest({ id: 101, name: 'Previous account spare part' });
  await pending;

  assert.deepEqual(Object.keys(app.state.partInfos), []);
  assert.equal(app.state.loadingGet, false);
  assert.equal(app.state.sessionGeneration, 1);
});

test('late parts mini-list does not repopulate after an account switch', async () => {
  let resolveRequest;
  const app = harness({
    get: () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
  });

  const pending = app.dispatch(app.module.getPartsMini());
  app.dispatch(app.revertAll());
  resolveRequest([{ id: 102, name: 'Previous account part' }]);
  await pending;

  assert.deepEqual(Array.from(app.state.partsMini), []);
  assert.equal(app.state.partsMiniLoading, false);
  assert.equal(app.state.sessionGeneration, 1);
});
