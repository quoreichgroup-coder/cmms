const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const loadRelatedFields = () => {
  const sourcePath = path.join(
    __dirname,
    '../src/content/own/components/form/relatedFields.ts'
  );
  const source = fs.readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports }, { filename: sourcePath });
  return exports;
};

test('hiding a present related field preserves every other field', () => {
  const { removeRelatedFieldIfPresent } = loadRelatedFields();
  const fields = [{ name: 'asset' }, { name: 'location' }, { name: 'summary' }];

  assert.deepEqual(removeRelatedFieldIfPresent(fields, 'location'), [
    { name: 'asset' },
    { name: 'summary' }
  ]);
});

test('hiding an already absent related field does not remove the last field', () => {
  const { removeRelatedFieldIfPresent } = loadRelatedFields();
  const fields = [{ name: 'asset' }, { name: 'summary' }];

  assert.deepEqual(removeRelatedFieldIfPresent(fields, 'location'), fields);
});

test('the shared form uses the guarded related-field removal helper', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/content/own/components/form/index.tsx'),
    'utf8'
  );

  assert.match(source, /removeRelatedFieldIfPresent\(/);
});
