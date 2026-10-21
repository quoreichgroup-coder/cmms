const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const { formatXofAmount, formatCompanyCurrency } = mobileRuntime().load(
  'utils/formatCurrency.ts'
);

test('UEMOA XOF amounts display as localized FCFA without decimal places', () => {
  assert.equal(formatXofAmount(1250000, 'fr-FR'), '1 250 000 FCFA');
  assert.equal(formatXofAmount('1250000', 'en-US'), '1,250,000 FCFA');
});

test('invalid and empty amounts are not silently changed to zero', () => {
  assert.equal(formatXofAmount('', 'fr-FR'), '');
  assert.equal(formatXofAmount('n/a', 'fr-FR'), 'n/a XOF');
});

test('company currency formatting handles UEMOA and historical symbols safely', () => {
  assert.equal(
    formatCompanyCurrency(1250000, 'XOF', 'fr-FR'),
    '1 250 000 FCFA'
  );
  assert.match(formatCompanyCurrency(1234, 'EUR', 'fr-FR'), /1\s?234,00\s?€/);
  assert.equal(formatCompanyCurrency(1234, '$', 'en-US'), '$ 1,234');
  assert.equal(
    formatCompanyCurrency(1234, 'BAD-CODE', 'en-US'),
    'BAD-CODE 1,234'
  );
  assert.equal(formatCompanyCurrency('', null, 'fr-FR'), '');
});
