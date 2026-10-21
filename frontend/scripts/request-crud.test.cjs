const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { configureStore } = require('@reduxjs/toolkit');

function loadRequestSlice(api) {
  const exports = {};
  const source = fs.readFileSync('src/slices/request.ts', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require(id) {
      if (id.endsWith('/api'))
        return {
          __esModule: true,
          default: api,
          getErrorMessage: (e) => e.message
        };
      if (id.endsWith('/page'))
        return { getInitialPage: () => ({ content: [], totalElements: 0 }) };
      if (id.endsWith('/redux'))
        return {
          revertAll: require('@reduxjs/toolkit').createAction('REVERT_ALL')
        };
      if (id.includes('cancellableRequest')) return {};
      return require(id);
    }
  });
  return exports;
}

test('request create and edit persist through existing endpoints and update Redux state', async () => {
  const calls = [];
  const requests = loadRequestSlice({
    post: async (url, body) => {
      calls.push(['POST', url, body]);
      return { id: 31, ...body };
    },
    patch: async (url, body) => {
      calls.push(['PATCH', url, body]);
      return { id: 31, title: 'Updated bearing inspection' };
    }
  });
  const store = configureStore({ reducer: { requests: requests.reducer } });
  await store.dispatch(requests.addRequest({ title: 'Bearing inspection' }));
  assert.equal(store.getState().requests.requests.content[0].id, 31);
  assert.equal(store.getState().requests.pendingCount, 1);
  await store.dispatch(
    requests.editRequest(31, { title: 'Updated bearing inspection' })
  );
  assert.deepEqual(
    calls.map(([method, url]) => [method, url]),
    [
      ['POST', 'requests'],
      ['PATCH', 'requests/31']
    ]
  );
  assert.equal(
    store.getState().requests.requests.content[0].title,
    'Updated bearing inspection'
  );
});

test('reject reason is encoded and cancellation updates list and direct detail state', async () => {
  const calls = [];
  const requests = loadRequestSlice({
    get: async () => ({ id: 42, title: 'Pump leak', cancelled: false }),
    patch: async (url) => {
      calls.push(url);
      return { id: 42, title: 'Pump leak', cancelled: true };
    }
  });
  const store = configureStore({ reducer: { requests: requests.reducer } });
  await store.dispatch(requests.getSingleRequest(42));
  store.dispatch(
    requests.default.actions.getRequests({
      requests: {
        content: [{ id: 42, title: 'Pump leak', cancelled: false }],
        totalElements: 1
      }
    })
  );
  store.dispatch(requests.default.actions.getPendingCount({ count: 1 }));
  await store.dispatch(
    requests.cancelRequest(42, 'Vérifier pompe & moteur + zone #2')
  );
  assert.equal(
    calls[0],
    'requests/42/cancel?reason=V%C3%A9rifier%20pompe%20%26%20moteur%20%2B%20zone%20%232'
  );
  assert.equal(store.getState().requests.requests.content[0].cancelled, true);
  assert.equal(store.getState().requests.singleRequest.cancelled, true);
  assert.equal(store.getState().requests.pendingCount, 0);
});

test('request delete changes list and pending count only after server success', async () => {
  let succeeds = false;
  const requests = loadRequestSlice({
    deletes: async () => ({ success: succeeds })
  });
  const store = configureStore({ reducer: { requests: requests.reducer } });
  store.dispatch(
    requests.default.actions.getRequests({
      requests: { content: [{ id: 51, title: 'Pending' }], totalElements: 1 }
    })
  );
  store.dispatch(requests.default.actions.getPendingCount({ count: 1 }));
  const failedDelete = await store.dispatch(requests.deleteRequest(51));
  assert.equal(failedDelete, false);
  assert.equal(store.getState().requests.requests.content.length, 1);
  assert.equal(store.getState().requests.pendingCount, 1);
  succeeds = true;
  const successfulDelete = await store.dispatch(requests.deleteRequest(51));
  assert.equal(successfulDelete, true);
  assert.equal(store.getState().requests.requests.content.length, 0);
  assert.equal(store.getState().requests.pendingCount, 0);
});
