const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(windowMock) {
  const exports = {};
  const source = ts.transpileModule(
    fs.readFileSync('src/utils/asyncWindow.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText;
  vm.runInNewContext(source, { exports, window: windowMock, URL });
  return exports;
}

test('pending window is opened synchronously and detached from the opener', () => {
  const pendingWindow = {
    opener: {},
    closed: false,
    document: { title: '', body: { textContent: '' } },
    close() {
      this.closed = true;
    },
    location: { replace() {} }
  };
  const { openPendingWindow } = load({
    open: (url, target) => {
      assert.equal(url, '');
      assert.equal(target, '_blank');
      return pendingWindow;
    }
  });

  assert.equal(openPendingWindow('blocked', 'loading'), pendingWindow);
  assert.equal(pendingWindow.opener, null);
  assert.equal(pendingWindow.document.title, 'QPM');
  assert.equal(pendingWindow.document.body.textContent, 'loading');
});

test('popup blocking produces an actionable error before an async request', () => {
  const { openPendingWindow } = load({ open: () => null });
  assert.throws(
    () => openPendingWindow('allow pop-ups', 'loading'),
    /allow pop-ups/
  );
});

test('only HTTP(S) URLs without embedded credentials are accepted', () => {
  const navigations = [];
  const pendingWindow = {
    location: { replace: (url) => navigations.push(url) }
  };
  const { navigatePendingWindow } = load({
    location: { origin: 'https://qpm.example' }
  });

  navigatePendingWindow(
    pendingWindow,
    '/storage/report.csv?sig=abc',
    'invalid'
  );
  assert.equal(
    navigations[0],
    'https://qpm.example/storage/report.csv?sig=abc'
  );
  assert.throws(
    () =>
      navigatePendingWindow(pendingWindow, 'javascript:alert(1)', 'invalid'),
    /invalid/
  );
  assert.throws(
    () =>
      navigatePendingWindow(
        pendingWindow,
        'https://user:pass@example.org/file',
        'invalid'
      ),
    /invalid/
  );
  assert.equal(navigations.length, 1);
});

test('failed pending windows are closed safely', () => {
  const pendingWindow = {
    closed: false,
    close() {
      this.closed = true;
    }
  };
  const { closePendingWindow } = load({});
  closePendingWindow(pendingWindow);
  assert.equal(pendingWindow.closed, true);
  closePendingWindow(null);
});
