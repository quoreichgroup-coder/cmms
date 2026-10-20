const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const redux = require('@reduxjs/toolkit');
function load(file, api, getErrorMessage = e => e.message) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(source, { exports, require(id) {
    if (id.endsWith('/api')) return { __esModule: true, default: api, getErrorMessage };
    if (id.endsWith('/redux')) return { revertAll: redux.createAction('REVERT_ALL') };
    return require(id);
  }});
  return exports;
}
for (const category of ['workOrder', 'asset', 'part', 'request', 'user']) {
  test(category + ': every report stops loading after an API error', async () => {
    const api = { get: async () => { throw Object.assign(new Error('Denied'), { status: 403 }); }, post: async () => { throw Object.assign(new Error('Denied'), { status: 403 }); } };
    const module = load(
      'src/slices/analytics/' + category + '.ts',
      api,
      error => error.status === 403 ? 'Access denied (HTTP 403).' : error.message
    );
    const thunks = Object.entries(module).filter(([name, value]) => name.startsWith('get') && typeof value === 'function');
    assert.ok(thunks.length > 0);
    for (const [name, thunk] of thunks) {
      const store = redux.configureStore({ reducer: module.reducer });
      try { await store.dispatch(thunk(new Date('2026-10-01'), new Date('2026-10-03'), 1)); } catch { }
      assert.ok(Object.values(store.getState().loading).every(value => value === false), name + ' left a loader active');
      assert.ok(Object.keys(store.getState().errors).length > 0, name + ' must expose the failure');
      assert.ok(Object.values(store.getState().errors).includes('Access denied (HTTP 403).'), name + ' must use the localized API error');
    }
  });
}
function loadCalendar(api, getErrorMessage = e => e.message) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/slices/workOrder.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(source, { exports, require(id) {
    if (id.endsWith('/api')) return { __esModule: true, default: api, getErrorMessage };
    if (id.endsWith('/redux')) return { revertAll: redux.createAction('REVERT_ALL') };
    if (id.endsWith('/page')) return { getInitialPage: () => ({ content: [], totalElements: 0 }) };
    if (id.includes('cancellableRequest') || id === './workload') return {};
    return require(id);
  }});
  return exports;
}
test('calendar uses the localized API error, stops loading and supports a successful retry', async () => {
  let fails = true;
  const module = loadCalendar(
    { post: async () => { if (fails) throw Object.assign(new Error('Denied'), { status: 403 }); return []; } },
    error => error.status === 403 ? 'Access denied (HTTP 403).' : error.message
  );
  const store = redux.configureStore({ reducer: module.reducer });
  await store.dispatch(module.getWorkOrderEvents(new Date(), new Date()));
  assert.equal(store.getState().calendar.loading, false);
  assert.equal(store.getState().calendar.error, 'Access denied (HTTP 403).');
  fails = false;
  await store.dispatch(module.getWorkOrderEvents(new Date(), new Date()));
  assert.equal(store.getState().calendar.error, null);
  assert.equal(store.getState().calendar.loading, false);
});
test('calendar ignores a late response from a previous period', async () => {
  const pending = [];
  const module = loadCalendar({ post: () => new Promise(resolve => pending.push(resolve)) });
  const store = redux.configureStore({ reducer: module.reducer });
  const first = store.dispatch(module.getWorkOrderEvents(new Date(), new Date()));
  const second = store.dispatch(module.getWorkOrderEvents(new Date(), new Date()));
  pending[1]([{ type: 'WO', event: { id: 2 } }]);
  await second;
  pending[0]([{ type: 'WO', event: { id: 1 } }]);
  await first;
  assert.equal(store.getState().calendar.events[0].event.id, 2);
  assert.equal(store.getState().calendar.loading, false);
});
