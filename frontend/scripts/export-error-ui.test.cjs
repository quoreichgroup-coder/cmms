const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const exportPages = [
  'src/content/own/Assets/index.tsx',
  'src/content/own/Locations/index.tsx',
  'src/content/own/WorkOrders/index.tsx',
  'src/content/own/PreventiveMaintenance/index.tsx',
  'src/content/own/Meters/index.tsx',
  'src/content/own/Inventory/Parts.tsx'
];

test('export menus show the actual STOMP/API failure and retain a fallback', () => {
  for (const file of exportPages) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(
      source,
      /catch\s*\(error\)\s*\{[^}]{0,180}getErrorMessage\(error,\s*t\('Export failed'\)\)/s,
      `${file} should surface the actionable export error`
    );
  }
});
