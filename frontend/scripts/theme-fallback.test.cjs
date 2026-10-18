const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/theme/base.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;

const pureLightTheme = { name: 'PureLightTheme' };
const moduleExports = {};
vm.runInNewContext(source, {
  exports: moduleExports,
  require(id) {
    if (id === './schemes/PureLightTheme')
      return { PureLightTheme: pureLightTheme };
    if (id === './schemes/GreyGooseTheme')
      return { GreyGooseTheme: { name: 'GreyGooseTheme' } };
    if (id === './schemes/PurpleFlowTheme')
      return { PurpleFlowTheme: { name: 'PurpleFlowTheme' } };
    return require(id);
  }
});

test('themeCreator returns the requested supported theme', () => {
  assert.equal(
    moduleExports.themeCreator('GreyGooseTheme').name,
    'GreyGooseTheme'
  );
});

test('themeCreator falls back to QPM light theme for an unknown preference', () => {
  assert.equal(
    moduleExports.themeCreator('deleted-or-invalid-theme'),
    pureLightTheme
  );
});
