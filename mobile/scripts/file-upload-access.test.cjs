const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const { canUploadFiles } = mobileRuntime().load('utils/fileUploadAccess.ts');

test('file upload requires role, plan feature, and license entitlement', () => {
  const requirements = {
    hasFilePermission: true,
    hasFileFeature: true,
    hasFileEntitlement: true
  };

  assert.equal(canUploadFiles(requirements), true);
  assert.equal(
    canUploadFiles({ ...requirements, hasFilePermission: false }),
    false
  );
  assert.equal(
    canUploadFiles({ ...requirements, hasFileFeature: false }),
    false
  );
  assert.equal(
    canUploadFiles({ ...requirements, hasFileEntitlement: false }),
    false
  );
});
