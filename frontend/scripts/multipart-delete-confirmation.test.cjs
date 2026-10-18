const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const slice = fs.readFileSync('src/slices/multipart.ts', 'utf8');
const screen = fs.readFileSync('src/content/own/Inventory/Sets.tsx', 'utf8');

test('multipart delete returns the API confirmation', () => {
  assert.match(
    slice,
    /if \(success\) \{\s*dispatch\(slice\.actions\.deleteMultiParts\(\{ id \}\)\);\s*\}\s*return success;/
  );
});

test('multipart state is only removed after confirmed deletion and existing ids are guarded', () => {
  assert.match(
    slice,
    /if \(multiPartIndex >= 0\) \{\s*state\.multiParts\.splice\(multiPartIndex, 1\);/
  );
  assert.match(
    slice,
    /if \(success\) \{\s*dispatch\(slice\.actions\.deleteMultiParts/
  );
});

test('set details remain open until the server confirms deletion', () => {
  assert.match(
    screen,
    /const deleted = await dispatch\(deleteMultiParts\(id\)\);[\s\S]*?if \(!deleted\) \{[\s\S]*?return;[\s\S]*?handleCloseDetails\(\);\s*onDeleteSuccess\(\);/
  );
  assert.doesNotMatch(
    screen,
    /const handleDelete = async \(id: number\) => \{\s*handleCloseDetails\(\);/
  );
});
