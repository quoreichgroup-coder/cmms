const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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

test('an older linked-equipment request cannot clear the latest error or loading state', async () => {
  const { beginRequest, isCurrentRequest } = mobileRuntime().load(
    'utils/requestSequence.ts'
  );
  const sequence = { current: 0 };
  const older = deferred();
  const latest = deferred();
  const visible = { loading: false, error: false };

  const load = async (request) => {
    const requestId = beginRequest(sequence);
    visible.loading = true;
    visible.error = false;
    try {
      await request;
    } catch {
      if (!isCurrentRequest(requestId, sequence)) return;
      visible.error = true;
    } finally {
      if (isCurrentRequest(requestId, sequence)) visible.loading = false;
    }
  };

  const olderLoad = load(older.promise);
  const latestLoad = load(latest.promise);
  latest.reject(new Error('current request failed'));
  await latestLoad;
  older.resolve();
  await olderLoad;

  assert.deepEqual(visible, { loading: false, error: true });
});

test('the part equipment tab guards stale completion and invalidates on cleanup', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/parts/details/PartAssets.tsx'),
    'utf8'
  );

  assert.match(source, /beginRequest, isCurrentRequest/);
  assert.match(
    source,
    /const requestId = beginRequest\(loadRequestSequence\);[\s\S]*?if \(!isCurrentRequest\(requestId, loadRequestSequence\)\) return;[\s\S]*?setError\(true\)/
  );
  assert.match(
    source,
    /finally \{\s*if \(isCurrentRequest\(requestId, loadRequestSequence\)\) \{\s*setLoading\(false\)/
  );
  assert.match(
    source,
    /return \(\) => \{[\s\S]*?beginRequest\(loadRequestSequence\);/
  );
});
