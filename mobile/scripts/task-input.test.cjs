const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const {
  isCompleteNumericInput,
  getNumericFormErrors,
  normalizeFormNumberInput,
  normalizeNumericFormValues,
  normalizeNumericInput,
  shouldPersistTaskInput,
  toggleNumericSign
} = mobileRuntime().load('utils/numericInput.ts');
const { enqueueTaskSave } = mobileRuntime().load('utils/taskSaveQueue.ts');

test('numeric task input preserves French decimal commas and signed readings', () => {
  assert.equal(normalizeNumericInput('12,75'), '12.75');
  assert.equal(normalizeNumericInput('-3,2'), '-3.2');
  assert.equal(normalizeNumericInput(' -1.2,3abc'), '-1.23');
  assert.equal(normalizeNumericInput('1-2'), '12');
});

test('form number input converts locale commas without changing decimal magnitude', () => {
  assert.equal(normalizeFormNumberInput('12,75'), '12.75');
  assert.equal(normalizeFormNumberInput('1.2,3'), '1.23');
  assert.equal(normalizeFormNumberInput('-3,2'), '3.2');
});

test('optional form numbers stay empty instead of becoming zero, and partial numbers are rejected', () => {
  const errors = getNumericFormErrors(
    { quantity: '.', cost: '', minimum: '2.5' },
    ['quantity', 'cost', 'minimum'],
    'Enter a complete number.'
  );
  assert.deepEqual({ ...errors }, { quantity: 'Enter a complete number.' });

  assert.deepEqual(
    {
      ...normalizeNumericFormValues(
        { quantity: '', cost: '12.5', enabled: false },
        ['quantity', 'cost']
      )
    },
    { quantity: null, cost: '12.5', enabled: false }
  );
});

test('numeric task input waits until a partial value is valid before saving', () => {
  for (const value of ['', '-', '.', '-.']) {
    assert.equal(isCompleteNumericInput(value), false);
  }
  for (const value of ['0', '-0.4', '12.75']) {
    assert.equal(isCompleteNumericInput(value), true);
  }
});

test('numeric sign control toggles readings without losing decimal precision', () => {
  assert.equal(toggleNumericSign('12.75'), '-12.75');
  assert.equal(toggleNumericSign('-0.4'), '0.4');
  assert.equal(normalizeNumericInput(toggleNumericSign('')), '-');
});

test('task input persists intentional clearing but holds incomplete numeric edits', () => {
  assert.equal(shouldPersistTaskInput('TEXT', ''), true);
  assert.equal(shouldPersistTaskInput('NUMBER', ''), true);
  assert.equal(shouldPersistTaskInput('METER', ''), true);
  for (const value of ['-', '.', '-.']) {
    assert.equal(shouldPersistTaskInput('NUMBER', value), false);
  }
  assert.equal(shouldPersistTaskInput('METER', '-0.4'), true);
});

test('task saves run in edit order and never overlap', async () => {
  const order = [];
  let releaseFirstSave;
  let notifyFirstSaveStarted;
  let activeSaves = 0;
  let maximumActiveSaves = 0;
  const firstSaveStarted = new Promise((resolve) => {
    notifyFirstSaveStarted = resolve;
  });
  const firstSaveBarrier = new Promise((resolve) => {
    releaseFirstSave = resolve;
  });
  const runSave = async (name, barrier) => {
    activeSaves += 1;
    maximumActiveSaves = Math.max(maximumActiveSaves, activeSaves);
    order.push(`${name}:start`);
    if (barrier) {
      notifyFirstSaveStarted();
      await barrier;
    }
    order.push(`${name}:end`);
    activeSaves -= 1;
  };

  const first = enqueueTaskSave(Promise.resolve(), () =>
    runSave('older', firstSaveBarrier)
  );
  const second = enqueueTaskSave(first, () => runSave('newer'));

  await firstSaveStarted;
  assert.deepEqual(order, ['older:start']);
  releaseFirstSave();
  await Promise.all([first, second]);

  assert.deepEqual(order, [
    'older:start',
    'older:end',
    'newer:start',
    'newer:end'
  ]);
  assert.equal(maximumActiveSaves, 1);
});

test('a failed task save does not block a later save', async () => {
  const failedSave = enqueueTaskSave(Promise.resolve(), async () => {
    throw new Error('offline');
  });
  const nextSave = enqueueTaskSave(failedSave, async () => 'saved');

  await assert.rejects(failedSave, /offline/);
  assert.equal(await nextSave, 'saved');
});
