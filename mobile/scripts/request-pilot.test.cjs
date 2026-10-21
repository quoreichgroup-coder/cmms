const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Exercise the mobile thunks without requiring a native runtime.
function loadRequests(patch) {
  const source = readFileSync(
    path.join(__dirname, '../slices/request.ts'),
    'utf8'
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(id) {
      if (id === '../utils/api') return { default: { patch } };
      if (id === '../models/page')
        return { getInitialPage: () => ({ content: [] }) };
      if (id === '../utils/redux') return { revertAll: { type: 'revertAll' } };
      return require(id);
    }
  });
  return exports;
}

test('approval returns the created work order and updates the request', async () => {
  const actions = [];
  const requests = loadRequests(async (url, body) => {
    assert.equal(url, 'requests/12/approve');
    assert.deepEqual(JSON.parse(JSON.stringify(body)), {});
    return { id: 91 };
  });
  assert.equal(
    await requests.approveRequest(12)(
      (action) => actions.push(action),
      () => ({ requests: { sessionGeneration: 0 } })
    ),
    91
  );
  assert.equal(actions[0].payload.id, 12);
  assert.equal(actions[0].payload.workOrder.id, 91);
});

test('approval sends the selected asset status through the existing endpoint', async () => {
  const requests = loadRequests(async (url, body) => {
    assert.equal(url, 'requests/12/approve');
    assert.deepEqual(JSON.parse(JSON.stringify(body)), {
      assetStatus: 'DOWN'
    });
    return { id: 91 };
  });
  assert.equal(
    await requests.approveRequest(12, 'DOWN')(
      () => undefined,
      () => ({ requests: { sessionGeneration: 0 } })
    ),
    91
  );
});

test('rejection preserves the complete reason in the query string', async () => {
  const reason = 'Bande & moteur ? arrêt #1 / contrôle + équipe';
  const actions = [];
  const requests = loadRequests(async (url) => {
    const parsed = new URL(url, 'http://pilot.local/');
    assert.equal(parsed.pathname, '/requests/12/cancel');
    assert.equal(parsed.searchParams.get('reason'), reason);
    assert.equal([...parsed.searchParams].length, 1);
  });
  await requests.cancelRequest(12, reason)(
    (action) => actions.push(action),
    () => ({ requests: { sessionGeneration: 0 } })
  );
  assert.equal(actions[0].type, 'requests/cancelRequest');
  assert.equal(actions[0].payload.id, 12);
});

for (const operation of ['approveRequest', 'cancelRequest']) {
  test(`${operation} preserves server errors without updating local state`, async () => {
    const error = new Error('quota or permission denied');
    const actions = [];
    const requests = loadRequests(async () => {
      throw error;
    });
    await assert.rejects(
      requests[operation](12, 'reason')(
        (action) => actions.push(action),
        () => ({ requests: { sessionGeneration: 0 } })
      ),
      (actual) => actual === error
    );
    assert.equal(actions.length, 0);
  });
}
