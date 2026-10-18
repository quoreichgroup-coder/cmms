const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const catalogs = [
  {
    slice: 'slices/team.ts',
    stateKey: 'teamsMini',
    reducerKey: 'teams',
    getAction: 'getTeamsMini',
    thunk: 'getTeamsMini',
    screen: 'screens/modals/SelectTeamsModal.tsx',
    loader: 'loadTeams'
  },
  {
    slice: 'slices/customer.ts',
    stateKey: 'customersMini',
    reducerKey: 'customers',
    getAction: 'getCustomersMini',
    thunk: 'getCustomersMini',
    screen: 'screens/modals/SelectCustomersModal.tsx',
    loader: 'loadCustomers'
  },
  {
    slice: 'slices/vendor.ts',
    stateKey: 'vendorsMini',
    reducerKey: 'vendors',
    getAction: 'getVendorsMini',
    thunk: 'getVendorsMini',
    screen: 'screens/modals/SelectVendorsModal.tsx',
    loader: 'loadVendors'
  },
  {
    slice: 'slices/user.ts',
    stateKey: 'usersMini',
    reducerKey: 'users',
    getAction: 'getUsersMini',
    thunk: 'getUsersMini',
    screen: 'screens/modals/SelectUsersModal.tsx',
    loader: 'loadUsers'
  }
];

for (const catalog of catalogs) {
  test(`${catalog.stateKey} selector can recover after a failed load`, async () => {
    const runtime = mobileRuntime({
      apiMock: {
        get: async () => {
          throw new Error('network unavailable');
        }
      }
    });
    const slice = runtime.load(catalog.slice);
    let state = slice.reducer(undefined, { type: '@@init' });
    const cachedRows = [{ id: 7, name: 'Cached selection' }];
    state = slice.reducer(state, {
      type: `${catalog.reducerKey}/${catalog.getAction}`,
      payload: {
        [catalog.stateKey]: cachedRows,
        teams: cachedRows,
        customers: cachedRows,
        vendors: cachedRows,
        users: cachedRows
      }
    });
    const dispatch = (action) =>
      typeof action === 'function'
        ? action(dispatch, () => state, null)
        : ((state = slice.reducer(state, action)), action);

    await assert.rejects(
      dispatch(slice[catalog.thunk]()),
      /network unavailable/
    );
    assert.equal(state.loadingGet, false);
    assert.deepEqual(
      Array.from(state[catalog.stateKey], ({ id }) => id),
      [7]
    );

    const screen = fs.readFileSync(
      path.join(__dirname, '..', catalog.screen),
      'utf8'
    );
    assert.match(screen, /setLoadError\(true\)/);
    assert.match(screen, /mode="error"/);
    assert.match(
      screen,
      new RegExp(`onRetry=\\{\\(\\) => void ${catalog.loader}\\(\\)\\}`)
    );
    assert.match(screen, /mode="banner"/);
  });
}
