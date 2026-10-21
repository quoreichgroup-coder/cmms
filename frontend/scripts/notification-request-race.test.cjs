const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const {
  configureStore,
  combineReducers,
  createAction
} = require('@reduxjs/toolkit');

const source = ts.transpileModule(
  fs.readFileSync(
    path.join(__dirname, '../src/slices/notification.ts'),
    'utf8'
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true
    }
  }
).outputText;

const loadSlice = (api) => {
  const moduleExports = {};
  const module = { exports: moduleExports };
  const revertAll = createAction('test/revertAll');
  vm.runInNewContext(source, {
    exports: moduleExports,
    module,
    require: (name) => {
      if (name === '@reduxjs/toolkit') return require(name);
      if (name === 'src/models/owns/page') {
        return {
          getInitialPage: () => ({ content: [], last: false, totalPages: 0 })
        };
      }
      if (name === '../utils/api') return { __esModule: true, default: api };
      if (name === 'src/utils/redux') {
        return { revertAll };
      }
      if (name === './workOrder') {
        return { getWorkOrders: () => async () => undefined };
      }
      throw new Error(`Unexpected import: ${name}`);
    }
  });
  return { ...module.exports, revertAll };
};

const criteria = {
  filterFields: [],
  pageSize: 25,
  pageNum: 0,
  direction: 'DESC'
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

test('late initial notification responses cannot replace the active account list', async () => {
  const requests = [];
  const slice = loadSlice({
    post: () => {
      const request = deferred();
      requests.push(request);
      return request.promise;
    }
  });
  const store = configureStore({
    reducer: combineReducers({ notifications: slice.reducer })
  });
  const oldAccount = store.dispatch(slice.getNotifications(criteria));
  const activeAccount = store.dispatch(slice.getNotifications(criteria));

  requests[1].resolve({
    content: [{ id: 22, message: 'Active account' }],
    last: true
  });
  await activeAccount;
  requests[0].resolve({
    content: [{ id: 11, message: 'Old account' }],
    last: false
  });
  await oldAccount;

  assert.deepEqual(
    store.getState().notifications.notifications.content.map(({ id }) => id),
    [22]
  );
  assert.equal(store.getState().notifications.loadingGet, false);
});

test('an in-flight notification response cannot repopulate state after logout reset', async () => {
  const requests = [];
  const slice = loadSlice({
    post: () => {
      const request = deferred();
      requests.push(request);
      return request.promise;
    }
  });
  const store = configureStore({
    reducer: combineReducers({ notifications: slice.reducer })
  });
  const pending = store.dispatch(slice.getNotifications(criteria));
  store.dispatch(slice.revertAll());
  requests[0].resolve({
    content: [{ id: 11, message: 'Previous account' }],
    last: false
  });
  await pending;

  assert.deepEqual(store.getState().notifications.notifications.content, []);
  assert.equal(store.getState().notifications.requestId, 0);
});

test('late pagination responses cannot append to a refreshed notification list', async () => {
  const requests = [];
  const slice = loadSlice({
    post: () => {
      const request = deferred();
      requests.push(request);
      return request.promise;
    }
  });
  const store = configureStore({
    reducer: combineReducers({ notifications: slice.reducer })
  });
  const initial = store.dispatch(slice.getNotifications(criteria));
  requests[0].resolve({ content: [{ id: 1, message: 'Page 1' }], last: false });
  await initial;

  const stalePage = store.dispatch(slice.getMoreNotifications(criteria, 1));
  const refreshed = store.dispatch(slice.getNotifications(criteria));
  requests[2].resolve({
    content: [{ id: 9, message: 'Refreshed account' }],
    last: true
  });
  await refreshed;
  requests[1].resolve({
    content: [{ id: 2, message: 'Stale page' }],
    last: true
  });
  await stalePage;

  assert.deepEqual(
    store.getState().notifications.notifications.content.map(({ id }) => id),
    [9]
  );
  assert.equal(store.getState().notifications.lastPage, true);
  assert.equal(store.getState().notifications.loadingGet, false);
});

test('concurrent scroll events do not request the same notification page twice', async () => {
  const requests = [];
  const slice = loadSlice({
    post: () => {
      const request = deferred();
      requests.push(request);
      return request.promise;
    }
  });
  const store = configureStore({
    reducer: combineReducers({ notifications: slice.reducer })
  });
  const initial = store.dispatch(slice.getNotifications(criteria));
  requests[0].resolve({ content: [{ id: 1, message: 'Page 1' }], last: false });
  await initial;

  const firstPageRequest = store.dispatch(
    slice.getMoreNotifications(criteria, 1)
  );
  const duplicatePageRequest = store.dispatch(
    slice.getMoreNotifications(criteria, 1)
  );
  assert.equal(requests.length, 2);

  requests[1].resolve({ content: [{ id: 2, message: 'Page 2' }], last: true });
  await Promise.all([firstPageRequest, duplicatePageRequest]);
  assert.deepEqual(
    store.getState().notifications.notifications.content.map(({ id }) => id),
    [1, 2]
  );
});
