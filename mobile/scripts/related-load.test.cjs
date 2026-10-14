const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const useRelatedWorkOrdersLoad = mobileRuntime().load(
  'hooks/useRelatedWorkOrdersLoad.ts'
).default;

function Probe({ resourceId, onState }) {
  onState(useRelatedWorkOrdersLoad(resourceId));
  return null;
}

test('related list starts in loading state and follows resource changes before effects', async () => {
  let state;
  const onState = (nextState) => {
    state = nextState;
  };
  let renderer;

  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(
      React.createElement(Probe, { resourceId: 11, onState })
    );
  });
  assert.equal(state.loading, true);
  assert.equal(state.error, false);

  await TestRenderer.act(async () => {
    renderer.update(React.createElement(Probe, { resourceId: 12, onState }));
  });
  assert.equal(state.loading, true);
  assert.equal(state.error, false);

  renderer.unmount();
});

test('a stale related-list response cannot replace the latest request state', async () => {
  let state;
  const onState = (nextState) => {
    state = nextState;
  };
  let renderer;

  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(
      React.createElement(Probe, { resourceId: 21, onState })
    );
  });

  let resolveOlder;
  let resolveNewer;
  let olderRequest;
  let newerRequest;
  await TestRenderer.act(async () => {
    olderRequest = state.run(
      21,
      () =>
        new Promise((resolve) => {
          resolveOlder = resolve;
        })
    );
    newerRequest = state.run(
      21,
      () =>
        new Promise((resolve) => {
          resolveNewer = resolve;
        })
    );
  });

  await TestRenderer.act(async () => {
    resolveOlder();
    await olderRequest;
  });
  assert.equal(state.loading, true);
  assert.equal(state.error, false);

  await TestRenderer.act(async () => {
    resolveNewer();
    await newerRequest;
  });
  assert.equal(state.loading, false);
  assert.equal(state.error, false);

  renderer.unmount();
});

test('asset-related work orders are hidden from roles without WO view access', () => {
  const { getVisibleAssetWorkOrders } = mobileRuntime().load(
    'utils/assetWorkOrderAccess.ts'
  );
  const cachedWorkOrders = [{ id: 1, title: 'Conveyor inspection' }];

  assert.equal(getVisibleAssetWorkOrders(false, cachedWorkOrders).length, 0);
  assert.equal(
    getVisibleAssetWorkOrders(true, cachedWorkOrders),
    cachedWorkOrders
  );
  assert.equal(getVisibleAssetWorkOrders(true, undefined).length, 0);
});
