const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const documentsDir = path.resolve(__dirname, '../src/content/own/Settings/Documents');
const cache = new Map();

/** Minimal TS loader: compiles the profile modules and their relative imports on the fly. */
function load(file) {
  const resolved = path.resolve(file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const source = fs.readFileSync(resolved, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true }
  }).outputText;
  const mod = new Module(resolved, module);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  cache.set(resolved, mod);
  const originalRequire = mod.require.bind(mod);
  mod.require = (request) => {
    if (request.startsWith('.')) {
      const base = path.resolve(path.dirname(resolved), request);
      const candidate = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')].find((item) => fs.existsSync(item));
      if (candidate) return load(candidate);
    }
    return originalRequire(request);
  };
  mod._compile(output, resolved);
  return mod.exports;
}

const { PDFME_PROCUREMENT_PROFILES } = load(path.join(documentsDir, 'pdfmeDocumentProfiles.ts'));
const { reorientTemplate } = load(path.join(documentsDir, 'pdfmeSchemaHelpers.ts'));
const t = (key) => key;

const javaProfile = fs.readFileSync(
  path.resolve(__dirname, '../../api/src/main/java/com/grash/service/PdfmeDocumentProfile.java'), 'utf8');

/** Same geometry rules as the API validator: every element inside the A4 page. */
function assertInsidePage(template, label) {
  const { width, height } = template.basePdf;
  assert.ok((width === 210 && height === 297) || (width === 297 && height === 210), `${label}: A4 page`);
  for (const page of template.schemas) {
    for (const schema of page) {
      const x = schema.position.x;
      const y = schema.position.y;
      assert.ok(x >= 0 && y >= 0, `${label}: ${schema.name} starts on the page`);
      assert.ok(x + schema.width <= width + 1e-6, `${label}: ${schema.name} fits the page width`);
      assert.ok(y + schema.height <= height + 1e-6, `${label}: ${schema.name} fits the page height`);
    }
  }
}

for (const [provider, profile] of Object.entries(PDFME_PROCUREMENT_PROFILES)) {
  test(`${provider} starter fits A4 in portrait and in landscape`, () => {
    const starter = profile.createStarter(t);
    assertInsidePage(starter, `${provider} portrait`);
    const landscape = reorientTemplate(starter, 'LANDSCAPE');
    assert.equal(landscape.basePdf.width, 297);
    assertInsidePage(landscape, `${provider} landscape`);
    const backToPortrait = reorientTemplate(landscape, 'PORTRAIT');
    assertInsidePage(backToPortrait, `${provider} portrait again`);
    assert.equal(reorientTemplate(starter, 'PORTRAIT'), starter, 'same orientation is a no-op');
  });

  test(`${provider} starter prints the logo and company header and binds its line table`, () => {
    const names = profile.createStarter(t).schemas.flat().map((schema) => schema.name);
    assert.ok(names.includes('company.logo'));
    assert.ok(names.includes('company.name'));
    const tables = profile.createStarter(t).schemas.flat().filter((schema) => schema.type === 'table');
    assert.equal(tables.length, 1);
    for (const binding of tables[0].columnBindings) {
      assert.ok(profile.tableColumns[tables[0].name].includes(binding), `${binding} is an allowed column`);
    }
    assert.equal(new Set(names).size, names.length, 'no duplicate element names on the page');
  });

  test(`${provider} table columns match the API profile`, () => {
    for (const [table, columns] of Object.entries(profile.tableColumns)) {
      const declaration = javaProfile.match(new RegExp(`"${table.replace('.', '\\.')}", List\\.of\\(([^)]*)\\)`));
      assert.ok(declaration, `${table} is declared in PdfmeDocumentProfile.java`);
      const javaColumns = [...declaration[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
      assert.deepEqual(columns, javaColumns);
    }
  });

  test(`${provider} palette components fit a portrait page once scaled`, () => {
    const { scaleSchemasToPageWidth } = load(path.join(documentsDir, 'pdfmeSchemaHelpers.ts'));
    for (const component of profile.componentDefinitions) {
      if (component.group === 'internal') continue;
      const schemas = scaleSchemasToPageWidth(profile.componentSchemas(component.id, t, 12), 210);
      assertInsidePage({ basePdf: { width: 210, height: 297 }, schemas: [schemas] }, `${provider}/${component.id}`);
    }
  });
}

// The API test PdfmeProcurementStarterValidationTest validates these exact starters with the real
// validator and data providers; this keeps the shared fixture in sync with the web profiles.
test('procurement starter fixture used by the API test is up to date', () => {
  const fixturePath = path.resolve(__dirname, '../../api/src/test/resources/pdfme/procurement-starters.json');
  const current = JSON.stringify(Object.fromEntries(Object.entries(PDFME_PROCUREMENT_PROFILES).map(([provider, profile]) => {
    const starter = profile.createStarter(t);
    return [provider, { portrait: starter, landscape: reorientTemplate(starter, 'LANDSCAPE') }];
  })), null, 2) + '\n';
  if (process.env.UPDATE_PDFME_FIXTURE === '1') fs.writeFileSync(fixturePath, current);
  assert.equal(fs.readFileSync(fixturePath, 'utf8'), current,
    'run UPDATE_PDFME_FIXTURE=1 node --test scripts/pdfme-document-profiles.test.cjs, then the API tests');
});
