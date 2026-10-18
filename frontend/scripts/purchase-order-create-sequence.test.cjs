const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadWorkflow() {
  const exports = {};
  const source = fs.readFileSync(
    'src/content/own/PurchaseOrders/createPurchaseOrderWorkflow.ts',
    'utf8'
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText;
  vm.runInNewContext(compiled, { exports, Promise });
  return exports;
}

const {
  createPurchaseOrderWorkflow: createWorkflow,
  updatePurchaseOrderWorkflow
} = loadWorkflow();

test('purchase order creation waits for lines and approval in sequence', async () => {
  const calls = [];
  const id = await createWorkflow(
    { partQuantities: [{ partId: 5, quantity: 2 }], approveOnSubmit: true },
    async () => {
      calls.push('create');
      return 91;
    },
    async (purchaseOrderId, quantities) => {
      calls.push(`lines:${purchaseOrderId}:${quantities.length}`);
    },
    async (purchaseOrderId) => {
      calls.push(`approve:${purchaseOrderId}`);
    },
    (purchaseOrderId) => calls.push(`created:${purchaseOrderId}`)
  );

  assert.equal(id, 91);
  assert.deepEqual(calls, ['create', 'created:91', 'lines:91:1', 'approve:91']);
});

test('purchase order creation stops and rejects when line persistence fails', async () => {
  const calls = [];
  await assert.rejects(
    createWorkflow(
      { partQuantities: [{ partId: 5, quantity: 2 }], approveOnSubmit: true },
      async () => 91,
      async () => {
        calls.push('lines');
        throw new Error('line save failed');
      },
      async () => calls.push('approve'),
      (purchaseOrderId) => calls.push(`created:${purchaseOrderId}`)
    ),
    /line save failed/
  );

  assert.deepEqual(calls, ['created:91', 'lines']);
});

test('purchase order creation skips approval unless requested', async () => {
  let approved = false;
  await createWorkflow(
    { partQuantities: [], approveOnSubmit: false },
    async () => 92,
    async () => {},
    async () => {
      approved = true;
    },
    () => {}
  );
  assert.equal(approved, false);
});

test('purchase order updates wait for part quantities before reporting success', async () => {
  const calls = [];
  await updatePurchaseOrderWorkflow(
    async () => calls.push('details'),
    async () => calls.push('parts')
  );
  assert.deepEqual(calls, ['details', 'parts']);
});

test('purchase order updates identify a partial save when part quantities fail', async () => {
  await assert.rejects(
    updatePurchaseOrderWorkflow(
      async () => {},
      async () => {
        throw new Error('parts failed');
      }
    ),
    (error) => error.name === 'PurchaseOrderPartsUpdateError'
  );
});
