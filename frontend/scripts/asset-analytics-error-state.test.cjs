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

const source = readFileSync(
  path.join(__dirname, '../src/content/own/Assets/Show/AssetAnalytics.tsx'),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

function harness(request) {
  const dom = new JSDOM('<div id="root"></div>', {
    url: 'http://pilot.local'
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;

  let state = {
    assetAnalytics: {
      assetDetailsOverview: {
        mtbf: 0,
        mttr: 0,
        downtime: 0,
        uptime: 0,
        totalCost: 0
      },
      loading: { assetDetailsOverview: false },
      errors: {}
    }
  };
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener());
  const dispatch = (action) => {
    if (typeof action === 'function') return action(dispatch);
    const analytics = state.assetAnalytics;
    if (action.type === 'loading') {
      state = {
        assetAnalytics: {
          ...analytics,
          loading: { assetDetailsOverview: true },
          errors: {}
        }
      };
    } else if (action.type === 'success') {
      state = {
        assetAnalytics: {
          ...analytics,
          assetDetailsOverview: action.stats,
          loading: { assetDetailsOverview: false }
        }
      };
    } else if (action.type === 'failure') {
      state = {
        assetAnalytics: {
          ...analytics,
          loading: { assetDetailsOverview: false },
          errors: { assetDetailsOverview: action.message }
        }
      };
    }
    notify();
    return undefined;
  };
  const companySettingsContext = React.createContext({
    getFormattedCurrency: (value) => `$${value}`
  });
  const element =
    (tag) =>
    ({ children }) =>
      React.createElement(tag, null, children);
  const exports = {};

  vm.runInNewContext(compiled, {
    exports,
    React,
    require(id) {
      if (id === 'react') return React;
      if (id === '@mui/material') {
        return {
          Box: element('div'),
          Card: element('section'),
          CardContent: element('div'),
          Divider: () => React.createElement('hr'),
          Stack: element('div'),
          Typography: element('div')
        };
      }
      if (id === 'react-i18next')
        return { useTranslation: () => ({ t: (key) => key }) };
      if (id.endsWith('/store')) {
        return {
          useDispatch: () => dispatch,
          useSelector: (selector) => {
            const [selected, setSelected] = React.useState(() =>
              selector(state)
            );
            React.useEffect(() => {
              const listener = () => setSelected(selector(state));
              listeners.add(listener);
              return () => listeners.delete(listener);
            }, []);
            return selected;
          }
        };
      }
      if (id.endsWith('/CompanySettingsContext')) {
        return { CompanySettingsContext: companySettingsContext };
      }
      if (id.endsWith('/analytics/asset')) {
        return {
          getAssetDetailsOverview: (id, start, end) => async (send) => {
            send({ type: 'loading' });
            try {
              const stats = await request(id, start, end);
              send({ type: 'success', stats });
            } catch (error) {
              send({ type: 'failure', message: error.message });
            }
          }
        };
      }
      if (id.endsWith('/Analytics/Loading')) {
        return { default: () => React.createElement('span', null, 'loading') };
      }
      if (id.endsWith('/form/DateRangePicker')) {
        return {
          default: ({ onChange }) =>
            React.createElement(
              'button',
              {
                onClick: () =>
                  onChange([new Date(2026, 0, 1), new Date(2026, 0, 31)])
              },
              'change range'
            )
        };
      }
      if (id.endsWith('/components/ContentState')) {
        return {
          default: ({ message, actionLabel, onAction }) =>
            React.createElement(
              'div',
              null,
              message,
              React.createElement('button', { onClick: onAction }, actionLabel)
            )
        };
      }
      return require(id);
    }
  });

  const container = document.getElementById('root');
  return {
    container,
    async render() {
      await act(async () => {
        ReactDOM.render(
          React.createElement(exports.default, { id: 42 }),
          container
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    },
    async click(label) {
      const button = [...container.querySelectorAll('button')].find(
        (item) => item.textContent === label
      );
      assert.ok(button, `button not found: ${label}`);
      await act(async () => {
        button.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
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

test('does not show initial zero metrics after a failed request and retries successfully', async () => {
  let calls = 0;
  const view = harness(async () => {
    if (++calls === 1) throw new Error('Could not load reliability data');
    return {
      mtbf: 120,
      mttr: 4,
      downtime: 3600,
      uptime: 72000,
      totalCost: 1250
    };
  });

  try {
    await view.render();
    assert.match(view.container.textContent, /Could not load reliability data/);
    assert.doesNotMatch(view.container.textContent, /0\.00/);

    await view.click('retry');
    assert.equal(calls, 2);
    assert.match(view.container.textContent, /120/);
    assert.match(view.container.textContent, /1250/);
    assert.doesNotMatch(
      view.container.textContent,
      /Could not load reliability data/
    );
  } finally {
    view.close();
  }
});
