const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/logoutWithFallback.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports });
const clearSessionSource = ts.transpileModule(
  fs.readFileSync('src/utils/clearSessionAndState.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const clearSessionExports = {};
vm.runInNewContext(clearSessionSource, { exports: clearSessionExports });

test('local session is cleared after successful server logout', async () => {
  const calls = [];
  await moduleExports.logoutWithFallback(
    async () => calls.push('server'),
    () => calls.push('local')
  );

  assert.deepEqual(calls, ['server', 'local']);
});

test('local session is cleared and server logout failure is preserved', async () => {
  const calls = [];
  const failure = new Error('Network unavailable');

  await assert.rejects(
    moduleExports.logoutWithFallback(
      async () => {
        calls.push('server');
        throw failure;
      },
      () => calls.push('local')
    ),
    failure
  );

  assert.deepEqual(calls, ['server', 'local']);
});

test('application auth state is cleared when browser storage throws', () => {
  const calls = [];
  const storageError = new Error('Storage access denied');

  assert.throws(
    () =>
      clearSessionExports.clearSessionAndState(
        () => {
          calls.push('storage');
          throw storageError;
        },
        () => calls.push('application')
      ),
    storageError
  );

  assert.deepEqual(calls, ['storage', 'application']);
});

test('server logout failure is preserved when local cleanup also throws', async () => {
  const serverError = new Error('Logout endpoint unavailable');
  const storageError = new Error('Storage access denied');
  const calls = [];

  await assert.rejects(
    moduleExports.logoutWithFallback(
      async () => {
        calls.push('server');
        throw serverError;
      },
      () => {
        calls.push('local');
        throw storageError;
      }
    ),
    serverError
  );

  assert.deepEqual(calls, ['server', 'local']);
});

test('local cleanup failure is reported after successful server logout', async () => {
  const storageError = new Error('Storage access denied');

  await assert.rejects(
    moduleExports.logoutWithFallback(async () => {}, () => {
      throw storageError;
    }),
    storageError
  );
});
