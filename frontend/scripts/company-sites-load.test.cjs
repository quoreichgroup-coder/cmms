const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');
const ts = require('typescript');
const React = require('react');
const ReactDOM = require('react-dom');
const { act } = require('react-dom/test-utils');

const source = fs.readFileSync(
  path.join(__dirname, '../src/content/own/CompanyProfile/CompanySites.tsx'),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

function harness() {
  const dom = new JSDOM('<div id="root"></div>', {
    url: 'http://pilot.local'
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  let siteAttempts = 0;
  const exports = {};
  const translate = (key) => key;
  const element = (tag) =>
    function Element({ children, action, onClick, onSubmit }) {
      return React.createElement(tag, { onClick, onSubmit }, children, action);
    };

  vm.runInNewContext(compiled, {
    exports,
    React,
    require(id) {
      if (id === 'react') return React;
      if (id === 'react/jsx-runtime') return require('react/jsx-runtime');
      if (id.startsWith('@mui/icons-material/')) return { default: () => null };
      if (id === '@mui/material')
        return {
          Alert: element('div'),
          Box: element('div'),
          Button: element('button'),
          Card: element('section'),
          CardContent: element('div'),
          CircularProgress: () => React.createElement('span', null, 'loading'),
          Dialog: ({ open, children }) =>
            open ? React.createElement('div', null, children) : null,
          DialogActions: element('div'),
          DialogContent: element('div'),
          DialogTitle: element('h2'),
          FormControl: element('div'),
          Grid: element('div'),
          IconButton: element('button'),
          InputLabel: element('label'),
          MenuItem: element('option'),
          Select: element('select'),
          Stack: element('div'),
          TextField: element('input'),
          Typography: element('div')
        };
      if (id === 'react-i18next')
        return { useTranslation: () => ({ t: translate }) };
      if (id.endsWith('/api'))
        return {
          default: {
            get: async (endpoint) => {
              if (endpoint === 'sites' && ++siteAttempts === 1) {
                throw new Error('temporary network failure');
              }
              return [];
            }
          },
          getErrorMessage: (error, fallback) => error?.message || fallback
        };
      if (id.endsWith('/useAuth'))
        return {
          default: () => ({ user: { ownsCompany: true, role: {} } })
        };
      if (id.endsWith('/role'))
        return { PermissionEntity: { SETTINGS: 'SETTINGS' } };
      return require(id);
    }
  });

  const container = document.getElementById('root');
  return {
    container,
    async render() {
      await act(async () => {
        ReactDOM.render(React.createElement(exports.default), container);
        await new Promise((resolve) => setImmediate(resolve));
      });
    },
    async click(label) {
      const button = [...container.querySelectorAll('button')].find(
        (candidate) => candidate.textContent === label
      );
      assert.ok(button, `Expected button: ${label}`);
      await act(async () => {
        button.click();
        await new Promise((resolve) => setImmediate(resolve));
      });
    },
    close() {
      act(() => {
        ReactDOM.unmountComponentAtNode(container);
      });
      dom.window.close();
    }
  };
}

test('company sites distinguishes a failed load from empty and can retry', async () => {
  const app = harness();
  try {
    await app.render();
    assert.ok(app.container.textContent.includes('temporary network failure'));
    assert.ok(!app.container.textContent.includes('company_sites_empty'));
    await app.click('retry');
    assert.ok(app.container.textContent.includes('company_sites_empty'));
    assert.ok(!app.container.textContent.includes('temporary network failure'));
  } finally {
    app.close();
  }
});
