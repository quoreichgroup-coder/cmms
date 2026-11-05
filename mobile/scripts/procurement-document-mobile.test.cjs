const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('mobile PR and PO screens expose the authenticated PDF action', () => {
  const po = read('screens/purchaseOrders/PurchaseOrderDetailsScreen.tsx');
  const pr = read('screens/purchaseRequisitions/PurchaseRequisitionsScreen.tsx');
  assert.match(po, /ProcurementDocumentActions kind="purchase-orders"/);
  assert.match(pr, /ProcurementDocumentActions kind="purchase-requisitions"/);
  assert.match(po, /issueDisabled=\{purchaseOrder\.status !== 'APPROVED'/);
});

test('mobile printing previews, archives, and re-downloads through authenticated endpoints', () => {
  const actions = read('components/ProcurementDocumentActions.tsx');
  assert.match(actions, /documents\/preview\/\$\{selectedId\}/);
  assert.match(actions, /documents\/issue\/\$\{selectedId\}/);
  assert.match(actions, /documents\/\$\{created\.id\}\/download/);
  assert.match(actions, /openPdfResponse\(response, created\.fileName\)/);
  assert.match(actions, /issuedAt/);
});
