const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const ReactDOM = require('react-dom');
const { act, Simulate } = require('react-dom/test-utils');
const { JSDOM } = require('jsdom');
const redux = require('@reduxjs/toolkit');
const reactRedux = require('react-redux');
function compile(file) {
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
}
async function harness({ owner = true, available = true, activate } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  const current = { hasLicense: false, valid: false, entitlements: [] };
  const calls = [];
  const api = {
    get: async (url) => url.endsWith('activation-config') ? { available } : current,
    post: async (url, data) => { calls.push({ url, data }); return activate(data); }
  };
  const sliceExports = {};
  vm.runInNewContext(compile('src/slices/license.ts'), {
    exports: sliceExports,
    require(id) {
      if (id.endsWith('/api')) return { __esModule: true, default: api };
      if (id.endsWith('/redux')) return {};
      return require(id);
    }
  });
  const store = redux.configureStore({ reducer: { license: sliceExports.reducer } });
  const exports = {};
  const wrap = tag => ({ children, component, onSubmit, severity }) =>
    React.createElement(component === 'form' ? 'form' : tag, { onSubmit, 'data-severity': severity }, children);
  vm.runInNewContext(compile('src/content/own/CompanyProfile/CompanyLicense.tsx'), {
    exports,
    require(id) {
      if (id === '@mui/material') return {
        Alert: wrap('div'), Box: wrap('div'), Card: wrap('section'), CardContent: wrap('div'),
        Stack: wrap('div'), Typography: wrap('p'), CircularProgress: () => React.createElement('span', null, 'loading'),
        TextField: ({ label, value, onChange, disabled, type }) => React.createElement('input', { 'aria-label': label, value, onChange, disabled, type }),
        Button: ({ children, disabled, type, startIcon }) => React.createElement('button', { disabled, type }, startIcon, children)
      };
      if (id.endsWith('/useAuth')) return { __esModule: true, default: () => ({ user: { ownsCompany: owner, role: { roleType: 'ROLE_CLIENT' } } }) };
      if (id.endsWith('/store')) return { useSelector: reactRedux.useSelector, useDispatch: reactRedux.useDispatch };
      if (id.endsWith('/slices/license')) return sliceExports;
      if (id.endsWith('/utils/api')) return { __esModule: true, default: api, getErrorMessage: err => err.message };
      return require(id);
    }
  });
  const container = document.getElementById('root');
  await act(async () => {
    ReactDOM.render(React.createElement(reactRedux.Provider, { store }, React.createElement(exports.default)), container);
    await new Promise(resolve => setImmediate(resolve));
  });
  return {
    container, calls, store,
    async submit(key) {
      const input = container.querySelector('input');
      await act(async () => {
        Simulate.change(input, { target: { value: key } });
      });
      await act(async () => {
        container.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
        await new Promise(resolve => setImmediate(resolve));
      });
    },
    close() { act(() => { ReactDOM.unmountComponentAtNode(container); }); dom.window.close(); }
  };
}
test('owner activates a trimmed key, updates Redux and clears the input', async () => {
  const h = await harness({ activate: async () => ({ hasLicense: true, valid: true, entitlements: ['SSO'], seatsFull: 10, seatsLight: 10, planName: 'ENTERPRISE' }) });
  try {
    await h.submit('  test-key  ');
    assert.deepEqual(JSON.parse(JSON.stringify(h.calls)), [{ url: 'license/activate', data: { licenseKey: 'test-key' } }]);
    assert.equal(h.store.getState().license.state.valid, true);
    assert.equal(h.container.querySelector('input').value, '');
    assert.match(h.container.textContent, /Licence activée/);
    assert.equal(window.localStorage.length, 0);
  } finally { h.close(); }
});
test('a rejected activation displays an error and permits retry', async () => {
  const h = await harness({ activate: async () => { throw new Error('conflict_error'); } });
  try {
    await h.submit('occupied-key');
    assert.match(h.container.textContent, /déjà utilisée/);
    assert.equal(h.container.querySelector('button').disabled, false);
    assert.equal(h.store.getState().license.state.valid, false);
  } finally { h.close(); }
});
test('ordinary users cannot submit activation', async () => {
  const h = await harness({ owner: false });
  try { assert.equal(h.container.querySelector('form'), null); assert.equal(h.calls.length, 0); }
  finally { h.close(); }
});
test('unconfigured installation disables activation with an explanatory message', async () => {
  const h = await harness({ available: false });
  try { assert.equal(h.container.querySelector('form'), null); assert.match(h.container.textContent, /Contactez l’administrateur/); }
  finally { h.close(); }
});
test('activation disables duplicate submissions until the server responds', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const h = await harness({ activate: () => pending });
  try {
    await h.submit('pending-key');
    assert.equal(h.container.querySelector('button').disabled, true);
    assert.equal(h.container.querySelector('input').disabled, true);
    await h.submit('another-key');
    assert.equal(h.calls.length, 1);
    await act(async () => {
      resolve({ hasLicense: true, valid: true, entitlements: [] });
      await new Promise(done => setImmediate(done));
    });
    assert.equal(h.container.querySelector('input').disabled, false);
    assert.match(h.container.textContent, /Licence activée/);
  } finally { h.close(); }
});
