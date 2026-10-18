const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sourceRoot = path.join(__dirname, '..', 'src');

function collectTsxFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(entryPath);
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

test('Web application uses the shared outlined icon family', () => {
  const files = collectTsxFiles(sourceRoot);
  const regressions = files.filter((file) =>
    /\b[A-Z][A-Za-z0-9]*TwoTone[A-Za-z0-9]*\b/.test(
      fs.readFileSync(file, 'utf8')
    )
  );

  assert.deepEqual(
    regressions,
    [],
    'Replace TwoTone icons with the matching MUI Outlined icon.'
  );
});
