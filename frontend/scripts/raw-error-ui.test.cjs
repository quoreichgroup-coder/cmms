const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const cases = [
  {
    path: 'src/contexts/CompanySettingsContext.tsx',
    safeCall: /getApiErrorMessage\(err\)/,
    unsafeCall: /JSON\.parse\(err\.message\)/
  },
  {
    path: 'src/content/own/PeopleAndTeams/components/InviteUserDialog.tsx',
    safeCall: /getApiErrorMessage\(err\)/,
    unsafeCall: /JSON\.parse\(err\.message\)/
  },
  {
    path: 'src/content/pages/Auth/Register/RegisterJWT.tsx',
    safeCall: /getApiErrorMessage\(err,/,
    unsafeCall: /errorMessage\s*=\s*err\.message/
  },
  {
    path: 'src/content/own/Imports/index.tsx',
    safeCall: /getApiErrorMessage\(\s*error\s*,/,
    unsafeCall: /error\.message/ // Import data still goes through the safe helper.
  },
  {
    path: 'src/content/own/Settings/Features/RequestPortal/PublicPage/RequestPortalPublicPage.tsx',
    safeCall: /getApiErrorMessage\(error,/,
    unsafeCall: /enqueueSnackbar\(error\.message/
  }
];

test('server-facing UI error handlers use the API error sanitizer', () => {
  for (const entry of cases) {
    const source = fs.readFileSync(entry.path, 'utf8');
    // Ignore explanatory comments so they cannot be mistaken for a UI sink.
    const executableSource = source.replace(/\/\/.*$/gm, '');
    assert.match(
      executableSource,
      entry.safeCall,
      `${entry.path} should use safe API errors`
    );
    if (entry.path.endsWith('/Imports/index.tsx')) {
      assert.match(
        executableSource,
        /getApiErrorMessage\(\s*error\s*,[\s\S]{0,80}t\('an_error_occured'\)/
      );
    }
    assert.doesNotMatch(
      executableSource,
      entry.unsafeCall,
      `${entry.path} has a raw error sink`
    );
  }
});
