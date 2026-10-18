const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

const source = readFileSync(
  'src/content/own/Assets/Show/AssetDowntimes.tsx',
  'utf8'
);

test('edit and delete downtime actions use their matching asset permissions', () => {
  assert.match(
    source,
    /if \(hasEditPermission\(PermissionEntity\.ASSETS, asset\)\)\s*\{\s*actions\.push\([\s\S]*?label=\{t\('edit_downtime'\)\}/
  );
  assert.match(
    source,
    /if \(hasDeletePermission\(PermissionEntity\.ASSETS, asset\)\)\s*\{\s*actions\.push\([\s\S]*?label=\{t\('remove_downtime'\)\}/
  );
  assert.doesNotMatch(source, /window\.confirm/);
  assert.match(source, /<ConfirmDialog[\s\S]*?confirm_delete_asset_downtime/);
  assert.match(source, /downtime_delete_success/);
  assert.match(source, /downtime_delete_failure/);
});

test('downtime history exposes API failures and allows a retry', () => {
  assert.match(
    source,
    /const \[loadError, setLoadError\] = useState<string \| null>\(null\)/
  );
  assert.match(
    source,
    /dispatch\(getAssetDowntimes\(asset\.id\)\)[\s\S]*?\.catch\(\(error\) =>/
  );
  assert.match(
    source,
    /setLoadError\(getErrorMessage\(error, t\('an_error_occured'\)\)\)/
  );
  assert.match(
    source,
    /severity="error"[\s\S]*?onClick=\{\(\) => setReloadKey/
  );
  assert.match(source, /\{t\('retry'\)\}/);
});

test('downtime history layout adapts its spacing and controls to narrow screens', () => {
  assert.match(source, /px: \{ xs: 1, sm: 2, md: 4 \}/);
  assert.match(source, /height: \{ xs: 420, sm: 550 \}/);
  assert.match(source, /direction=\{\{ xs: 'column', sm: 'row' \}\}/);
  assert.match(source, /width: '100%',[\s\S]*?minWidth: 0/);
});
