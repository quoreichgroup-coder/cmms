const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(
  'src/content/own/components/PartQuantitiesList.tsx',
  'utf8'
);

test('part quantity rows stack item identity and controls on narrow screens', () => {
  assert.match(source, /flexDirection: \{ xs: 'column', sm: 'row' \}/);
  assert.match(source, /width: \{ xs: '100%', sm: 'auto' \}/);
  assert.doesNotMatch(source, /width: '18rem'|width: '11rem'/);
});

test('part quantity controls retain a usable touch target', () => {
  assert.match(
    source,
    /minWidth:\s*\{\s*xs: 48,\s*sm: 40\s*\},\s*minHeight:\s*\{\s*xs: 48,\s*sm: 40\s*\}/
  );
});
