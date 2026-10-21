const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(
  'src/content/own/PurchaseOrders/purchaseOrderPermissions.ts',
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, {
  exports: moduleExports,
  require: () => ({
    PermissionEntity: { PURCHASE_ORDERS: 'PURCHASE_ORDERS' }
  })
});

const { canRespondToPurchaseOrders } = moduleExports;

test('purchase-order response requires the client role and edit-other permission', () => {
  assert.equal(
    canRespondToPurchaseOrders({
      roleType: 'ROLE_CLIENT',
      editOtherPermissions: ['PURCHASE_ORDERS']
    }),
    true
  );
  assert.equal(
    canRespondToPurchaseOrders({
      roleType: 'ROLE_CLIENT',
      editOtherPermissions: []
    }),
    false
  );
  assert.equal(
    canRespondToPurchaseOrders({
      roleType: 'ROLE_SUPER_ADMIN',
      editOtherPermissions: ['PURCHASE_ORDERS']
    }),
    false
  );
  assert.equal(canRespondToPurchaseOrders(null), false);
});
