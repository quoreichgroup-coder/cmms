const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const component = fs.readFileSync(
  'src/content/own/PurchaseOrders/PurchaseOrderDetails.tsx',
  'utf8'
);
const english = fs.readFileSync('src/i18n/translations/en.ts', 'utf8');
const french = fs.readFileSync('src/i18n/translations/fr.ts', 'utf8');

test('purchase order response reports server-confirmed success and failure', () => {
  assert.match(
    component,
    /await dispatch\(respondPurchaseOrder\(purchaseOrder\.id, approved\)\)/
  );
  assert.match(
    component,
    /showSnackBar\(\s*t\(approved \? 'purchase_order_approved' : 'purchase_order_rejected'\),\s*'success'\s*\)/
  );
  assert.match(
    component,
    /catch \(error\) \{\s*showSnackBar\(getErrorMessage\(error\), 'error'\)/
  );
});

test('response actions cannot be submitted again while the request is pending', () => {
  assert.equal(
    (component.match(/disabled=\{approving \|\| cancelling\}/g) || []).length,
    2
  );
});

test('approval and rejection success messages are localized', () => {
  for (const translation of [english, french]) {
    assert.match(translation, /purchase_order_approved:/);
    assert.match(translation, /purchase_order_rejected:/);
  }
});
