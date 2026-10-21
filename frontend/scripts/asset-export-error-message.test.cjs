const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.join(__dirname, '../src');

function loadLocale(file) {
  const source = fs.readFileSync(
    path.join(root, 'i18n/translations', file),
    'utf8'
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;
  const moduleExports = {};
  vm.runInNewContext(compiled, { exports: moduleExports });
  return moduleExports.default;
}

test('asset export failure uses a localized fallback message', () => {
  const page = fs.readFileSync(
    path.join(root, 'content/own/Assets/index.tsx'),
    'utf8'
  );
  const english = loadLocale('en.ts');
  const french = loadLocale('fr.ts');

  assert.match(page, /getErrorMessage\(error, t\('asset_export_failure'\)\)/);
  assert.equal(
    english.asset_export_failure,
    'Could not export assets. Please try again.'
  );
  assert.equal(
    french.asset_export_failure,
    'Impossible d’exporter les équipements. Veuillez réessayer.'
  );
  assert.doesNotMatch(page, /t\('Export failed'\)/);
});
