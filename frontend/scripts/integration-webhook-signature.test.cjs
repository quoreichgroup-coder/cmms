const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

test('integration setup explains the webhook replay-protection limitation', () => {
  const setupDialog = read(
    '../src/content/own/Settings/Integrations/IntegrationSetupDialog.tsx'
  );
  const french = read('../src/i18n/translations/fr.ts');
  const english = read('../src/i18n/translations/en.ts');

  assert.match(
    setupDialog,
    /severity="warning">\s*\{t\('integration_webhook_replay_limit'\)\}/
  );
  assert.match(
    french,
    /integration_webhook_replay_limit:[\s\S]*?corps JSON brut[\s\S]*?rejeu[\s\S]*?achat/
  );
  assert.match(
    english,
    /integration_webhook_replay_limit:[\s\S]*?raw JSON body[\s\S]*?replay[\s\S]*?purchase/
  );
});

test('the warning matches the current backend signature contract', () => {
  const dispatch = read(
    '../../api/src/main/java/com/grash/service/WebhookDispatchService.java'
  );
  const signatureMethod = dispatch.match(
    /private String generateSignature\(String payload, String secret\) \{([\s\S]*?)\n    \}/
  );

  assert.ok(signatureMethod, 'backend HMAC method should exist');
  assert.match(
    signatureMethod[1],
    /mac\.doFinal\(payload\.getBytes\(StandardCharsets\.UTF_8\)\)/
  );
  assert.match(dispatch, /headers\.set\("X-Webhook-Timestamp", timestamp\)/);
  assert.match(
    dispatch,
    /headers\.set\("X-Webhook-Id", UUID\.randomUUID\(\)\.toString\(\)\)/
  );
  assert.doesNotMatch(signatureMethod[1], /timestamp|deliveryId|X-Webhook-Id/i);
});

test('integration wizard announces the active step accessibly in French and English', () => {
  const setupDialog = read(
    '../src/content/own/Settings/Integrations/IntegrationSetupDialog.tsx'
  );
  const french = read('../src/i18n/translations/fr.ts');
  const english = read('../src/i18n/translations/en.ts');

  assert.match(
    setupDialog,
    /aria-current=\{index === step \? 'step' : undefined\}/
  );
  assert.match(
    setupDialog,
    /role="status"[\s\S]*?aria-live="polite"[\s\S]*?aria-atomic="true"/
  );
  assert.match(setupDialog, /t\('integration_step_progress'/);
  assert.match(
    french,
    /integration_step_progress: 'Étape \{\{current\}\} sur \{\{total\}\}/
  );
  assert.match(
    english,
    /integration_step_progress: 'Step \{\{current\}\} of \{\{total\}\}/
  );
});
