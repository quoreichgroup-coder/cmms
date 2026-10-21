const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(
  'src/content/own/WorkOrders/WorkloadView/index.tsx',
  'utf8'
);

test('duration dialog is only dismissed after the scheduling request succeeds', () => {
  const submitStart = source.indexOf(
    'const handleDurationSubmit = async () => {'
  );
  const cancelStart = source.indexOf(
    'const handleDurationCancel =',
    submitStart
  );
  const submitHandler = source.slice(submitStart, cancelStart);
  const awaitedRequest = submitHandler.indexOf('await doSchedule(');
  const closeDialog = submitHandler.indexOf('setDurationModalOpen(false)');
  const catchBlock = submitHandler.slice(
    submitHandler.indexOf('} catch (err) {'),
    submitHandler.indexOf('} finally {')
  );

  assert.notEqual(submitStart, -1);
  assert.ok(awaitedRequest >= 0);
  assert.ok(closeDialog > awaitedRequest);
  assert.match(catchBlock, /showSnackBar\(getErrorMessage\(err\), 'error'\)/);
  assert.doesNotMatch(catchBlock, /setDurationModalOpen\(false\)/);
});

test('duration scheduling prevents duplicate submits and accidental dismissal while pending', () => {
  assert.match(source, /if \(isSchedulingDuration\) return;/);
  assert.match(source, /isSchedulingDuration \|\|\s*\(durationHours === 0/);
  assert.match(
    source,
    /if \(!isSchedulingDuration\) handleDurationCancel\(\);/
  );
});
