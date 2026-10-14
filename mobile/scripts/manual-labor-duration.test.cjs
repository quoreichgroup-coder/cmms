const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const Yup = require('yup');
const { createManualLaborDurationFields } = mobileRuntime().load(
  'utils/manualLaborDuration.ts'
);
const durationFields = createManualLaborDurationFields((key) => key);
const schema = Yup.object().shape(durationFields);

test('manual labor duration accepts whole non-negative hour and minute values', async () => {
  await assert.doesNotReject(schema.validate({ hours: 2, minutes: 15 }));
  await assert.doesNotReject(schema.validate({ hours: 0, minutes: 0 }));
});

test('manual labor duration rejects decimal and negative values', async () => {
  for (const invalidValues of [
    { hours: 1.5, minutes: 0 },
    { hours: 0, minutes: 2.5 },
    { hours: -1, minutes: 0 },
    { hours: 0, minutes: -1 }
  ]) {
    await assert.rejects(schema.validate(invalidValues));
  }
});

test('manual labor duration keeps required-field feedback for blank values', async () => {
  await assert.rejects(
    schema.validateAt('hours', { hours: '', minutes: 0 }),
    (error) => error.message === 'required_hours'
  );
  await assert.rejects(
    schema.validateAt('minutes', { hours: 0, minutes: '' }),
    (error) => error.message === 'required_minutes'
  );
});
