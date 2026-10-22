const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const sourceRoot = path.join(__dirname, '../src');

function loadLocale(relativePath) {
  const source = fs.readFileSync(path.join(sourceRoot, relativePath), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module });
  return module.exports.default;
}

function configuredFields() {
  const source = fs.readFileSync(
    path.join(
      sourceRoot,
      'content/own/Settings/Documents/DocumentTemplates.tsx'
    ),
    'utf8'
  );
  return [
    ...source.matchAll(
      /const (?:workOrderFields|requestFields) = \[([\s\S]*?)\];/g
    )
  ].flatMap(([, values]) =>
    [...values.matchAll(/'([^']+)'/g)].map(([, value]) => value)
  );
}

test('every configurable Work Order and Request report field has French and English labels', () => {
  const english = loadLocale('i18n/translations/en.ts');
  const french = loadLocale('i18n/translations/fr.ts');
  const fields = configuredFields();

  assert.ok(fields.length > 0);
  for (const field of fields) {
    const key = `document_field_${field.replace(/\./g, '_')}`;
    assert.ok(english[key], `Missing English label for ${field}`);
    assert.ok(french[key], `Missing French label for ${field}`);
  }
});
