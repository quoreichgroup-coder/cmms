const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/sidebarNavigation.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, {
  exports: moduleExports,
  require: (name) => require(name)
});

test('sidebar module stays active on nested detail routes', () => {
  assert.equal(
    moduleExports.isSidebarPathActive('/app/assets/asset-42', '/app/assets'),
    true
  );
  assert.equal(
    moduleExports.isSidebarPathActive(
      '/app/work-orders/wo-42/execution',
      '/app/work-orders'
    ),
    true
  );
});

test('sidebar matching respects path segment boundaries', () => {
  assert.equal(
    moduleExports.isSidebarPathActive('/app/assets-details', '/app/assets'),
    false
  );
  assert.equal(
    moduleExports.isSidebarPathActive('/app/requests', '/app/assets'),
    false
  );
});

test('sidebar route without a destination is never active', () => {
  assert.equal(
    moduleExports.isSidebarPathActive('/app/assets', undefined),
    false
  );
});
