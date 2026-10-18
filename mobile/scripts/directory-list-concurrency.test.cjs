const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function page(items, last = false) {
  return {
    content: items,
    pageable: { pageNumber: 0, pageSize: 10 },
    last,
    totalElements: items.length,
    totalPages: last ? 1 : 2
  };
}

function setupDirectory({ slicePath, sliceName, pageKey, searchName }) {
  const pending = [];
  const runtime = mobileRuntime({
    apiMock: {
      post: () => {
        const request = deferred();
        pending.push(request);
        return request.promise;
      }
    }
  });
  const {
    reducer,
    [searchName]: search,
    [`getMore${sliceName}`]: getMore
  } = runtime.load(slicePath);
  let state = reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => ({ [pageKey]: state }), null)
      : ((state = reducer(state, action)), action);

  return {
    dispatch,
    pending,
    search,
    getMore,
    getState: () => state,
    pageKey
  };
}

for (const directory of [
  {
    slicePath: 'slices/customer.ts',
    sliceName: 'Customers',
    pageKey: 'customers',
    searchName: 'getCustomers',
    endpoint: 'customers'
  },
  {
    slicePath: 'slices/vendor.ts',
    sliceName: 'Vendors',
    pageKey: 'vendors',
    searchName: 'getVendors',
    endpoint: 'vendors'
  }
]) {
  test(`${directory.endpoint} search ignores an older response`, async () => {
    const setup = setupDirectory({
      slicePath: directory.slicePath,
      sliceName: directory.sliceName,
      pageKey: directory.pageKey,
      searchName: directory.searchName
    });
    const criteriaA = { filterFields: [{ field: 'name', value: 'A' }] };
    const criteriaB = { filterFields: [{ field: 'name', value: 'B' }] };
    const older = setup.dispatch(setup.search(criteriaA));
    const newer = setup.dispatch(setup.search(criteriaB));

    setup.pending[1].resolve(page([{ id: 2, name: 'B' }], true));
    await newer;
    setup.pending[0].resolve(page([{ id: 1, name: 'A' }], true));
    await older;

    assert.deepEqual(
      setup.getState()[directory.pageKey].content.map((entry) => entry.name),
      ['B']
    );
    assert.equal(setup.getState().listLoading, false);
  });

  test(`${directory.endpoint} refresh prevents a late old page from appending`, async () => {
    const setup = setupDirectory({
      slicePath: directory.slicePath,
      sliceName: directory.sliceName,
      pageKey: directory.pageKey,
      searchName: directory.searchName
    });
    const criteria = { filterFields: [{ field: 'status', value: 'active' }] };
    const initial = setup.dispatch(setup.search(criteria));
    setup.pending[0].resolve(page([{ id: 1, name: 'First page' }], false));
    await initial;

    const oldPage = setup.dispatch(setup.getMore(criteria, 1));
    const refresh = setup.dispatch(setup.search(criteria));
    setup.pending[2].resolve(page([{ id: 3, name: 'Refreshed page' }], false));
    await refresh;
    setup.pending[1].resolve(page([{ id: 2, name: 'Stale page' }], true));
    await oldPage;

    assert.deepEqual(
      setup.getState()[directory.pageKey].content.map((entry) => entry.name),
      ['Refreshed page']
    );
    assert.equal(setup.getState().currentPageNum, 0);
    assert.equal(setup.getState().listLoading, false);
  });
}
