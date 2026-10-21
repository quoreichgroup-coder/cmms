const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const teamsScreen = fs.readFileSync(
  path.join(__dirname, '../src/content/own/PeopleAndTeams/Teams.tsx'),
  'utf8'
);

test('team search stays available when the current result page is empty', () => {
  assert.match(
    teamsScreen,
    /<SearchInput onChange=\{debouncedQueryChange\} \/>/
  );
  assert.doesNotMatch(
    teamsScreen,
    /Boolean\(teams\.content\.length\)\s*&&\s*\([\s\S]{0,240}<SearchInput/
  );
});
