const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const sourceRoot = path.join(__dirname, '../src');

function loadPdfContentTypeHelper() {
  const source = fs.readFileSync(
    path.join(sourceRoot, 'utils/documentResponse.ts'),
    'utf8'
  );
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports });
  return exports.isPdfContentType;
}

test('issued document downloads accept only a PDF content type', () => {
  const isPdfContentType = loadPdfContentTypeHelper();
  assert.equal(isPdfContentType('application/pdf'), true);
  assert.equal(isPdfContentType('Application/PDF; charset=binary'), true);
  assert.equal(isPdfContentType('text/html'), false);
  assert.equal(isPdfContentType('application/json'), false);
  assert.equal(isPdfContentType(null), false);
});

test('issued document history ignores stale responses and exposes retry/loading states', () => {
  const component = fs.readFileSync(
    path.join(
      sourceRoot,
      'content/own/WorkOrders/Details/ReportConfigModal.tsx'
    ),
    'utf8'
  );

  assert.match(component, /const documentsRequest = useRef\(0\)/);
  assert.match(component, /requestId !== documentsRequest\.current/);
  assert.match(component, /documentsRequest\.current \+= 1/);
  assert.match(component, /documentsLoading \? \(/);
  assert.match(component, /documentsLoadFailed \?/);
  assert.match(component, /disabled=\{documentsLoading\}/);
  assert.match(
    component,
    /isPdfContentType\(response\.headers\.get\('content-type'\)\)/
  );
});
