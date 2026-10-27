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

test('report editor navigation and accessible reorder actions are localized', () => {
  const english = loadLocale('i18n/translations/en.ts');
  const french = loadLocale('i18n/translations/fr.ts');
  const keys = [
    'document_template_editor_sections',
    'document_template_section_general',
    'document_template_section_page',
    'document_template_section_fields',
    'document_template_canvas_move_up',
    'document_template_canvas_move_down'
  ];

  for (const key of keys) {
    assert.ok(english[key], `Missing English translation for ${key}`);
    assert.ok(french[key], `Missing French translation for ${key}`);
  }
});

test('designer start modes, searchable palette, removal and PDF output are localized', () => {
  const english = loadLocale('i18n/translations/en.ts');
  const french = loadLocale('i18n/translations/fr.ts');
  const keys = [
    'document_designer_start_blank',
    'document_designer_start_existing',
    'document_designer_create_blank',
    'document_designer_search_fields',
    'document_designer_remove_component',
    'document_designer_pdf_read_only',
    'document_designer_open_pdf',
    'document_designer_saved_state',
    'document_designer_unsaved',
    'document_designer_leave_title',
    'document_designer_leave_body',
    'document_designer_save_leave',
    'document_designer_discard_leave',
    'document_designer_changed_during_save'
  ];

  for (const key of keys) {
    assert.ok(english[key], `Missing English translation for ${key}`);
    assert.ok(french[key], `Missing French translation for ${key}`);
  }
});

test('Document Designer links stay within the authenticated /app route', () => {
  const templates = fs.readFileSync(
    path.join(
      sourceRoot,
      'content/own/Settings/Documents/DocumentTemplates.tsx'
    ),
    'utf8'
  );
  const designer = fs.readFileSync(
    path.join(
      sourceRoot,
      'content/own/Settings/Documents/DocumentDesigner.tsx'
    ),
    'utf8'
  );
  const routes = fs.readFileSync(
    path.join(sourceRoot, 'router/app.tsx'),
    'utf8'
  );
  const rootRouter = fs.readFileSync(
    path.join(sourceRoot, 'router/index.tsx'),
    'utf8'
  );

  assert.match(rootRouter, /path:\s*'app'[\s\S]*children:\s*appRoutes/);
  assert.match(routes, /path:\s*'documents\/:id\/designer'/);
  assert.match(
    templates,
    /`\/app\/settings\/documents\/\$\{template\.id\}\/designer`/
  );
  assert.match(designer, /navigate\('\/app\/settings\/documents'\)/);
  assert.doesNotMatch(
    templates,
    /`\/settings\/documents\/\$\{template\.id\}\/designer`/
  );
  assert.doesNotMatch(designer, /navigate\('\/settings\/documents'\)/);
});

test('dirty draft navigation blocks the route until the transition is retried', () => {
  const source = fs.readFileSync(
    path.join(
      sourceRoot,
      'content/own/Settings/Documents/documentDesignerNavigation.ts'
    ),
    'utf8'
  );
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module });

  const { createMemoryHistory } = require('history');
  const history = createMemoryHistory({ initialEntries: ['/designer'] });
  let retryTransition;
  const unblock = module.exports.blockDocumentNavigation(history, (retry) => {
    retryTransition = retry;
  });

  history.push('/reports');
  assert.equal(history.location.pathname, '/designer');
  assert.equal(typeof retryTransition, 'function');

  retryTransition();
  assert.equal(history.location.pathname, '/reports');
  unblock();
});
