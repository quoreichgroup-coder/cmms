const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { HelmetProvider } = require('react-helmet-async');
const compiled = ts.transpileModule(fs.readFileSync('src/content/own/CompanyProfile/index.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
}).outputText;
for (const name of [null, 'Entreprise exemple']) {
  test('company page renders a single Helmet title for name ' + name, () => {
    const exports = {};
    vm.runInNewContext(compiled, { exports, require(id) {
      if (id === '@mui/material') return { Box: ({ children }) => React.createElement('div', null, children), Grid: ({ children }) => React.createElement('div', null, children) };
      if (id.startsWith('./Company')) return { __esModule: true, default: () => null };
      if (id.endsWith('/TitleContext')) return { TitleContext: React.createContext({ setTitle() {} }) };
      if (id === 'react-i18next') return { useTranslation: () => ({ t: key => key }) };
      if (id.endsWith('/useAuth')) return { __esModule: true, default: () => ({ company: { name }, user: { ownsCompany: true } }) };
      if (id.endsWith('/config')) return {};
      return require(id);
    }});
    const context = {};
    ReactDOMServer.renderToString(React.createElement(HelmetProvider, { context }, React.createElement(exports.default)));
    assert.match(context.helmet.title.toString(), new RegExp((name || 'QPM') + ' - Company Details'));
  });
}
