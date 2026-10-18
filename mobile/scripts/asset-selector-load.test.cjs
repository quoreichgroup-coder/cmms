const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

test('asset mini-list failure releases loading and retains its cache', async () => {
  const runtime = mobileRuntime({
    apiMock: {
      get: async () => {
        throw new Error('network unavailable');
      }
    }
  });
  const assetSlice = runtime.load('slices/asset.ts');
  let state = assetSlice.reducer(undefined, { type: '@@init' });
  const cachedAssets = [{ id: 12, name: 'Pump', parentId: null }];
  state = assetSlice.reducer(state, {
    type: 'assets/getAssetsMini',
    payload: { assets: cachedAssets }
  });

  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = assetSlice.reducer(state, action)), action);

  await assert.rejects(
    dispatch(assetSlice.getAssetsMini(4)),
    /network unavailable/
  );
  assert.equal(state.loadingGet, false);
  assert.deepEqual(
    Array.from(state.assetsMini, ({ id }) => id),
    [12]
  );

  const screen = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectAssetsModal.tsx'),
    'utf8'
  );
  assert.match(screen, /setLoadError\(true\)/);
  assert.match(
    screen,
    /visibleAssetsMini = hasLoadedForLocation \? assetsMini : \[\]/
  );
  assert.match(screen, /message=\{t\('asset_list_load_error'\)\}/);
  assert.match(screen, /onRetry=\{\(\) => void loadAssets\(\)\}/);
  assert.match(screen, /loadRequestRef\.current/);
});
