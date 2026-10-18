const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const categoryBasePath = 'work-order-categories';

const cases = [
  {
    file: 'slices/category.ts',
    slice: 'categories',
    action: 'deleteCategory',
    seed(state, rows) {
      return {
        ...state,
        categories: { ...state.categories, [categoryBasePath]: rows }
      };
    },
    getRows: (state) => state.categories[categoryBasePath],
    payload: (id) => ({ id, basePath: categoryBasePath })
  },
  {
    file: 'slices/role.ts',
    slice: 'roles',
    action: 'deleteRole',
    seed: (state, roles) => ({ ...state, roles }),
    getRows: (state) => state.roles,
    payload: (id) => ({ id })
  },
  {
    file: 'slices/team.ts',
    slice: 'teams',
    action: 'deleteTeam',
    seed: (state, rows) => ({
      ...state,
      teams: { ...state.teams, content: rows }
    }),
    getRows: (state) => state.teams.content,
    payload: (id) => ({ id })
  },
  {
    file: 'slices/meter.ts',
    slice: 'meters',
    action: 'deleteMeter',
    seed: (state, rows) => ({
      ...state,
      meters: { ...state.meters, content: rows }
    }),
    getRows: (state) => state.meters.content,
    payload: (id) => ({ id })
  },
  {
    file: 'slices/file.ts',
    slice: 'files',
    action: 'deleteFile',
    seed: (state, rows) => ({
      ...state,
      files: { ...state.files, content: rows }
    }),
    getRows: (state) => state.files.content,
    payload: (id) => ({ id })
  },
  {
    file: 'slices/checklist.ts',
    slice: 'checklists',
    action: 'deleteChecklist',
    seed: (state, checklists) => ({ ...state, checklists }),
    getRows: (state) => state.checklists,
    payload: (id) => ({ id })
  },
  {
    file: 'slices/workflow.ts',
    slice: 'workflows',
    action: 'deleteWorkflow',
    seed: (state, workflows) => ({ ...state, workflows }),
    getRows: (state) => state.workflows,
    payload: (id) => ({ id })
  },
  {
    file: 'slices/purchaseOrder.ts',
    slice: 'purchaseOrders',
    action: 'deletePurchaseOrder',
    seed: (state, rows) => ({
      ...state,
      purchaseOrders: { ...state.purchaseOrders, content: rows }
    }),
    getRows: (state) => state.purchaseOrders.content,
    payload: (id) => ({ id })
  },
  {
    file: 'slices/multipart.ts',
    slice: 'multiParts',
    action: 'deleteMultiParts',
    seed: (state, multiParts) => ({ ...state, multiParts }),
    getRows: (state) => state.multiParts,
    payload: (id) => ({ id })
  },
  {
    file: 'slices/vendor.ts',
    slice: 'vendors',
    action: 'deleteVendor',
    seed: (state, rows) => ({
      ...state,
      vendors: { ...state.vendors, content: rows }
    }),
    getRows: (state) => state.vendors.content,
    payload: (id) => ({ id })
  },
  {
    file: 'slices/user.ts',
    slice: 'users',
    action: 'deleteUser',
    seed: (state, rows) => ({
      ...state,
      users: { ...state.users, content: rows }
    }),
    getRows: (state) => state.users.content,
    payload: (id) => ({ id })
  },
  {
    file: 'slices/customer.ts',
    slice: 'customers',
    action: 'deleteCustomer',
    seed: (state, rows) => ({
      ...state,
      customers: { ...state.customers, content: rows }
    }),
    getRows: (state) => state.customers.content,
    payload: (id) => ({ id })
  }
];

for (const config of cases) {
  test(`${config.file} preserves state if a delete id is not on the current list`, () => {
    const { reducer } = mobileRuntime().load(config.file);
    const initialState = reducer(undefined, { type: '@@init' });
    const state = config.seed(initialState, [{ id: 10 }, { id: 11 }]);

    const nextState = reducer(state, {
      type: `${config.slice}/${config.action}`,
      payload: config.payload(99)
    });

    assert.deepEqual(
      config.getRows(nextState).map(({ id }) => id),
      [10, 11]
    );
  });

  test(`${config.file} removes only the matching item`, () => {
    const { reducer } = mobileRuntime().load(config.file);
    const initialState = reducer(undefined, { type: '@@init' });
    const state = config.seed(initialState, [{ id: 10 }, { id: 11 }]);

    const nextState = reducer(state, {
      type: `${config.slice}/${config.action}`,
      payload: config.payload(10)
    });

    assert.deepEqual(
      config.getRows(nextState).map(({ id }) => id),
      [11]
    );
  });
}

const cacheCases = [
  {
    file: 'slices/team.ts',
    slice: 'teams',
    action: 'deleteTeam',
    seed(state, rows) {
      return {
        ...state,
        teamsMini: rows,
        teamInfos: { 10: { team: rows[0] }, 11: { team: rows[1] } }
      };
    },
    check(state) {
      assert.deepEqual(
        state.teamsMini.map(({ id }) => id),
        [11]
      );
      assert.deepEqual(Object.keys(state.teamInfos), ['11']);
    }
  },
  {
    file: 'slices/meter.ts',
    slice: 'meters',
    action: 'deleteMeter',
    seed(state, rows) {
      return {
        ...state,
        metersMini: rows,
        meterInfos: { 10: { meter: rows[0] }, 11: { meter: rows[1] } },
        metersByAsset: { 1: rows }
      };
    },
    check(state) {
      assert.deepEqual(
        state.metersMini.map(({ id }) => id),
        [11]
      );
      assert.deepEqual(Object.keys(state.meterInfos), ['11']);
      assert.deepEqual(
        state.metersByAsset[1].map(({ id }) => id),
        [11]
      );
    }
  },
  {
    file: 'slices/vendor.ts',
    slice: 'vendors',
    action: 'deleteVendor',
    seed: (state, rows) => ({
      ...state,
      vendorsMini: rows,
      vendorInfos: { 10: { vendor: rows[0] }, 11: { vendor: rows[1] } }
    }),
    check(state) {
      assert.deepEqual(
        state.vendorsMini.map(({ id }) => id),
        [11]
      );
      assert.deepEqual(Object.keys(state.vendorInfos), ['11']);
    }
  },
  {
    file: 'slices/user.ts',
    slice: 'users',
    action: 'deleteUser',
    seed: (state, rows) => ({
      ...state,
      usersMini: rows,
      allUsersMini: rows,
      disabledUsersMini: rows,
      userInfos: { 10: { user: rows[0] }, 11: { user: rows[1] } }
    }),
    check(state) {
      for (const cache of [
        state.usersMini,
        state.allUsersMini,
        state.disabledUsersMini
      ]) {
        assert.deepEqual(
          cache.map(({ id }) => id),
          [11]
        );
      }
      assert.deepEqual(Object.keys(state.userInfos), ['11']);
    }
  },
  {
    file: 'slices/customer.ts',
    slice: 'customers',
    action: 'deleteCustomer',
    seed: (state, rows) => ({
      ...state,
      customersMini: rows,
      customerInfos: { 10: { customer: rows[0] }, 11: { customer: rows[1] } }
    }),
    check(state) {
      assert.deepEqual(
        state.customersMini.map(({ id }) => id),
        [11]
      );
      assert.deepEqual(Object.keys(state.customerInfos), ['11']);
    }
  },
  {
    file: 'slices/multipart.ts',
    slice: 'multiParts',
    action: 'deleteMultiParts',
    seed: (state, rows) => ({ ...state, miniMultiParts: rows }),
    check(state) {
      assert.deepEqual(
        state.miniMultiParts.map(({ id }) => id),
        [11]
      );
    }
  },
  {
    file: 'slices/part.ts',
    slice: 'parts',
    action: 'deletePart',
    seed: (state, rows) => ({
      ...state,
      partsMini: rows,
      partInfos: { 10: { part: rows[0] }, 11: { part: rows[1] } }
    }),
    check(state) {
      assert.deepEqual(
        state.partsMini.map(({ id }) => id),
        [11]
      );
      assert.deepEqual(Object.keys(state.partInfos), ['11']);
    }
  },
  {
    file: 'slices/asset.ts',
    slice: 'assets',
    action: 'deleteAsset',
    seed: (state, rows) => ({
      ...state,
      assetsMini: rows,
      assetsHierarchy: rows.map((asset) => ({ ...asset, hierarchy: [] })),
      assetInfos: {
        10: { asset: rows[0], workOrders: [] },
        11: { asset: rows[1], workOrders: [] }
      },
      assetsByLocation: { 1: rows },
      assetsByPart: { 1: rows }
    }),
    check(state) {
      assert.deepEqual(
        state.assetsMini.map(({ id }) => id),
        [11]
      );
      assert.deepEqual(
        state.assetsHierarchy.map(({ id }) => id),
        [11]
      );
      assert.deepEqual(Object.keys(state.assetInfos), ['11']);
      assert.deepEqual(
        state.assetsByLocation[1].map(({ id }) => id),
        [11]
      );
      assert.deepEqual(
        state.assetsByPart[1].map(({ id }) => id),
        [11]
      );
    }
  }
];

for (const config of cacheCases) {
  test(`${config.file} removes deleted records from dependent caches`, () => {
    const { reducer } = mobileRuntime().load(config.file);
    const initialState = reducer(undefined, { type: '@@init' });
    const state = config.seed(initialState, [{ id: 10 }, { id: 11 }]);
    const nextState = reducer(state, {
      type: `${config.slice}/${config.action}`,
      payload: { id: 10 }
    });

    config.check(nextState);
  });
}

test('deleting a location clears its cached subtree and stale mini choices', () => {
  const { reducer } = mobileRuntime().load('slices/location.ts');
  const initialState = reducer(undefined, { type: '@@init' });
  const rows = [
    { id: 10, name: 'Plant' },
    { id: 11, name: 'Conveyor area' },
    { id: 12, name: 'Transfer station' },
    { id: 20, name: 'Workshop' }
  ];
  const state = {
    ...initialState,
    locations: { ...initialState.locations, content: rows },
    locationsMini: rows,
    locationInfos: {
      10: { location: rows[0] },
      11: { location: rows[1] },
      12: { location: rows[2] },
      20: { location: rows[3] }
    },
    locationsHierarchy: [
      { ...rows[0], hierarchy: [10] },
      { ...rows[1], hierarchy: [10, 11] },
      { ...rows[2], hierarchy: [10, 11, 12] },
      { ...rows[3], hierarchy: [20] }
    ],
    locationChildrenPageNum: { 10: 2, 11: 1, 20: 0 },
    locationChildrenLastPage: { 10: false, 11: true, 20: true }
  };

  const nextState = reducer(state, {
    type: 'locations/deleteLocation',
    payload: {
      id: 10,
      listRequestId: 3,
      miniRequestId: 3,
      cacheGeneration: 1
    }
  });

  assert.deepEqual(
    nextState.locations.content.map(({ id }) => id),
    [20]
  );
  assert.deepEqual(
    nextState.locationsHierarchy.map(({ id }) => id),
    [20]
  );
  assert.deepEqual(Array.from(nextState.locationsMini), []);
  assert.deepEqual(Object.keys(nextState.locationInfos), ['20']);
  assert.deepEqual(nextState.locationChildrenPageNum, { 20: 0 });
  assert.deepEqual(nextState.locationChildrenLastPage, { 20: true });
  assert.equal(nextState.deletedLocationIds[10], true);
  assert.equal(nextState.deletedLocationIds[11], true);
  assert.equal(nextState.deletedLocationIds[12], true);
});

test('location deletion ignores list, mini, and detail responses already in flight', () => {
  const { reducer } = mobileRuntime().load('slices/location.ts');
  const initialState = reducer(undefined, { type: '@@init' });
  const parent = {
    id: 10,
    name: 'Plant',
    parentLocation: null,
    hierarchy: [10]
  };
  const child = {
    id: 11,
    name: 'Conveyor area',
    parentLocation: { id: 10 },
    hierarchy: [10, 11]
  };
  const state = {
    ...initialState,
    locations: { ...initialState.locations, content: [parent, child] },
    locationsHierarchy: [parent, child],
    locationInfos: { 10: { location: parent }, 11: { location: child } },
    latestListRequestId: 1,
    latestMiniRequestId: 1
  };
  const afterDelete = reducer(state, {
    type: 'locations/deleteLocation',
    payload: {
      id: 10,
      listRequestId: 2,
      miniRequestId: 2,
      cacheGeneration: 1
    }
  });

  const afterStaleList = reducer(afterDelete, {
    type: 'locations/getLocations',
    payload: {
      requestId: 1,
      locations: { content: [parent, child], last: true, totalElements: 2 }
    }
  });
  const afterStaleMini = reducer(afterStaleList, {
    type: 'locations/getLocationsMini',
    payload: { requestId: 1, locations: [parent, child] }
  });
  const afterStaleDetails = reducer(afterStaleMini, {
    type: 'locations/getLocationDetails',
    payload: { id: 11, location: child, cacheGeneration: 0 }
  });
  const afterStaleChildren = reducer(afterStaleDetails, {
    type: 'locations/getLocationChildren',
    payload: {
      id: 0,
      pageNum: 0,
      lastPage: true,
      locations: [child],
      cacheGeneration: 0
    }
  });

  assert.deepEqual(afterStaleChildren.locations.content, []);
  assert.deepEqual(Array.from(afterStaleChildren.locationsMini), []);
  assert.deepEqual(Object.keys(afterStaleChildren.locationInfos), []);
  assert.deepEqual(afterStaleChildren.locationsHierarchy, []);
});

test('work order filters reload invalidated location options', () => {
  const filters = require('node:fs').readFileSync(
    require('node:path').join(
      __dirname,
      '..',
      'screens/workOrders/WorkOrderFilters.tsx'
    ),
    'utf8'
  );
  assert.match(
    filters,
    /import \{ getLocationsMini \} from '\.\.\/\.\.\/slices\/location'/
  );
  assert.match(
    filters,
    /if \(!locationsMini\.length\)[\s\S]*?dispatch\(getLocationsMini\(\)\)/
  );
});
