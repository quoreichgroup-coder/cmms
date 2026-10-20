const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/theme/themePreference.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports });
const { DEFAULT_THEME_NAME, persistThemePreference, readThemePreference } =
  moduleExports;
const availableThemes = ['PureLightTheme', 'GreyGooseTheme', 'PurpleFlowTheme'];

test('theme preferences accept only available themes and fall back safely', () => {
  assert.equal(
    readThemePreference({ getItem: () => 'GreyGooseTheme' }, availableThemes),
    'GreyGooseTheme'
  );
  assert.equal(
    readThemePreference({ getItem: () => 'UnknownTheme' }, availableThemes),
    DEFAULT_THEME_NAME
  );
  assert.equal(
    readThemePreference(
      {
        getItem: () => {
          throw new Error('blocked');
        }
      },
      availableThemes
    ),
    DEFAULT_THEME_NAME
  );

  let persisted;
  persistThemePreference(
    {
      setItem: (_key, value) => {
        persisted = value;
      }
    },
    'PurpleFlowTheme',
    availableThemes
  );
  assert.equal(persisted, 'PurpleFlowTheme');
  persistThemePreference(
    {
      setItem: () => {
        throw new Error('blocked');
      }
    },
    'GreyGooseTheme',
    availableThemes
  );
  persistThemePreference(
    {
      setItem: (_key, value) => {
        persisted = value;
      }
    },
    'UnknownTheme',
    availableThemes
  );
  assert.equal(persisted, 'PurpleFlowTheme');
});
