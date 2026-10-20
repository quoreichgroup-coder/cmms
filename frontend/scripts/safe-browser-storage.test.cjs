const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/safeBrowserStorage.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports });
const { readBrowserPreference, writeBrowserPreference } = moduleExports;

test('browser preference reads return null when storage is blocked', () => {
  assert.equal(readBrowserPreference('table', null), null);
  assert.equal(
    readBrowserPreference('table', {
      getItem: () => {
        throw new Error('blocked');
      }
    }),
    null
  );
  assert.equal(
    readBrowserPreference('table', { getItem: () => 'saved' }),
    'saved'
  );
});

test('browser preference writes fail safely without disrupting callers', () => {
  assert.equal(writeBrowserPreference('table', 'value', null), false);
  assert.equal(
    writeBrowserPreference('table', 'value', {
      setItem: () => {
        throw new Error('blocked');
      }
    }),
    false
  );

  let persisted;
  assert.equal(
    writeBrowserPreference('table', 'value', {
      setItem: (_key, value) => {
        persisted = value;
      }
    }),
    true
  );
  assert.equal(persisted, 'value');
});

test('browser storage getters that throw are treated as unavailable', () => {
  const blockedWindow = {};
  Object.defineProperty(blockedWindow, 'localStorage', {
    get: () => {
      throw new Error('blocked');
    }
  });
  const blockedExports = {};
  vm.runInNewContext(source, {
    exports: blockedExports,
    window: blockedWindow
  });

  assert.equal(blockedExports.readBrowserPreference('theme'), null);
  assert.equal(blockedExports.writeBrowserPreference('theme', 'dark'), false);
});

test('theme and table state consumers use the safe preference boundary', () => {
  const consumers = [
    'src/App.tsx',
    'src/components/ThemeSettings/index.tsx',
    'src/hooks/useMobileAppPrompt.ts',
    'src/hooks/useTableState.ts',
    'src/hooks/useTableStatePersist.ts',
    'src/utils/filter.ts'
  ];
  for (const file of consumers) {
    const content = fs.readFileSync(file, 'utf8');
    assert.match(content, /safeBrowserStorage/);
    assert.doesNotMatch(content, /\blocalStorage\.(getItem|setItem)\(/);
  }
});

test('table preferences are not copied to browser console output', () => {
  const hook = fs.readFileSync('src/hooks/useTableStatePersist.ts', 'utf8');
  assert.doesNotMatch(hook, /console\.(?:log|info|debug)\s*\(/);
});
