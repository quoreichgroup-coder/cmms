const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const runtime = mobileRuntime();
const { hasFreshSearchResults } = runtime.load(
  'utils/searchCriteriaFreshness.ts'
);

for (const directory of [
  {
    name: 'Vendors',
    path: 'screens/vendorsCustomers/VendorsScreen.tsx',
    rows: 'visibleVendors',
    load: 'loadVendors',
    paginate: 'loadMoreVendors'
  },
  {
    name: 'Customers',
    path: 'screens/vendorsCustomers/CustomersScreen.tsx',
    rows: 'visibleCustomers',
    load: 'loadCustomers',
    paginate: 'loadMoreCustomers'
  }
]) {
  test(`${directory.name} hide stale rows and block pagination while criteria change`, () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', directory.path),
      'utf8'
    );

    assert.match(source, /hasFreshSearchResults\(/);
    assert.ok(source.includes(`data={canView ? ${directory.rows} : []}`));
    assert.match(source, /lastPage \|\|\s*!hasCurrentCriteriaResults \|\|/);
    assert.match(
      source,
      /!hasCurrentCriteriaResults && !loadError/,
      'a changed query shows loading instead of a false empty state'
    );
    assert.match(source, /onChangeText=\{setSearchQuery\}/);
    assert.match(
      source,
      new RegExp(
        `setLoadedCriteria\\([\\s\\S]*?filterFields: requestFilterFields,[\\s\\S]*?searchQuery: requestSearchQuery`
      )
    );
    assert.ok(source.includes(`void ${directory.paginate}(true)`));
  });
}

test('search freshness covers debounce, filter changes, clear and retype', () => {
  const currentFilters = [
    {
      field: 'name',
      value: 'Pump',
      operation: 'cn',
      alternatives: [{ field: 'address', value: 'Pump', operation: 'cn' }]
    }
  ];
  const loaded = { filterFields: currentFilters, searchQuery: 'Pump' };

  assert.equal(
    hasFreshSearchResults(loaded, currentFilters, 'Valve'),
    false,
    'text changes must hide rows during the debounce interval'
  );
  assert.equal(
    hasFreshSearchResults(loaded, [], 'Pump'),
    false,
    'a different applied filter must hide results even if search text matches'
  );
  assert.equal(
    hasFreshSearchResults(loaded, currentFilters, ''),
    false,
    'clearing the text must hide results until the unfiltered request completes'
  );
  assert.equal(
    hasFreshSearchResults({ filterFields: [], searchQuery: '' }, [], ''),
    true,
    'the cleared search becomes fresh after its criteria are loaded'
  );
  assert.equal(
    hasFreshSearchResults(loaded, currentFilters, 'Pump'),
    true,
    'retyping the exact text and matching criteria may reuse valid results'
  );
});
