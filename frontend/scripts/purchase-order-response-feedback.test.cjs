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
    /await dispatch\(respondPurchaseOrder\(purchaseOrder\.id, approved, approvalComment\)\)/
  );
  assert.match(
    component,
    /showSnackBar\(\s*t\(approved && result\.status === 'PENDING' \? 'ap_intermediate_saved' : approved \? 'purchase_order_approved' : 'purchase_order_rejected'\),\s*'success'\s*\)/
  );
  assert.match(
    component,
    /catch \(error\) \{\s*approvalState\.reload\(\);\s*showSnackBar\(t\(getErrorMessage\(error\)\), 'error'\)/
  );
});

test('response actions cannot be submitted again while the request is pending', () => {
  assert.equal(
    (component.match(/disabled=\{approving \|\| cancelling\}/g) || []).length,
    2
  );
  assert.match(component, /if \(approving \|\| cancelling\) return false/);
});

test('purchase order approval requires explicit confirmation before the API call', () => {
  assert.match(component, /onClick=\{\(\) => setApprovalDialogOpen\(true\)\}/);
  assert.match(component, /open=\{approvalDialogOpen\}/);
  assert.match(
    component,
    /onClick=\{async \(\) => \{\s*const approved = await onRespond\(true\);\s*if \(approved\) setApprovalDialogOpen\(false\);/m
  );
  assert.match(component, /purchase_order_approval_confirmation_body/);
  assert.match(component, /purchase_order_approval_effect_hint/);
  assert.match(component, /canRespondToPurchaseOrders\(user\?\.role\)/);
  assert.match(
    component,
    /const approved = await onRespond\(true\);\s*if \(approved\) setApprovalDialogOpen\(false\);/
  );
});

test('approve-on-submit explains that stock changes on receipt', () => {
  const createForm = fs.readFileSync(
    'src/content/own/PurchaseOrders/Create.tsx',
    'utf8'
  );
  assert.match(
    createForm,
    /name: 'approveOnSubmit',[\s\S]*?helperText: t\('purchase_order_approve_on_submit_hint'\)/
  );
  assert.match(createForm, /canRespondToPurchaseOrders\(user\?\.role\)/);
  for (const translation of [english, french]) {
    assert.match(translation, /purchase_order_approve_on_submit_hint:/);
    assert.match(translation, /purchase_order_approval_effect_hint:/);
    assert.match(translation, /purchase_order_approval_confirmation_title:/);
    assert.match(translation, /purchase_order_approval_confirmation_body:/);
  }
});

test('approval and rejection success messages are localized', () => {
  for (const translation of [english, french]) {
    assert.match(translation, /purchase_order_approved:/);
    assert.match(translation, /purchase_order_rejected:/);
  }
});
