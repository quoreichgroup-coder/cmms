const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const redux = require('@reduxjs/toolkit');
function load(kind, api) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/slices/${kind}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
  }).outputText, { exports, require(id) {
    if (id.endsWith('/api')) return { __esModule: true, default: api, getErrorMessage: e => e.message };
    if (id.endsWith('/page')) return { getInitialPage: () => ({ content: [], totalElements: 0 }), pageableToQueryParams: () => '' };
    if (id.endsWith('/redux')) return { revertAll: redux.createAction('REVERT_ALL') };
    if (id.includes('cancellableRequest')) return {};
    return require(id);
  }});
  return exports;
}
for (const kind of ['location', 'asset']) {
  test(`${kind}: errors stop loading, expose the error, and allow retry`, async () => {
    let fails = true;
    const m = load(kind, { get: async () => {
      if (fails) throw new Error('HTTP 404 Not found');
      return { content: [{ id: 7, name: 'Example' }], totalElements: 1 };
    }});
    const store = redux.configureStore({ reducer: m.reducer });
    const reset = () => kind === 'location' ? m.resetLocationsHierarchy({ page: 0, size: 10 }, true) : m.resetAssetsHierarchy(true);
    await store.dispatch(reset());
    assert.equal(store.getState().loadingHierarchy, false);
    assert.match(store.getState().hierarchyError, /404/);
    fails = false;
    await store.dispatch(reset());
    assert.equal(store.getState().hierarchyError, null);
    assert.equal(store.getState()[kind + 'sHierarchy'][0].id, 7);
  });
  test(`${kind}: an empty hierarchy finishes loading`, async () => {
    const m = load(kind, { get: async () => ({ content: [], totalElements: 0 }) });
    const store = redux.configureStore({ reducer: m.reducer });
    await store.dispatch(kind === 'location' ? m.getLocationChildrenPaginated(0, [], { page: 0, size: 10 }) : m.getAssetChildren(0, { page: 0, size: 10 }));
    assert.equal(store.getState().loadingHierarchy, false);
    assert.equal(store.getState().hierarchyError, null);
  });
}
test('location: editing updates paginated data; deleting an unknown row preserves data', () => {
  const m = load('location', {});
  const store = redux.configureStore({ reducer: m.reducer });
  store.dispatch(m.default.actions.getLocations({ locations: { content: [{ id: 1, name: 'Before' }], totalElements: 1 } }));
  store.dispatch(m.default.actions.getLocationChildrenPaginated({ id: 0, parents: [], locations: { content: [{ id: 1, name: 'Before' }], totalElements: 1 } }));
  store.dispatch(m.default.actions.editLocation({ location: { id: 1, name: 'After' } }));
  assert.equal(store.getState().locations.content[0].name, 'After');
  assert.equal(store.getState().locationsHierarchy[0].name, 'After');
  assert.equal(store.getState().childrenPages[0].content[0].name, 'After');
  store.dispatch(m.default.actions.deleteLocation({ id: 99 }));
  assert.equal(store.getState().locations.content.length, 1);
});
