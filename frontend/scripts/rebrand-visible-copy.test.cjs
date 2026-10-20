const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

test('owned user-facing product labels use the QPM brand', () => {
  const frontendPackage = JSON.parse(read('package.json'));
  assert.equal(frontendPackage.title, 'QUOREICH GROUP · QPM');
  assert.match(read('README.md'), /^# QUOREICH GROUP · QPM Web Frontend/m);
  assert.match(read('../api/README.md'), /^# QUOREICH GROUP · QPM API/m);
  assert.match(
    read('../mobile/utils/fields.ts'),
    /placeholder: 'QUOREICH GROUP'/
  );

  const webhooks = read(
    '../api/src/main/java/com/grash/controller/WebhookEndpointController.java'
  );
  assert.match(webhooks, /events occur in QPM/);
  assert.match(webhooks, /QPM sends an HTTP POST request/);
  assert.match(webhooks, /request came from QPM/);
});

test('rebranding does not change installed mobile application identifiers', () => {
  const config = read('../mobile/app.config.ts');
  assert.match(config, /bundleIdentifier: 'com\.cmms\.atlas'/);
  assert.match(config, /package: 'com\.atlas\.cmms'/);
  assert.match(config, /scheme: 'atlascmms'/);
});
