const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

test('mobile purchase orders are reachable only with the existing view permission', () => {
  const navigation = read('navigation/index.tsx');
  const moreMenu = read('screens/MoreEntitiesScreen.tsx');
  const roles = read('models/role.ts');
  const types = read('types.tsx');
  const screen = read('screens/purchaseOrders/PurchaseOrdersScreen.tsx');

  assert.match(types, /PurchaseOrders:\s*undefined/);
  assert.match(
    moreMenu,
    /label: 'purchase_orders'[\s\S]*?link: 'PurchaseOrders'[\s\S]*?hasViewPermission\(PermissionEntity\.PURCHASE_ORDERS\)/
  );
  assert.match(
    roles,
    /viewMoreEntities:[\s\S]*?PermissionEntity\.PURCHASE_ORDERS/
  );
  assert.match(
    navigation,
    /canViewPurchaseOrders\s*&&\s*\(\s*<Stack\.Screen\s+name="PurchaseOrders"/
  );
  assert.match(screen, /hasFeature\(PlanFeature\.PURCHASE_ORDER\)/);
});

test('purchase order screen is read-only and displays only ordered quantities', () => {
  const screen = read('screens/purchaseOrders/PurchaseOrdersScreen.tsx');
  const slice = read('slices/purchaseOrder.ts');

  assert.match(screen, /getPurchaseOrders\(EMPTY_CRITERIA\)/);
  assert.match(screen, /getMorePurchaseOrders\(/);
  assert.match(screen, /purchase_order_quantity/);
  assert.match(screen, /purchase_orders_read_only_note/);
  assert.doesNotMatch(
    screen,
    /respondPurchaseOrder|addPurchaseOrder|editPurchaseOrder|deletePurchaseOrder/
  );
  assert.match(
    slice,
    /finally\s*\{[\s\S]*?setLoadingGet\(\{ loading: false, requestGeneration \}\)/
  );
});
