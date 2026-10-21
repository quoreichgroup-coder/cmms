const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const { findVisibleFieldConfiguration, getWorkOrderFieldConfigurations } =
  mobileRuntime().load('utils/visibleFieldConfiguration.ts');

test('work order details safely use no rules when company configuration is absent', () => {
  const missingConfiguration = getWorkOrderFieldConfigurations(undefined);
  assert.equal(missingConfiguration.length, 0);
  assert.equal(
    getWorkOrderFieldConfigurations(undefined),
    missingConfiguration,
    'the empty fallback stays referentially stable across renders'
  );
  assert.equal(getWorkOrderFieldConfigurations(null).length, 0);
  assert.equal(getWorkOrderFieldConfigurations({}).length, 0);
  assert.equal(
    getWorkOrderFieldConfigurations({ workOrderFieldConfigurations: null })
      .length,
    0
  );
  const rules = [configuration('completeTime', 'REQUIRED')];
  assert.deepEqual(
    getWorkOrderFieldConfigurations({ workOrderFieldConfigurations: rules }),
    rules
  );
});

const configuration = (fieldName, fieldType = 'OPTIONAL') => ({
  fieldName,
  fieldType
});

test('returns the matching rule for a visible field', () => {
  const fields = [{ name: 'title' }, { name: 'asset' }];
  const rules = [configuration('asset', 'REQUIRED')];

  const result = findVisibleFieldConfiguration(fields, 'asset', rules);
  assert.equal(result.fieldIndex, 1);
  assert.equal(result.configuration, rules[0]);
});

test('ignores missing rules and fields removed by UI configuration', () => {
  assert.equal(
    findVisibleFieldConfiguration([{ name: 'title' }], 'asset', [
      configuration('asset', 'REQUIRED')
    ]),
    null
  );
  assert.equal(
    findVisibleFieldConfiguration([{ name: 'title' }], 'asset', undefined),
    null
  );
  assert.equal(
    findVisibleFieldConfiguration([{ name: 'asset' }], 'asset', []),
    null
  );
});

test('supports a mapped configuration name for shared work order fields', () => {
  const rules = [configuration('images', 'REQUIRED')];

  const result = findVisibleFieldConfiguration(
    [{ name: 'image' }],
    'image',
    rules,
    'images'
  );
  assert.equal(result.fieldIndex, 0);
  assert.equal(result.configuration, rules[0]);
});
