const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const { hasActiveAudioRecording, updateActiveAudioRecordingFields } =
  mobileRuntime().load('utils/formAudioRecording.ts');

test('form submission stays blocked until every active audio field is stopped', () => {
  let activeFields = {};
  activeFields = updateActiveAudioRecordingFields(
    activeFields,
    'description',
    true
  );
  activeFields = updateActiveAudioRecordingFields(
    activeFields,
    'inspection',
    true
  );
  assert.equal(hasActiveAudioRecording(activeFields), true);

  activeFields = updateActiveAudioRecordingFields(
    activeFields,
    'description',
    false
  );
  assert.equal(hasActiveAudioRecording(activeFields), true);

  activeFields = updateActiveAudioRecordingFields(
    activeFields,
    'inspection',
    false
  );
  assert.equal(hasActiveAudioRecording(activeFields), false);
});

test('stopping an inactive field does not clear another active recording', () => {
  const activeFields = updateActiveAudioRecordingFields(
    { description: true },
    'inspection',
    false
  );
  assert.equal(activeFields.description, true);
  assert.equal(Object.keys(activeFields).length, 1);
  assert.equal(hasActiveAudioRecording(activeFields), true);
});
