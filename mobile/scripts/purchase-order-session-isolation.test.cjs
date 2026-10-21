const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const emptyPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  last: true,
  size: 10,
  number: 0,
  numberOfElements: 0,
  first: true,
  empty: true,
  sort: { empty: true, sorted: true, unsorted: false }
};

test('late purchase order reads cannot repopulate state after a session reset', async () => {
  let resolveRequest;
  const apiMock = {
    post: () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
  };
  const runtime = mobileRuntime({ apiMock });
  const { reducer, getPurchaseOrders } = runtime.load(
    'slices/purchaseOrder.ts'
  );
  const { revertAll } = runtime.load('utils/redux.ts');
  let state = reducer(undefined, { type: 'test/init' });
  const getState = () => ({ purchaseOrders: state });
  const dispatch = (action) => {
    if (typeof action === 'function') return action(dispatch, getState);
    state = reducer(state, action);
    return action;
  };

  const pending = dispatch(getPurchaseOrders({ filterFields: [] }));
  assert.equal(state.loadingGet, true);
  dispatch(revertAll());
  assert.equal(state.requestGeneration, 1);
  resolveRequest({ ...emptyPage, content: [{ id: 71, number: 'PO-OLD' }] });
  await pending;

  assert.deepEqual(Array.from(state.purchaseOrders.content), []);
  assert.equal(state.singlePurchaseOrder, null);
  assert.equal(state.loadingGet, false);
  assert.equal(state.requestGeneration, 1);
});

test('purchase order reads and pagination populate the active session normally', async () => {
  const expected = {
    ...emptyPage,
    content: [{ id: 72, number: 'PO-CURRENT' }]
  };
  const nextPage = { ...emptyPage, content: [{ id: 73, number: 'PO-NEXT' }] };
  let requestCount = 0;
  const runtime = mobileRuntime({
    apiMock: { post: async () => (requestCount++ === 0 ? expected : nextPage) }
  });
  const { reducer, getPurchaseOrders, getMorePurchaseOrders } = runtime.load(
    'slices/purchaseOrder.ts'
  );
  let state = reducer(undefined, { type: 'test/init' });
  const getState = () => ({ purchaseOrders: state });
  const dispatch = (action) => {
    if (typeof action === 'function') return action(dispatch, getState);
    state = reducer(state, action);
    return action;
  };

  await dispatch(getPurchaseOrders({ filterFields: [] }));
  await dispatch(getMorePurchaseOrders({ filterFields: [] }, 1));

  assert.deepEqual(Array.from(state.purchaseOrders.content), [
    ...expected.content,
    ...nextPage.content
  ]);
  assert.equal(state.loadingGet, false);
});
