const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('data grid uses a subtle theme-aware hover across nested and pinned cells', () => {
  const source = fs.readFileSync(
    'src/content/own/components/CustomDatagrid2/index.tsx',
    'utf8'
  );

  assert.match(
    source,
    /'&:hover > \.MuiTableCell-root': \{\s*backgroundColor: theme\.palette\.action\.hover/
  );
  assert.match(
    source,
    /'&:hover': \{\s*backgroundColor: theme\.palette\.action\.hover/
  );
  assert.doesNotMatch(
    source,
    /backgroundColor: isNested\s*\?\s*theme\.palette\.primary\.main/
  );
});
