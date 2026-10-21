const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

test('Files list does not load a file detail parameter absent from its route', () => {
  const component = fs.readFileSync(
    path.join(__dirname, '../src/content/own/Files/index.tsx'),
    'utf8'
  );
  const routes = fs.readFileSync(
    path.join(__dirname, '../src/router/app.tsx'),
    'utf8'
  );

  assert.match(routes, /path:\s*'files',\s*element:\s*<Files\s*\/>/);
  assert.doesNotMatch(
    component,
    /useParams|getSingleFile|clearSingleFile|openDrawerFromUrl/
  );
  assert.match(component, /const handleRename = \(id: number\)/);
  assert.match(component, /const handleOpenDelete = \(id: number\)/);
});
