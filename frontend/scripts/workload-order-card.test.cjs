const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

test('workload orders use a readable, keyboard-openable draggable card', () => {
  const card = read(
    'src/content/own/WorkOrders/WorkloadView/WorkloadOrderCard.tsx'
  );
  const view = read('src/content/own/WorkOrders/WorkloadView/index.tsx');

  assert.match(view, /<WorkloadOrderCard/);
  assert.match(view, /<Fragment key=\{userSummary\.userId\}>/);
  assert.match(view, /getWorkloadUserDisplayName\(user\.id, allUsers\)/);
  assert.match(card, /aria-label=\{t\('workload_open_order_aria'/);
  assert.match(card, /onKeyDownCapture=\{handleKeyDown\}/);
  assert.doesNotMatch(card, /dragHandleProps\?\.onKeyDown/);
  assert.match(card, /\.\.\.provided\.dragHandleProps/);
  assert.match(card, /event\.key !== 'Enter'/);
  assert.match(card, /&:focus-visible/);
  assert.match(card, /workOrder\.estimatedDuration/);
  assert.match(card, /<WorkOrderStatusChip status=\{workOrder\.status\}/);
});
