const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('work order search cancels its pending debounce when the page unmounts', () => {
  const source = fs.readFileSync(
    'src/content/own/WorkOrders/index.tsx',
    'utf8'
  );

  assert.match(
    source,
    /useEffect\(\(\) => \(\) => debouncedQueryChange\.clear\(\), \[debouncedQueryChange\]\)/
  );
});

test('list and picker searches cancel pending debounces when they unmount', () => {
  const files = [
    'src/content/own/Requests/index.tsx',
    'src/content/own/Assets/index.tsx',
    'src/content/own/VendorsAndCustomers/Customers.tsx',
    'src/content/own/PeopleAndTeams/People.tsx',
    'src/content/own/PeopleAndTeams/Teams.tsx',
    'src/content/own/VendorsAndCustomers/Vendors.tsx',
    'src/content/own/Meters/index.tsx',
    'src/content/own/Inventory/Parts.tsx',
    'src/content/own/Locations/index.tsx',
    'src/content/own/PurchaseOrders/index.tsx',
    'src/content/own/PreventiveMaintenance/index.tsx',
    'src/content/own/WorkOrders/Details/LinkModal.tsx'
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');

    assert.match(source, /debounce\(onQueryChange, 1300\)/, file);
    assert.match(
      source,
      /useEffect\(\(\) => \(\) => debouncedQueryChange\.clear\(\), \[debouncedQueryChange\]\)/,
      file
    );
  }
});
