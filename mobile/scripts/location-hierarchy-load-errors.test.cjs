const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

test('failed hierarchy loads stay distinguishable from an actually empty site', async () => {
  const runtime = mobileRuntime({
    timers: { __DEV__: false },
    apiMock: {
      get: async () => {
        throw new Error('network unavailable');
      }
    }
  });
  const locations = runtime.load('slices/location.ts');
  let state = locations.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = locations.reducer(state, action)), action);

  await dispatch(locations.getLocationChildren(0, []));

  assert.equal(state.locationChildrenLoadErrors[0], true);
  assert.equal(state.loadingGet, false);
  assert.equal(state.locationsHierarchy.length, 0);
});

test('a successful hierarchy retry clears the parent load error', async () => {
  let fail = true;
  const runtime = mobileRuntime({
    timers: { __DEV__: false },
    apiMock: {
      get: async () => {
        if (fail) throw new Error('network unavailable');
        return {
          content: [
            {
              id: 9,
              name: 'Crusher area',
              hierarchy: [],
              hasChildren: false
            }
          ],
          last: true
        };
      }
    }
  });
  const locations = runtime.load('slices/location.ts');
  let state = locations.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = locations.reducer(state, action)), action);

  await dispatch(locations.getLocationChildren(0, []));
  assert.equal(state.locationChildrenLoadErrors[0], true);

  fail = false;
  await dispatch(locations.getLocationChildren(0, []));
  assert.equal(state.locationChildrenLoadErrors[0], false);
  assert.deepEqual(
    Array.from(state.locationsHierarchy, ({ id }) => id),
    [9]
  );
});

test('Locations hierarchy exposes retry feedback instead of reporting empty data', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/locations/LocationsScreen.tsx'),
    'utf8'
  );
  assert.match(
    source,
    /locationChildrenLoadErrors\[route\.params\?\.id \?\? 0\]/
  );
  assert.match(
    source,
    /currentChildrenLoadError \? \([\s\S]*?mode="error"[\s\S]*?message=\{t\('locations_load_error'\)\}[\s\S]*?onRetry=\{onRefresh\}/
  );
  assert.match(
    source,
    /currentChildrenLoadError && currentLocations\.length > 0 \? \([\s\S]*?mode="banner"/
  );
});
