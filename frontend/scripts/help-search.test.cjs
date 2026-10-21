const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '../src/content/own/HelpCenter/normalizeHelpSearch.ts'),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;
const helpSearch = (() => {
  const exports = {};
  vm.runInNewContext(compiled, { exports });
  return exports;
})();

test('help search matches French guide words without requiring accents', () => {
  assert.ok(
    helpSearch
      .normalizeHelpSearch('Équipements')
      .includes(helpSearch.normalizeHelpSearch('equipement'))
  );
  assert.ok(
    helpSearch
      .normalizeHelpSearch('Demande d intervention')
      .includes(helpSearch.normalizeHelpSearch('intervention'))
  );
});

test('help search ignores case while preserving ordinary characters', () => {
  assert.equal(
    helpSearch.normalizeHelpSearch('WORK ORDERS'),
    helpSearch.normalizeHelpSearch('Work Orders')
  );
  assert.equal(helpSearch.normalizeHelpSearch('QPM 360'), 'qpm 360');
});
