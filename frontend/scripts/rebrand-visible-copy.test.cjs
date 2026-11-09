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

test('no upstream Atlas branding or upstream site in user-visible web and mobile text', () => {
  const path = require('path');
  const repo = path.resolve(__dirname, '..', '..');
  const roots = ['frontend/src', 'mobile/screens', 'mobile/components', 'mobile/navigation', 'mobile/i18n']
    .map((dir) => path.join(repo, dir));
  // The only allowed mention is the AGPL attribution on the open-source notices page.
  const allowed = /open_source_upstream/;
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        const lines = fs.readFileSync(full, 'utf8').split('\n');
        lines.forEach((line, index) => {
          const attribution = allowed.test(line) || allowed.test(lines[index - 1] || '');
          if (/atlas-cmms\.com|أطلس|\bAtlas CMMS\b/i.test(line) && !attribution) {
            offenders.push(`${path.relative(repo, full)}:${index + 1}`);
          }
        });
      }
    }
  };
  roots.filter((dir) => fs.existsSync(dir)).forEach(walk);
  assert.deepEqual(offenders, []);
});
