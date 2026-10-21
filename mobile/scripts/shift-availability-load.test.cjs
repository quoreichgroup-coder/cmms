const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

test('a stale shift-availability response cannot replace the latest result', async () => {
  const { beginRequest, isCurrentRequest } = mobileRuntime().load(
    'utils/requestSequence.ts'
  );
  const sequence = { current: 0 };
  const older = deferred();
  const newer = deferred();
  const visible = [];

  const load = async (request) => {
    const requestId = beginRequest(sequence);
    const result = await request;
    if (isCurrentRequest(requestId, sequence)) visible.push(result);
  };

  const olderLoad = load(older.promise);
  const newerLoad = load(newer.promise);
  newer.resolve({ id: 'newer' });
  await newerLoad;
  older.resolve({ id: 'older' });
  await olderLoad;

  assert.deepEqual(visible, [{ id: 'newer' }]);
});

test('the shift screen guards success, error and loading state and invalidates on blur', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../screens/MyShiftAvailabilityScreen.tsx'),
    'utf8'
  );

  assert.match(source, /beginRequest, isCurrentRequest/);
  assert.match(
    source,
    /if \(!isCurrentRequest\(requestId, loadRequestSequence\)\) return;\s*setConfiguration\(nextConfiguration\)/
  );
  assert.match(
    source,
    /catch \(loadError\) \{\s*if \(!isCurrentRequest\(requestId, loadRequestSequence\)\) return;/
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
