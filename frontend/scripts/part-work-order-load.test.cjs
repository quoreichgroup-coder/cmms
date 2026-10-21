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
  path.join(__dirname, '../src/content/own/Inventory/PartDetails.tsx'),
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

  const state = {
    assets: { assetsByPart: {} },
    workOrders: { workOrdersByPart: {} }
  };
  let calls = 0;
  const dispatch = (thunk) =>
    typeof thunk === 'function' ? thunk(dispatch) : thunk;
  const exports = {};
  const element = (tag) => (props) =>
    React.createElement(tag, null, props.children);

  vm.runInNewContext(compiled, {
    exports,
    React,
    require(id) {
      if (id === 'react') return React;
      if (id === 'react/jsx-runtime') return require('react/jsx-runtime');
      if (id.startsWith('@mui/icons-material/')) return { default: () => null };
      if (id === '@mui/material') {
        const Tabs = ({ children, onChange }) =>
          React.createElement(
            'div',
            null,
            React.Children.map(children, (child) =>
              React.cloneElement(child, {
                onClick: (event) => onChange(event, child.props.value)
              })
            )
          );
        return {
          Box: element('div'),
          CircularProgress: () => React.createElement('span', null, 'loading'),
          Divider: element('hr'),
          Grid: element('div'),
          IconButton: element('button'),
          Link: element('a'),
          List: element('div'),
          ListItem: element('div'),
          ListItemButton: element('button'),
          ListItemText: ({ primary, secondary }) =>
            React.createElement('div', null, primary, secondary),
          Stack: element('div'),
          Tab: ({ label, onClick }) =>
            React.createElement('button', { onClick }, label),
          Tabs,
          Typography: element('div')
        };
      }
      if (id === 'react-i18next')
        return { useTranslation: () => ({ t: (key) => key }) };
      if (id === 'react-router-dom') return { useNavigate: () => () => {} };
      if (id.endsWith('/CompanySettingsContext'))
        return {
          CompanySettingsContext: React.createContext({
            getFormattedDate: (value) => value,
            getFormattedCurrency: (value) => value
          })
        };
      if (id.endsWith('/useAuth'))
        return {
          default: () => ({
            hasEditPermission: () => true,
            hasDeletePermission: () => true,
            hasCreatePermission: () => true
          })
        };
      if (id.endsWith('/store'))
        return {
          useDispatch: () => dispatch,
          useSelector: (selector) => selector(state)
        };
      if (id.endsWith('/role'))
        return { PermissionEntity: { PARTS_AND_MULTIPARTS: 'PARTS' } };
      if (id.endsWith('/asset'))
        return {
          getAssetsByPart: () => async () => undefined
        };
      if (id.endsWith('/slices/part'))
        return { editPart: () => async () => {} };
      if (id.endsWith('/workOrder'))
        return {
          getWorkOrdersByPart: (partId) => async () => {
            if (++calls === 1) throw new Error('network failure');
            state.workOrders.workOrdersByPart[partId] = [
              {
                id: 9,
                title: 'Repair pump',
                status: 'OPEN',
                createdAt: 'today'
              }
            ];
          }
        };
      if (id.endsWith('/urlPaths'))
        return {
          getAssetUrl: () => '#',
          getCustomerUrl: () => '#',
          getTeamUrl: () => '#',
          getUserUrl: () => '#',
          getVendorUrl: () => '#',
          getWorkOrderUrl: () => '#'
        };
      if (id === './Parts' || id.endsWith('/Inventory/Parts'))
        return { getFormattedQuantityWithUnit: (value) => value };
      if (id.endsWith('/formatters'))
        return { getFormattedCostPerUnit: (value) => value };
      if (id.endsWith('/type'))
        return { getCustomFieldValuesForDetails: () => [] };
      if (id.endsWith('/ContentState'))
        return {
          default: ({ message, actionLabel, onAction }) =>
            React.createElement(
              'div',
              null,
              message,
              React.createElement('button', { onClick: onAction }, actionLabel)
            )
        };
      if (id.endsWith('/FilesList')) return { default: () => null };
      if (id.endsWith('/BasicField'))
        return {
          default: ({ label }) => React.createElement('div', null, label)
        };
      if (id.endsWith('/RestockPartModal')) return { default: () => null };
      if (id.endsWith('/WorkOrderStatusChip'))
        return {
          default: ({ status }) => React.createElement('span', null, status)
        };
      if (id === 'react-simple-image-viewer') return { default: () => null };
      return require(id);
    }
  });

  const container = document.getElementById('root');
  return {
    container,
    async render() {
      const part = {
        id: 1,
        name: 'Pump seal',
        description: '',
        assignedTo: [],
        customers: [],
        vendors: [],
        teams: [],
        files: [],
        customFieldValues: [],
        image: null
      };
      await act(async () => {
        ReactDOM.render(
          React.createElement(exports.default, {
            part,
            handleOpenUpdate: () => {},
            handleOpenDelete: () => {},
            onCopy: () => {}
          }),
          container
        );
      });
    },
    async click(label) {
      const button = [...container.querySelectorAll('button')].find(
        (candidate) => candidate.textContent === label
      );
      assert.ok(
        button,
        `Expected button: ${label}; rendered: ${container.textContent}`
      );
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

test('part work-order tab shows an error and retries successfully', async () => {
  const app = harness();
  try {
    await app.render();
    await app.click('work_orders');
    assert.ok(
      app.container.textContent.includes('part_work_orders_load_error')
    );
    await app.click('retry');
    assert.ok(app.container.textContent.includes('Repair pump'));
    assert.ok(
      !app.container.textContent.includes('part_work_orders_load_error')
    );
  } finally {
    app.close();
  }
});
