const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');
const ts = require('typescript');
const React = require('react');
const ReactDOM = require('react-dom');
const { act } = require('react-dom/test-utils');

const source = readFileSync(path.join(__dirname, '../src/content/own/Assets/Show/AssetMaintenanceSummary.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }
}).outputText;

function harness(post, permissions = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://pilot.local' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  const auth = {
    hasViewPermission: () => true,
    hasCreatePermission: () => true,
    hasFeature: () => true,
    user: { ownsCompany: true },
    ...permissions
  };
  const exports = {};
  const wrap = (tag) => ({ children, action, onClick, to }) =>
    React.createElement(tag, { onClick, ...(to ? { href: to } : {}) }, children, action);
  vm.runInNewContext(compiled, {
    exports, AbortController, Date,
    require(id) {
      if (id === '@mui/material') return {
        Alert: wrap('div'), Box: wrap('div'), Button: wrap('button'), Card: wrap('section'),
        CircularProgress: () => React.createElement('span', null, 'loading'),
        Stack: wrap('div'), Typography: wrap('div')
      };
      if (id === 'react-i18next') return { useTranslation: () => ({ t: key => key, i18n: { language: 'en' } }) };
      if (id === 'react-router-dom') return { Link: wrap('a'), useNavigate: () => () => {} };
      if (id.endsWith('/CompanySettingsContext')) return {
        CompanySettingsContext: React.createContext({ getFormattedDate: value => value })
      };
      if (id.endsWith('/useAuth')) return { default: () => auth };
      if (id.endsWith('/role')) return { PermissionEntity: { PREVENTIVE_MAINTENANCES: 'PM' } };
      if (id.endsWith('/subscriptionPlan')) return { PlanFeature: { PREVENTIVE_MAINTENANCE: 'PM' } };
      if (id.endsWith('/api')) return { default: { post } };
      if (id.endsWith('/urlPaths')) return { getPreventiveMaintenanceUrl: id => '/plans/' + id };
      if (id.endsWith('/config')) return { isCloudVersion: false };
      return require(id);
    }
  });
  const container = document.getElementById('root');
  return {
    container,
    async render(assetId = 1) {
      await act(async () => {
        ReactDOM.render(React.createElement(exports.default, { assetId }), container);
        await new Promise(resolve => setImmediate(resolve));
      });
    },
    async click(text) {
      const button = [...container.querySelectorAll('button')].find(el => el.textContent === text);
      assert.ok(button, 'button: ' + text);
      await act(async () => { button.click(); await new Promise(resolve => setImmediate(resolve)); });
    },
    close() { act(() => { ReactDOM.unmountComponentAtNode(container); }); dom.window.close(); }
  };
}
const plan = (id, date, disabled = false) => ({ id, name: 'Plan ' + id, schedule: { disabled }, nextWorkOrderDate: date });

test('chooses the earliest four active dates across all pages using a persistent sort field', async () => {
  const calls = [];
  const h = harness(async (url, criteria) => {
    assert.equal(url, 'preventive-maintenances/search');
    assert.equal(criteria.sortField, 'id');
    assert.equal(criteria.filterFields[0].value, 42);
    assert.equal(criteria.filterFields[1].field, 'schedule.disabled');
    assert.equal(criteria.filterFields[1].value, false);
    calls.push(criteria.pageNum);
    return criteria.pageNum === 0
      ? { content: [plan(1, '2030-06-01'), plan(2, '2030-05-01'), plan(3, '2030-04-01')], last: false }
      : { content: [plan(4, '2030-01-01'), plan(5, '2030-02-01'), plan(6, '2029-01-01', true), plan(7, null)], last: true };
  });
  try {
    await h.render(42);
    assert.deepEqual(calls, [0, 1]);
    const links = [...h.container.querySelectorAll('button[href^="/plans/"]')];
    assert.deepEqual(links.map(el => el.textContent), ['Plan 4', 'Plan 5', 'Plan 3', 'Plan 2']);
    assert.ok(!h.container.textContent.includes('Plan 6'));
    assert.ok(!h.container.textContent.includes('Plan 7'));
  } finally { h.close(); }
});

test('offers retry after a network failure and replaces the error with loaded plans', async () => {
  let calls = 0;
  const h = harness(async () => {
    if (++calls === 1) throw new Error('network');
    return { content: [plan(8, '2030-01-01')], last: true };
  });
  try {
    await h.render();
    assert.ok(h.container.textContent.includes('an_error_occured'));
    await h.click('asset_retry');
    assert.ok(h.container.textContent.includes('Plan 8'));
    assert.ok(!h.container.textContent.includes('an_error_occured'));
  } finally { h.close(); }
});

test('does not fetch without the feature and only offers upgrade to the owner', async () => {
  let calls = 0;
  for (const ownsCompany of [true, false]) {
    const h = harness(async () => { calls++; }, { hasFeature: () => false, user: { ownsCompany } });
    try {
      await h.render();
      assert.ok(h.container.textContent.includes('upgrade_preventive_maintenance'));
      assert.equal(h.container.textContent.includes('upgrade_now'), ownsCompany);
      assert.ok(!h.container.textContent.includes('schedule_wo'));
    } finally { h.close(); }
  }
  assert.equal(calls, 0);
});

test('does not fetch or expose the summary without view permission', async () => {
  let calls = 0;
  const h = harness(async () => { calls++; }, { hasViewPermission: () => false });
  try { await h.render(); assert.equal(calls, 0); assert.equal(h.container.textContent, ''); }
  finally { h.close(); }
});

test('ignores a late response and stops pagination when the selected asset changes', async () => {
  let resolveOld;
  let oldSignal;
  const calls = [];
  const h = harness(async (url, criteria, options) => {
    calls.push(criteria.filterFields[0].value);
    if (criteria.filterFields[0].value === 1) {
      oldSignal = options.signal;
      return new Promise(resolve => { resolveOld = resolve; });
    }
    return { content: [plan(22, '2030-01-01')], last: true };
  });
  try {
    await h.render(1);
    await h.render(2);
    assert.equal(oldSignal.aborted, true);
    await act(async () => { resolveOld({ content: [plan(11, '2029-01-01')], last: false }); });
    assert.deepEqual(calls, [1, 2]);
    assert.ok(h.container.textContent.includes('Plan 22'));
    assert.ok(!h.container.textContent.includes('Plan 11'));
  } finally { h.close(); }
});
