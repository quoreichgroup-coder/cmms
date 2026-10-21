const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

function harness(apiMock) {
  const runtime = mobileRuntime({ apiMock });
  const module = runtime.load('slices/request.ts');
  const { revertAll } = runtime.load('utils/redux.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const getState = () => ({ requests: state });
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

test('late Mobile request detail is ignored after a session reset', async () => {
  let resolveRequest;
  const app = harness({
    get: () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
  });

  const pending = app.dispatch(app.module.getRequestDetails(92));
  app.dispatch(app.revertAll());
  resolveRequest({ id: 92, title: 'Previous account request' });
  await pending;

  assert.deepEqual(Object.keys(app.state.requestInfos), []);
  assert.equal(app.state.sessionGeneration, 1);
});

test('late Mobile request list is ignored after a session reset', async () => {
  let resolveRequest;
  const app = harness({
    post: () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
  });

  const pending = app.dispatch(app.module.getRequests({ pageNum: 0 }));
  app.dispatch(app.revertAll());
  resolveRequest({
    content: [{ id: 93, title: 'Previous account request' }],
    last: true,
    totalElements: 1
  });
  await pending;

  assert.deepEqual(Array.from(app.state.requests.content), []);
  assert.equal(app.state.sessionGeneration, 1);
});
