const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const { groupRequestFormFields } = mobileRuntime().load(
  'utils/requestFormLayout.ts'
);

const field = (name) => ({ name, label: name, type: 'text' });
const translate = (key) => `[${key}]`;

test('request form groups configured fields and keeps custom fields after known sections', () => {
  const configuredFields = [
    field('title'),
    field('location'),
    field('customField_17'),
    field('description'),
    field('asset'),
    field('files'),
    field('dueDate'),
    field('customField_29')
  ];

  const groupedFields = groupRequestFormFields(configuredFields, translate);

  assert.deepEqual(
    Array.from(groupedFields, (item) => item.name),
    [
      'requestDetailsGroup',
      'title',
      'description',
      'assetInformationGroup',
      'location',
      'asset',
      'datesGroup',
      'dueDate',
      'additionalInformationGroup',
      'files',
      'customFieldsGroup',
      'customField_17',
      'customField_29'
    ]
  );
  assert.equal(groupedFields[0].label, '[request_details]');
  assert.equal(groupedFields.at(-3).label, '[custom_fields]');
  assert.deepEqual(
    Array.from(groupedFields)
      .filter((item) => item.type !== 'titleGroupField')
      .map((item) => item.name)
      .sort(),
    configuredFields.map((item) => item.name).sort()
  );
});

test('request form does not restore fields hidden by configuration or show empty sections', () => {
  const configuredFields = [field('title'), field('customField_17')];

  const groupedFields = groupRequestFormFields(configuredFields, translate);

  assert.deepEqual(
    Array.from(groupedFields, (item) => item.name),
    ['requestDetailsGroup', 'title', 'customFieldsGroup', 'customField_17']
  );
  assert.equal(
    groupedFields.some((item) => item.name === 'asset'),
    false
  );
  assert.equal(
    groupedFields.some((item) => item.name === 'files'),
    false
  );
});
