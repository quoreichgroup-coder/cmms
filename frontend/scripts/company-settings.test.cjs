const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const compiled = ts.transpileModule(
  fs.readFileSync('src/contexts/CompanySettingsContext.tsx', 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true
    }
  }
).outputText;
function settings(companySettings) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    React,
    Intl,
    window: {},
    require(id) {
      if (id.endsWith('/useAuth'))
        return {
          __esModule: true,
          default: () => ({ companySettings, isAuthenticated: false })
        };
      if (id === '../store')
        return {
          useDispatch: () => () => {},
          useSelector: (fn) => fn({ users: { allUsersMini: [] } })
        };
      if (id.endsWith('/useBrand')) return { useBrand: () => ({}) };
      if (id.endsWith('/safeWindow')) return { openSafeWindow: () => {} };
      if (id.endsWith('/apiError'))
        return { getApiErrorMessage: () => 'request_failed' };
      if (id === 'react-i18next')
        return {
          useTranslation: () => ({ t: (x) => x, i18n: { language: 'en-US' } })
        };
      if (id.endsWith('/utils/formatCurrency')) {
        const formatterExports = {};
        const formatterSource = ts.transpileModule(
          fs.readFileSync('src/utils/formatCurrency.ts', 'utf8'),
          { compilerOptions: { module: ts.ModuleKind.CommonJS } }
        ).outputText;
        vm.runInNewContext(formatterSource, {
          exports: formatterExports,
          Intl
        });
        return formatterExports;
      }
      if (id.endsWith('/CustomSnackBarContext'))
        return { CustomSnackBarContext: React.createContext({}) };
      if (id === '../slices/file' || id === '../slices/user') return {};
      return require(id);
    }
  });
  let value;
  function Child() {
    value = React.useContext(exports.CompanySettingsContext);
    return null;
  }
  ReactDOMServer.renderToString(
    React.createElement(
      exports.CompanySettingsProvider,
      null,
      React.createElement(Child)
    )
  );
  return value;
}
test('company without currency renders amounts without inventing a unit', () => {
  const c = settings({
    generalPreferences: { currency: null, timeZone: 'Etc/UTC' },
    workOrderConfiguration: {}
  });
  assert.equal(c.getFormattedCurrency(0), '0');
  assert.equal(c.getFormattedCurrency(25), '25');
  assert.equal(c.getFormattedCurrency(null), '');
});
test('configured symbols and ISO currencies use safe localized formatting', () => {
  assert.equal(
    settings({
      generalPreferences: { currency: { code: '$' } }
    }).getFormattedCurrency(5),
    '$ 5'
  );
  assert.match(
    settings({
      generalPreferences: { currency: { code: 'EUR' } }
    }).getFormattedCurrency(5),
    /€5\.00/
  );
});
test('UEMOA companies render XOF amounts as FCFA', () => {
  assert.equal(
    settings({
      generalPreferences: { currency: { code: 'XOF' } }
    }).getFormattedCurrency(1250000),
    '1,250,000 FCFA'
  );
});
test('missing preferences permit currency and UTC date rendering', () => {
  const c = settings(null);
  assert.equal(c.getFormattedCurrency(12), '12');
  assert.equal(c.getFormattedDate('2026-10-03T12:30:00Z', true), '03/10/26');
  assert.equal(c.getFormattedDate(null), '');
});
