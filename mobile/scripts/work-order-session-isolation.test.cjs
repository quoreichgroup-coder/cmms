const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

test('late work order details cannot repopulate Redux after a session reset', async () => {
  let resolveRequest;
  const runtime = mobileRuntime({
    apiMock: {
      get: () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    }
  });
  const { reducer, getWorkOrderDetails } = runtime.load('slices/workOrder.ts');
  const { revertAll } = runtime.load('utils/redux.ts');
  let state = reducer(undefined, { type: '@@init' });
  const getState = () => ({ workOrders: state });
  const dispatch = (action) => {
    if (typeof action === 'function') return action(dispatch, getState);
    state = reducer(state, action);
    return action;
  };

  const pending = dispatch(getWorkOrderDetails(24));
  dispatch(revertAll());
  assert.equal(state.sessionGeneration, 1);
  resolveRequest({ id: 24, title: 'Previous company work order' });
  await pending;

  assert.deepEqual(Object.keys(state.workOrderInfos), []);
  assert.deepEqual(Array.from(state.workOrders.content), []);
  assert.equal(state.sessionGeneration, 1);
});

test('late delete from the previous session cannot remove a current-session work order', () => {
  const { reducer, default: slice } = mobileRuntime().load(
    'slices/workOrder.ts'
  );
  const { revertAll } = mobileRuntime().load('utils/redux.ts');
  let state = reducer(undefined, { type: '@@init' });
  state = reducer(state, revertAll());
  state = reducer(
    state,
    slice.actions.addWorkOrder({
      workOrder: { id: 24, title: 'Current company work order' }
    })
  );
  state = reducer(
    state,
    slice.actions.deleteWorkOrder({ id: 24, sessionGeneration: 0 })
  );

  assert.equal(state.workOrders.content[0].id, 24);
  assert.equal(state.workOrders.content[0].title, 'Current company work order');
});
