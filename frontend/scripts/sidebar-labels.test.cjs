const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sidebarItem = fs.readFileSync(
  'src/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/item.tsx',
  'utf8'
);
const menuItems = fs.readFileSync(
  'src/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/items.ts',
  'utf8'
);
const english = fs.readFileSync('src/i18n/translations/en.ts', 'utf8');
const french = fs.readFileSync('src/i18n/translations/fr.ts', 'utf8');

test('SAP-compatible labels are applied only by the Web sidebar renderer', () => {
  assert.match(sidebarItem, /sidebarLabelKeys\[name\]/);
  assert.match(sidebarItem, /const label = t\(/);
  assert.match(sidebarItem, /\{!collapsedRail && label\}/);
  assert.match(sidebarItem, /aria-label=\{label\}/);
});

test('major maintenance menu labels exist in English and French', () => {
  const keys = [
    'sidebar_sap_maintenance_orders',
    'sidebar_sap_maintenance_plans',
    'sidebar_sap_maintenance_requests',
    'sidebar_sap_equipment',
    'sidebar_sap_functional_locations',
    'sidebar_sap_measuring_points',
    'sidebar_sap_procurement'
  ];

  for (const key of keys) {
    assert.match(english, new RegExp(`${key}:`));
    assert.match(french, new RegExp(`${key}:`));
  }
});

test('menu routes and permissions remain attached to their existing entries', () => {
  assert.match(
    menuItems,
    /name: 'work_orders',[\s\S]*?link: '\/app\/work-orders'/
  );
  assert.match(
    menuItems,
    /name: 'preventive_maintenance',[\s\S]*?link: '\/app\/preventive-maintenances',[\s\S]*?permission: PermissionEntity\.PREVENTIVE_MAINTENANCES/
  );
  assert.match(
    menuItems,
    /name: 'requests',[\s\S]*?link: '\/app\/requests',[\s\S]*?permission: PermissionEntity\.REQUESTS/
  );
  assert.match(
    menuItems,
    /name: 'assets',[\s\S]*?link: '\/app\/assets',[\s\S]*?permission: PermissionEntity\.ASSETS/
  );
});
