const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { createAction } = require('@reduxjs/toolkit');

const sliceSource = fs.readFileSync(
  path.join(__dirname, '../src/slices/requestPortal.ts'),
  'utf8'
);
const pageSource = fs.readFileSync(
  path.join(
    __dirname,
    '../src/content/own/Settings/Features/RequestPortal/PublicPage/RequestPortalPublicPage.tsx'
  ),
  'utf8'
);
const compiledSlice = ts.transpileModule(sliceSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function harness() {
  const requests = [];
  const exports = {};
  vm.runInNewContext(compiledSlice, {
    exports,
    require(id) {
      if (id === '@reduxjs/toolkit') return require('@reduxjs/toolkit');
      if (id === '../utils/api')
        return {
          __esModule: true,
          default: {
            get: () => {
              const request = deferred();
              requests.push(request);
              return request.promise;
            }
          },
          authHeader: () => ({})
        };
      if (id === 'src/utils/redux')
        return { revertAll: createAction('revertAll') };
      if (id === '../models/owns/page')
        return {
          getInitialPage: () => ({ content: [], totalElements: 0 }),
          Page: Object,
          SearchCriteria: Object
        };
      if (id === '../models/owns/requestPortal')
        return { RequestPortal: Object, RequestPortalPostDTO: Object };
      return require(id);
    }
  });

  let state = exports.reducer(undefined, { type: 'test/init' });
  const dispatch = (action) => {
    if (typeof action === 'function') return action(dispatch);
    state = exports.reducer(state, action);
    return action;
  };
  return {
    dispatch,
    get state() {
      return state;
    },
    requests,
    exports
  };
}

test('public portal route changes discard stale data and stale responses', async () => {
  const app = harness();
  const oldLoad = app.dispatch(app.exports.getRequestPortalPublic('old'));
  assert.equal(app.state.singleRequestPortal, null);
  const currentLoad = app.dispatch(
    app.exports.getRequestPortalPublic('current')
  );

  app.requests[1].resolve({ uuid: 'current', title: 'Current portal' });
  await currentLoad;
  app.requests[0].reject(new Error('stale failure'));
  await assert.rejects(oldLoad, /stale failure/);

  assert.equal(app.state.singleRequestPortal.uuid, 'current');
  assert.equal(app.state.publicGetError, false);
  assert.equal(app.state.loadingPublicGet, false);
});

test('public portal load failure exposes a retryable error and a retry clears it', async () => {
  const app = harness();
  const failedLoad = app.dispatch(app.exports.getRequestPortalPublic('portal'));
  app.requests[0].reject(new Error('network failure'));
  await assert.rejects(failedLoad, /network failure/);
  assert.equal(app.state.singleRequestPortal, null);
  assert.equal(app.state.publicGetError, true);

  const retry = app.dispatch(app.exports.getRequestPortalPublic('portal'));
  app.requests[1].resolve({ uuid: 'portal', title: 'Recovered portal' });
  await retry;
  assert.equal(app.state.singleRequestPortal.title, 'Recovered portal');
  assert.equal(app.state.publicGetError, false);
  assert.equal(app.state.loadingPublicGet, false);
  assert.match(pageSource, /portal_load_failed/);
  assert.match(pageSource, /clearPublicRequestPortal\(uuid\)/);
  assert.match(pageSource, /setFormValues\(\{\s*title: ''/);
});
