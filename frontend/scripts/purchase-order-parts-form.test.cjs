const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(
  'src/content/own/components/form/SelectPartQuantities.tsx',
  'utf8'
);

test('adding selected parts synchronizes the controlled form value', () => {
  assert.match(
    source,
    /setPartQuantities\(newPartQuantities\);\s*onChange\(newPartQuantities\);/
  );
});

test('removing a selected part synchronizes the controlled form value', () => {
  assert.match(
    source,
    /const updatedPartQuantities = partQuantities\.filter\([\s\S]*?setPartQuantities\(updatedPartQuantities\);\s*onChange\(updatedPartQuantities\);/
  );
});

test('quantity edits continue to synchronize the controlled form value', () => {
  assert.match(
    source,
    /setPartQuantities\(partQuantitiesClone\);\s*onChange\(partQuantitiesClone\);/
  );
});
