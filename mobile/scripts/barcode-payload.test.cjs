const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

test('empty scanner callbacks are ignored without altering valid payloads', () => {
  const { hasBarcodePayload } = mobileRuntime().load('utils/barcodePayload.ts');

  assert.equal(hasBarcodePayload(''), false);
  assert.equal(hasBarcodePayload('   \n\t'), false);
  assert.equal(hasBarcodePayload(null), false);
  assert.equal(hasBarcodePayload(123), false);
  assert.equal(hasBarcodePayload('QPM-AST-0042'), true);
  assert.equal(hasBarcodePayload(' QPM:asset/0042 '), true);
});

test('the barcode modal validates before consuming its one-shot scan guard', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectBarcodeModal.tsx'),
    'utf8'
  );
  const handler = source.match(
    /const handleBarCodeScanned = \(\{ data \}: \{ type: string; data: string \}\) => \{([\s\S]*?)\n  \};/
  );

  assert.ok(handler, 'barcode callback should be present');
  assert.match(handler[1], /!hasBarcodePayload\(data\)/);
  assert.ok(
    handler[1].indexOf('!hasBarcodePayload(data)') <
      handler[1].indexOf('scanHandledRef.current = true'),
    'invalid payload must leave the scanner available for the next callback'
  );
  assert.match(handler[1], /onChange\(data\)/);
  assert.doesNotMatch(handler[1], /onChange\(data\.trim\(\)\)/);
});
