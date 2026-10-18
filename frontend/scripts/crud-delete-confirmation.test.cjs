const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { configureStore, createAction } = require('@reduxjs/toolkit');

function loadSlice(name, api) {
  const exports = {};
  const source = fs.readFileSync(`src/slices/${name}.ts`, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require(id) {
      if (id.endsWith('/api')) return { __esModule: true, default: api };
      if (id.endsWith('/page'))
        return {
          getInitialPage: () => ({ content: [], totalElements: 0 }),
          Page: class {},
          SearchCriteria: class {}
        };
      if (id.endsWith('/redux'))
        return { revertAll: createAction('REVERT_ALL') };
      if (id.endsWith('cancellableRequest')) return { cancellableFetch: () => {} };
      return require(id);
    }
  });
  return exports;
}

for (const [sliceName, thunkName, stateKey, collectionPath, endpoint] of [
  ['meter', 'deleteMeter', 'meters', ['meters', 'content'], 'meters'],
  ['team', 'deleteTeam', 'teams', ['teams', 'content'], 'teams'],
  ['vendor', 'deleteVendor', 'vendors', ['vendors', 'content'], 'vendors'],
  [
    'customer',
    'deleteCustomer',
    'customers',
    ['customers', 'content'],
    'customers'
  ],
  ['workflow', 'deleteWorkflow', 'workflows', ['workflows'], 'workflows'],
  ['apiKey', 'deleteApiKey', 'apiKeys', ['apiKeys', 'content'], 'api-keys'],
  ['checklist', 'deleteChecklist', 'checklists', ['checklists'], 'checklists'],
  ['file', 'deleteFile', 'files', ['files', 'content'], 'files'],
  [
    'location',
    'deleteLocation',
    'locations',
    ['locations', 'content'],
    'locations'
  ],
  [
    'requestPortal',
    'deleteRequestPortal',
    'requestPortals',
    ['requestPortals', 'content'],
    'request-portals'
  ]
]) {
  test(`${sliceName} delete only updates local state after API confirmation`, async () => {
    let confirmed = false;
    const slice = loadSlice(sliceName, {
      deletes: async (path) => {
        assert.equal(path, `${endpoint}/17`);
        return { success: confirmed };
      }
    });
    const store = configureStore({ reducer: { [stateKey]: slice.reducer } });
    const record = { id: 17, name: 'Test record' };
    const initial = store.getState()[stateKey];
    if (sliceName === 'workflow') {
      store.dispatch(
        slice.default.actions.getWorkflows({ workflows: [record] })
      );
    } else if (sliceName === 'checklist') {
      store.dispatch(
        slice.default.actions.getChecklists({ checklists: [record] })
      );
    } else {
      const actionName = `get${sliceName[0].toUpperCase()}${sliceName.slice(
        1
      )}s`;
      store.dispatch(
        slice.default.actions[actionName]({
          [collectionPath[0]]: { content: [record], totalElements: 1 }
        })
      );
    }

    const failed = await store.dispatch(slice[thunkName](17));
    assert.equal(failed, false);
    if (sliceName === 'workflow' || sliceName === 'checklist') {
      assert.equal(store.getState()[stateKey][collectionPath[0]].length, 1);
    } else {
      assert.equal(
        store.getState()[stateKey][collectionPath[0]].content.length,
        1
      );
    }
    assert.ok(initial);

    confirmed = true;
    const succeeded = await store.dispatch(slice[thunkName](17));
    assert.equal(succeeded, true);
    if (sliceName === 'workflow' || sliceName === 'checklist') {
      assert.equal(store.getState()[stateKey][collectionPath[0]].length, 0);
    } else {
      assert.equal(
        store.getState()[stateKey][collectionPath[0]].content.length,
        0
      );
    }
  });
}
