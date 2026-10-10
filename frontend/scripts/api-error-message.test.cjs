const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/apiError.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }
).outputText;
function loadErrorHelper(language = 'fr') {
  const moduleExports = {};
  vm.runInNewContext(source, {
    exports: moduleExports,
    require: () => ({ __esModule: true, default: { language } })
  });
  return moduleExports.getApiErrorMessage;
}
const getApiErrorMessage = loadErrorHelper();

test('does not expose JSON null as an analytics error', () => {
  assert.equal(
    getApiErrorMessage({ message: 'Request failed (500)', status: 500, responseBody: null }),
    'Le serveur a rencontré une erreur (HTTP 500).'
  );
});

test('uses a useful message from a structured API error', () => {
  assert.equal(
    getApiErrorMessage({ status: 400, responseBody: { success: false, message: 'Date invalide' } }),
    'Date invalide'
  );
});

test('handles empty, null and non-JSON response bodies with status context', () => {
  assert.equal(getApiErrorMessage({ message: 'null', status: 403 }), 'Accès refusé (HTTP 403).');
  assert.equal(getApiErrorMessage({ status: 502, responseBody: '<html>gateway</html>' }), 'Le serveur est temporairement indisponible (HTTP 502).');
  assert.equal(getApiErrorMessage({}), 'Une erreur est survenue.');
});

test('uses English status messages when the selected UI language is English', () => {
  assert.equal(loadErrorHelper('en')({ status: 500 }), 'The server encountered an error (HTTP 500).');
});
