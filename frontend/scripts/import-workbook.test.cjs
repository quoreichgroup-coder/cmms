const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const xlsx = require('xlsx');

const sourcePath = path.join(__dirname, '../src/utils/importWorkbook.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, {
  exports: moduleExports,
  require: (name) => {
    assert.equal(name, 'xlsx');
    return xlsx;
  }
});

test('spreadsheet parser returns headers and rows from the first worksheet', () => {
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.aoa_to_sheet([
      ['Exchange_ID', 'Name', 'Functional_Location_Path'],
      ['e9fd0d9a-4a52-477e-82aa-49ac0f173771', 'Pump 01', 'Plant A / Utilities']
    ]),
    'Assets'
  );
  const file = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const parsed = moduleExports.parseImportWorkbook(new Uint8Array(file));

  assert.deepEqual(JSON.parse(JSON.stringify(parsed.headers)), [
    'Exchange_ID',
    'Name',
    'Functional_Location_Path'
  ]);
  assert.equal(parsed.rows[0].Name, 'Pump 01');
  assert.equal(parsed.rows[0].Functional_Location_Path, 'Plant A / Utilities');
  assert.equal(parsed.rowsAsArrays.length, 2);
});

test('spreadsheet parser rejects corrupt input instead of silently accepting it', () => {
  assert.throws(() =>
    moduleExports.parseImportWorkbook(new Uint8Array([0, 1, 2, 3]))
  );
});

test('import wizard ends loading and shows localized errors for read and parse failures', () => {
  const wizard = fs.readFileSync(
    path.join(__dirname, '../src/content/own/Imports/index.tsx'),
    'utf8'
  );
  const english = fs.readFileSync(
    path.join(__dirname, '../src/i18n/translations/en.ts'),
    'utf8'
  );
  const french = fs.readFileSync(
    path.join(__dirname, '../src/i18n/translations/fr.ts'),
    'utf8'
  );

  assert.match(
    wizard,
    /reader\.onerror\s*=\s*\(\)\s*=>\s*\{[\s\S]*?setLoading\(false\)/
  );
  assert.match(
    wizard,
    /reader\.onabort\s*=\s*\(\)\s*=>\s*\{[\s\S]*?setLoading\(false\)/
  );
  assert.match(
    wizard,
    /catch\s*\{[\s\S]*?setLoading\(false\)[\s\S]*?import_invalid_file/
  );
  assert.match(english, /import_invalid_file:/);
  assert.match(english, /import_file_read_error:/);
  assert.match(french, /import_invalid_file:/);
  assert.match(french, /import_file_read_error:/);
});
