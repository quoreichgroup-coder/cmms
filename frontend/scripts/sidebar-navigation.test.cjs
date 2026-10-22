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

test('nested sidebar groups expand for a directly opened deep route', () => {
  const routeTree = {
    name: 'Statistics',
    items: [
      {
        name: 'work_orders',
        items: [{ name: 'wo_aging', link: '/app/analytics/work-orders/aging' }]
      }
    ]
  };

  assert.equal(
    moduleExports.isSidebarItemPathActive(
      '/app/analytics/work-orders/aging',
      routeTree
    ),
    true
  );
  assert.equal(
    moduleExports.isSidebarPathExact(
      '/app/analytics/work-orders/aging',
      undefined
    ),
    false
  );
});

test('an open group is not marked selected unless its own route is current', () => {
  assert.equal(
    moduleExports.isSidebarPathExact('/app/inventory/parts', '/app/inventory'),
    false
  );
  assert.equal(
    moduleExports.isSidebarPathExact('/app/inventory', '/app/inventory/'),
    true
  );
});

test('sidebar groups use separate route-active and descendant-open states', () => {
  const menu = fs.readFileSync(
    'src/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/index.tsx',
    'utf8'
  );
  const item = fs.readFileSync(
    'src/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/item.tsx',
    'utf8'
  );

  assert.match(menu, /active=\{routeActive\}\s+open=\{containsCurrentRoute\}/);
  assert.match(
    item,
    /className=\{clsx\(\{ active, expanded: menuToggle \}\)\}/
  );
});

test('report management has a dedicated permission and keeps the legacy settings entry', () => {
  const menu = fs.readFileSync(
    'src/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/items.ts',
    'utf8'
  );
  const settingsLayout = fs.readFileSync(
    'src/content/own/Settings/SettingsLayout.tsx',
    'utf8'
  );
  const permissions = fs.readFileSync(
    'src/content/own/Settings/Roles/PermissionsMatrix.tsx',
    'utf8'
  );

  assert.match(menu, /link: '\/app\/settings\/documents'/);
  assert.match(menu, /permission: PermissionEntity\.DOCUMENT_TEMPLATES/);
  assert.match(menu, /permissionFallback: PermissionEntity\.SETTINGS/);
  assert.match(settingsLayout, /PermissionEntity\.DOCUMENT_TEMPLATES/);
  assert.match(settingsLayout, /documentsOnly/);
  assert.match(permissions, /DOCUMENT_TEMPLATES: t\('report_management'\)/);
});
