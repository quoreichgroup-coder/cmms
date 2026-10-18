const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

test('shared attachment deletion locks immediately and announces its busy state', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components/AttachmentList.tsx'),
    'utf8'
  );

  assert.match(source, /const deletingRef = useRef\(false\)/);
  assert.match(source, /if \(!deletingFile \|\| deletingRef\.current\) return/);
  assert.match(
    source,
    /deletingRef\.current = true;[\s\S]*?setDeleting\(true\)/
  );
  assert.match(
    source,
    /finally \{\s*deletingRef\.current = false;[\s\S]*?setDeleting\(false\)/
  );
  assert.match(
    source,
    /accessibilityState=\{\{ disabled: deleting, busy: deleting \}\}/
  );
});

test('attachment empty state uses a decorative icon, not a no-op button', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components/AttachmentList.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /<MaterialCommunityIcons\s+name="file-outline"[\s\S]*?accessible=\{false\}\s*\/>/
  );
  assert.doesNotMatch(source, /<IconButton\s+icon="file-outline"/);
});
