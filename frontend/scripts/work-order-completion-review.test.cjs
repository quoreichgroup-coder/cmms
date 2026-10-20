const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
const modal = fs.readFileSync(
  path.join(root, 'src/content/own/WorkOrders/Details/CompleteWOModal.tsx'),
  'utf8'
);
const details = fs.readFileSync(
  path.join(root, 'src/content/own/WorkOrders/Details/WorkOrderDetails.tsx'),
  'utf8'
);

test('web completion form previews entered values before invoking the close API', () => {
  assert.match(modal, /setReviewValues\(values\)/);
  assert.match(modal, /values=\{formValues\}/);
  assert.match(modal, /setFormValues\(reviewValues \?\? \{\}\)/);
  assert.match(modal, /reviewValues\.feedback\?\.trim\(\)/);
  assert.match(modal, /work_order_completion_signature_captured/);
  assert.match(modal, /work_order_completion_tracked_time/);
  assert.match(modal, /TimerOutlinedIcon/);
  assert.match(modal, /bgcolor: 'action\.hover'/);
  assert.match(modal, /work_order_completion_review_title/);
  assert.match(modal, /disabled=\{saving \|\| loadingExecutionTime\}/);
  assert.match(
    modal,
    /onClick=\{async \(\) => \{[\s\S]*?onComplete\([\s\S]*?reviewValues\.signature/
  );
  assert.match(details, /laborEntries=\{labors\.map/);
  assert.match(details, /t\('wo_close_success', \{[\s\S]*?identifier:/);
});
