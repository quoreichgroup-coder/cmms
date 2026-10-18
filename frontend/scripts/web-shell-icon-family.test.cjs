const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const shellRoot = path.join(
  __dirname,
  '..',
  'src',
  'layouts',
  'ExtendedSidebarLayout'
);

test('the web navigation shell no longer mixes TwoTone icons with outlined icons', () => {
  const sourceFiles = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (/\.[jt]sx?$/.test(entry.name)) sourceFiles.push(entryPath);
    }
  };
  visit(shellRoot);

  assert.ok(sourceFiles.length > 0);
  for (const sourceFile of sourceFiles) {
    const source = fs.readFileSync(sourceFile, 'utf8');
    assert.doesNotMatch(source, /TwoTone/);
  }
});
