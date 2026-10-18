const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/sidebarState.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;

const loadSidebarState = (storage) => {
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    window: storage ? { localStorage: storage } : undefined
  });
  return exports;
};

test('desktop sidebar collapse preference is restored from local storage', () => {
  const { readDesktopSidebarCollapsed } = loadSidebarState({
    getItem: (key) => (key === 'qpm-web-sidebar-collapsed' ? 'true' : null)
  });

  assert.equal(readDesktopSidebarCollapsed(), true);
});

test('sidebar preference defaults to expanded when missing or storage is blocked', () => {
  assert.equal(loadSidebarState().readDesktopSidebarCollapsed(), false);
  assert.equal(
    loadSidebarState({
      getItem: () => {
        throw new Error('storage blocked');
      }
    }).readDesktopSidebarCollapsed(),
    false
  );
});

test('desktop sidebar preference writes only the optional local UI setting', () => {
  let stored;
  const { writeDesktopSidebarCollapsed } = loadSidebarState({
    setItem: (key, value) => {
      stored = [key, value];
    }
  });

  writeDesktopSidebarCollapsed(true);
  assert.deepEqual(stored, ['qpm-web-sidebar-collapsed', 'true']);
});
