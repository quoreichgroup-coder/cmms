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
  path.join(
    __dirname,
    '../src/content/own/Requests/RequestCancellationModal.tsx'
  ),
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
  const dom = new JSDOM('<div id="root"></div>');
  global.window = dom.window;
  global.document = dom.window.document;
  let dispatchCalls = 0;
  let canceled = false;
  const messages = [];
  const snackContext = React.createContext({
    showSnackBar: (message, severity) => messages.push({ message, severity })
  });
  const moduleExports = {};
  const passthrough = ({ children }) =>
    React.createElement('div', null, children);
  vm.runInNewContext(compiled, {
    exports: moduleExports,
    React,
    require(id) {
      if (id === 'react') return React;
      if (id === 'react/jsx-runtime') return require('react/jsx-runtime');
      if (id === '@mui/material')
        return {
          Dialog: passthrough,
          DialogContent: passthrough,
          DialogTitle: passthrough,
          Typography: passthrough
        };
      if (id === 'react-i18next')
        return { useTranslation: () => ({ t: (key) => key }) };
      if (id === 'src/slices/request')
        return {
          cancelRequest: (requestId, feedback) => ({ requestId, feedback })
        };
      if (id === 'src/store')
        return {
          useDispatch: () => async () => {
            dispatchCalls += 1;
            if (dispatchCalls === 1)
              throw new Error('temporary server failure');
          }
        };
      if (id === 'src/contexts/CustomSnackBarContext')
        return { CustomSnackBarContext: snackContext };
      if (id === 'src/utils/api')
        return {
          getErrorMessage: (error, fallback) => error?.message || fallback
        };
      if (id === 'yup') return require('yup');
      if (id === '../components/form')
        return {
          default: (props) =>
            React.createElement(
              'button',
              { onClick: () => props.onSubmit({ feedback: 'reason' }) },
              'submit'
            )
        };
      return require(id);
    }
  });
  const container = document.getElementById('root');
  const render = async () => {
    await act(async () => {
      ReactDOM.render(
        React.createElement(
          snackContext.Provider,
          {
            value: {
              showSnackBar: (message, severity) =>
                messages.push({ message, severity })
            }
          },
          React.createElement(moduleExports.default, {
            open: true,
            requestId: 17,
            onClose: () => {},
            onCancel: () => {
              canceled = true;
            }
          })
        ),
        container
      );
    });
  };
  const submit = async () => {
    await act(async () => {
      container.querySelector('button').click();
      await new Promise((resolve) => setImmediate(resolve));
    });
  };
  return {
    render,
    submit,
    messages,
    get canceled() {
      return canceled;
    },
    close() {
      act(() => ReactDOM.unmountComponentAtNode(container));
      dom.window.close();
    }
  };
}

test('request cancellation reports failure and allows a successful retry', async () => {
  const app = harness();
  try {
    await app.render();
    await app.submit();
    assert.deepEqual(app.messages, [
      { message: 'temporary server failure', severity: 'error' }
    ]);
    assert.equal(app.canceled, false);

    await app.submit();
    assert.equal(app.canceled, true);
    assert.equal(app.messages.length, 1);
  } finally {
    app.close();
  }
});
