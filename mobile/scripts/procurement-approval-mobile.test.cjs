const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

test('mobile PR approval loads the server policy and submits a decision with its note', () => {
  const source = read('screens/purchaseRequisitions/PurchaseRequisitionsScreen.tsx');
  assert.match(source, /approval-management\/documents\/PR\/\$\{id\}/);
  assert.match(source, /purchase-requisitions\/\$\{decisionTarget\.id\}\/decision/);
  assert.match(source, /approved:\s*decisionTarget\.approved[\s\S]*?note:\s*decisionNote\.trim\(\)/);
  assert.match(source, /!approvalSummaryLoaded[\s\S]*?approvalSummary && !approvalSummary\.canDecide/);
  assert.match(source, /!decisionTarget\.approved && !decisionNote\.trim\(\)/);
});

test('mobile PO approval loads eligibility and uses the guarded decision endpoint', () => {
  const source = read('screens/purchaseOrders/PurchaseOrderDetailsScreen.tsx');
  assert.match(source, /approval-management\/documents\/PO\/\$\{id\}/);
  assert.match(source, /purchase-orders\/\$\{id\}\/respond/);
  assert.match(source, /!approvalSummaryLoaded[\s\S]*?approvalSummary && !approvalSummary\.canDecide/);
  assert.match(source, /!responseDecision && approvalSummary && !approvalComment\.trim\(\)/);
  assert.match(source, /result\.status === 'PENDING'[\s\S]*?'ap_intermediate_saved'/);
  for (const language of ['en', 'fr']) {
    const translations = read(`i18n/translations/${language}.ts`);
    assert.match(translations, /ap_intermediate_saved:/);
  }
});

test('mobile approval summary identifies the policy, current step and submitted amount', () => {
  const source = read('components/ApprovalSummaryCard.tsx');
  const poScreen = read('screens/purchaseOrders/PurchaseOrderDetailsScreen.tsx');
  assert.match(source, /summary\.policyName/);
  assert.match(source, /summary\.policyVersion/);
  assert.match(source, /summary\.currentLevel/);
  assert.match(source, /summary\.levelCount/);
  assert.match(source, /amountLabel = 'approval_estimated_material_amount'/);
  assert.match(source, /t\(amountLabel\)[\s\S]*?summary\.estimatedNetAmount[\s\S]*?summary\.currency/);
  assert.match(poScreen, /amountLabel="approval_amount"/);
});

test('mobile PO details distinguish supplier agreed prices from inventory cost estimates', () => {
  const source = read('screens/purchaseOrders/PurchaseOrderDetailsScreen.tsx');
  assert.match(source, /line\.purchaseUnitPrice/);
  assert.match(source, /line\.purchasePriceCurrency/);
  assert.match(source, /t\('agreed_unit_price'\)/);
  assert.match(source, /t\('agreed_purchase_total'\)/);
  assert.match(source, /t\('estimated_total_cost'\)/);
  assert.match(source, /purchaseUnitCostSnapshot/);
  assert.match(source, /line\.purchasePriceCurrency === partQuantities\[0\]\.purchasePriceCurrency/);
  assert.match(source, /purchaseUnitPrice \* line\.quantity/);
  assert.match(source, /totalSupplierPrice[\s\S]*?purchaseUnitPrice \?\? 0\) \* line\.quantity/);
  const lineModel = read('models/partQuantity.ts');
  assert.match(lineModel, /purchaseUnitPrice\?: number \| null/);
  assert.match(lineModel, /purchasePriceCurrency\?: string \| null/);
  for (const language of ['en', 'fr']) {
    const translations = read(`i18n/translations/${language}.ts`);
    assert.match(translations, /agreed_purchase_total:/);
    assert.match(translations, /estimated_total_cost:/);
  }
});

test('mobile PO decision and receipt errors localize procurement server keys', () => {
  const source = read('screens/purchaseOrders/PurchaseOrderDetailsScreen.tsx');
  assert.match(source, /t\(getErrorMessage\(error, t\('purchase_order_response_failed'\)\)\)/);
  assert.match(source, /t\(getErrorMessage\(error, t\('receipt_save_failed'\)\)\)/);
  for (const language of ['en', 'fr']) {
    const translations = read(`i18n/translations/${language}.ts`);
    assert.match(translations, /procurement_inventory_quantity_overflow:/);
    assert.match(translations, /purchase_order_receipt_totals_invalid:/);
  }
});

test('mobile procurement forms and details carry line site assignments', () => {
  const requisitions = read('screens/purchaseRequisitions/PurchaseRequisitionsScreen.tsx');
  const orders = read('screens/purchaseOrders/PurchaseOrderDetailsScreen.tsx');
  const lineModel = read('models/partQuantity.ts');
  assert.match(requisitions, /api\.get<SiteOption\[]>\('sites'\)/);
  assert.match(requisitions, /siteId: line\.siteId/);
  assert.match(requisitions, /line\.siteName \? `/);
  assert.match(requisitions, /t\('select_site', 'Select site'\)/);
  assert.match(orders, /line\.siteName/);
  assert.match(lineModel, /siteId\?: number \| null/);
  assert.match(lineModel, /siteName\?: string \| null/);
});
