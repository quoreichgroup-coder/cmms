const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const scenarios = [
  {
    name: 'work order detail',
    modulePath: 'slices/workOrder.ts',
    thunk: (module) => module.getWorkOrderDetails(24),
    listLoadingAction: (slice) => slice.actions.beginListRequest(1),
    response: { id: 24, title: 'Pump inspection' }
  },
  {
    name: 'request detail',
    modulePath: 'slices/request.ts',
    thunk: (module) => module.getRequestDetails(42),
    listLoadingAction: (slice) => slice.actions.beginListRequest(1),
    response: { id: 42, description: 'Inspect pump seal' }
  },
  {
    name: 'location work order list',
    modulePath: 'slices/workOrder.ts',
    thunk: (module) => module.getWorkOrdersByLocation(7),
    listLoadingAction: (slice) => slice.actions.beginListRequest(1),
    response: [{ id: 24, title: 'Pump inspection' }]
  }
];

for (const scenario of scenarios) {
  test(`${scenario.name} loading never changes the shared list loading flag`, async () => {
    const module = mobileRuntime({
      apiMock: { get: async () => scenario.response }
    }).load(scenario.modulePath);
    const slice = module.default;
    let state = module.reducer(undefined, { type: '@@init' });
    state = module.reducer(state, scenario.listLoadingAction(slice));
    assert.equal(state.loadingGet, true);
    const dispatchedTypes = [];
    const dispatch = (action) => {
      if (typeof action === 'function')
        return action(dispatch, () => state, null);
      dispatchedTypes.push(action.type);
      state = module.reducer(state, action);
      return action;
    };

    await dispatch(scenario.thunk(module));

    assert.equal(state.loadingGet, true);
    assert.equal(
      dispatchedTypes.some((type) => type.endsWith('/setLoadingGet')),
      false
    );
  });

  test(`${scenario.name} failure leaves shared list loading untouched`, async () => {
    const failure = new Error('network unavailable');
    const module = mobileRuntime({
      apiMock: {
        get: async () => {
          throw failure;
        }
      }
    }).load(scenario.modulePath);
    const slice = module.default;
    let state = module.reducer(undefined, { type: '@@init' });
    const dispatch = (action) => {
      if (typeof action === 'function')
        return action(dispatch, () => state, null);
      state = module.reducer(state, action);
      return action;
    };

    await assert.rejects(dispatch(scenario.thunk(module)), failure);
    assert.equal(state.loadingGet, false);
  });
}
