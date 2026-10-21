const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

for (const directory of [
  {
    name: 'People',
    path: 'screens/peopleTeams/People.tsx',
    data: 'visibleUsers',
    refresh: 'loadUsers'
  },
  {
    name: 'Teams',
    path: 'screens/peopleTeams/Teams.tsx',
    data: 'visibleTeams',
    refresh: 'loadTeams'
  }
]) {
  test(`${directory.name} hides rows until debounced search results are current`, () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', directory.path),
      'utf8'
    );

    assert.match(
      source,
      /loadedCriteria !== null &&\s*_.isEqual\(loadedCriteria\.filterFields, criteria\.filterFields\) &&\s*loadedCriteria\.searchQuery === searchQuery &&\s*criteriaSearchQuery === searchQuery/
    );
    assert.ok(source.includes(`data={canView ? ${directory.data} : []}`));
    assert.match(source, /lastPage \|\|\s*!hasCurrentCriteriaResults \|\|/);
    assert.ok(source.includes(`onChangeText={onSearchTextChange}`));
    assert.match(
      source,
      /const onSearchTextChange = \(query: string\) => \{\s*setLoadError\(false\);\s*setLoadMoreError\(false\);\s*setSearchQuery\(query\);/
    );
    assert.match(
      source,
      /if \(activeListLoadId\.current === requestId\) \{\s*setLoadedCriteria\(/
    );
  });
}
