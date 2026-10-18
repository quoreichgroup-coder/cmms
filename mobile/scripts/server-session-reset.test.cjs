const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');
const yup = require('yup');

test('server change clears credentials and persisted tenant state in order', async () => {
  const runtime = mobileRuntime();
  const { clearServerSessionState } = runtime.load(
    'utils/clearServerSessionState.ts'
  );
  const events = [];

  await clearServerSessionState(
    async () => events.push('credentials-cleared'),
    (action) => events.push(action.type),
    async () => events.push('persisted-state-flushed')
  );

  assert.deepEqual(events, [
    'credentials-cleared',
    'REVERT_ALL',
    'persisted-state-flushed'
  ]);

  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/auth/CustomServerScreen.tsx'),
    'utf8'
  );
  assert.equal((source.match(/clearServerSessionState\(/g) || []).length, 2);
  assert.match(source, /multiRemove\([\s\S]*?removeItem\('customApiUrl'\)/);
  assert.match(
    source,
    /'accessToken'[\s\S]*?'refreshToken'[\s\S]*?'companyId'/
  );
  assert.match(source, /test\([\s\S]*?'valid-server-url'/);
  assert.match(source, /getServerUrlValidationError\(value, t\)/);
  assert.match(source, /keyboardType="url"/);
  assert.match(source, /autoCorrect=\{false\}/);
});

test('server URL field validates format inline with the configured URL rules', async () => {
  const { getServerUrlValidationError } = mobileRuntime().load(
    'utils/serverUrlValidation.ts'
  );
  const t = (key) => key;
  const schema = yup
    .string()
    .required('required_url')
    .test('valid-server-url', 'invalid_server_url_scheme', function (value) {
      const error = getServerUrlValidationError(value, t);
      return error ? this.createError({ message: error }) : true;
    });

  await assert.rejects(schema.validate('cmms.example.com'), (error) => {
    assert.match(error.message, /invalid_server_url_scheme/);
    return true;
  });
  await assert.rejects(
    schema.validate('http://cmms.example.com/api'),
    (error) => {
      assert.match(error.message, /https_required_for_server/);
      return true;
    }
  );
  await assert.doesNotReject(schema.validate('https://cmms.example.com/api'));
  await assert.doesNotReject(schema.validate('http://localhost:3000/api'));
});
