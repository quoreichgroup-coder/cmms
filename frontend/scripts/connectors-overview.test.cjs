const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.join(__dirname, '..');

function readSourceTree(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readSourceTree(fullPath, extension);
    return entry.isFile() && entry.name.endsWith(extension)
      ? [fs.readFileSync(fullPath, 'utf8')]
      : [];
  });
}

test('integration hub separates webhook recipes from future direct connectors', () => {
  const page = fs.readFileSync(
    path.join(root, 'src/content/own/Settings/Integrations/Connectors.tsx'),
    'utf8'
  );
  const router = fs.readFileSync(path.join(root, 'src/router/app.tsx'), 'utf8');

  assert.match(page, /key: 'api-keys'/);
  assert.match(page, /key: 'webhooks'/);
  assert.match(page, /to=\{`\/app\/settings\/integrations\/\$\{key\}`\}/);
  assert.match(page, /id: 'power-automate'/);
  assert.match(page, /id: 'n8n'/);
  assert.match(page, /id: 'sap-eam'/);
  assert.match(page, /id: 'microsoft-calendar'/);
  assert.match(page, /integration_recipe_available/);
  assert.match(page, /integration_planned/);
  assert.match(page, /IntegrationSetupDialog/);
  assert.match(page, /workflowRecipes/);
  assert.match(page, /integration_recipe_configure/);
  assert.match(page, /getWebhookEventLabelKey\(event\)/);
  assert.match(router, /path: 'api-keys'/);
  assert.match(router, /path: 'webhooks'/);
  assert.doesNotMatch(page, /connected|lastSync|connectionStatus/i);
});

test('provider setup guide uses real QPM routes and does not fake delivery verification', () => {
  const dialog = fs.readFileSync(
    path.join(
      root,
      'src/content/own/Settings/Integrations/IntegrationSetupDialog.tsx'
    ),
    'utf8'
  );

  assert.match(dialog, /\/app\/settings\/integrations\/webhooks/);
  assert.match(dialog, /\/app\/settings\/integrations\/api-keys/);
  assert.match(dialog, /docs\.n8n\.io/);
  assert.match(dialog, /learn\.microsoft\.com/);
  assert.match(dialog, /integration_step_verify_note/);
  assert.match(dialog, /noopener noreferrer/);
});

test('connectors overview content is translated in English and French', () => {
  for (const locale of ['en', 'fr']) {
    const translations = fs.readFileSync(
      path.join(root, `src/i18n/translations/${locale}.ts`),
      'utf8'
    );
    for (const key of [
      'integration_hub_description',
      'connector_api_keys_description',
      'connector_webhooks_description',
      'integration_recipe_available',
      'integration_recipes_title',
      'integration_recipe_configure',
      'integration_step_verify_note',
      'integration_writeback_desc'
    ]) {
      assert.match(translations, new RegExp(`${key}:`));
    }
  }
});

test('maintenance recipes only reference real webhook event identifiers', () => {
  const page = fs.readFileSync(
    path.join(root, 'src/content/own/Settings/Integrations/Connectors.tsx'),
    'utf8'
  );
  const eventModel = fs.readFileSync(
    path.join(root, 'src/models/owns/webhookEndpoint.ts'),
    'utf8'
  );
  for (const event of [
    'NEW_WORK_ORDER',
    'WORK_ORDER_STATUS_CHANGE',
    'NEW_REQUEST',
    'WORK_REQUEST_STATUS_CHANGE',
    'PART_QUANTITY_CHANGED',
    'PART_CHANGE'
  ]) {
    assert.match(page, new RegExp(`'${event}'`));
    assert.match(eventModel, new RegExp(`'${event}'`));
  }
  assert.match(page, /\/app\/settings\/integrations\/webhooks/);
});

test('webhook creation only offers event types currently dispatched by the API', () => {
  const model = fs.readFileSync(
    path.join(root, 'src/models/owns/webhookEndpoint.ts'),
    'utf8'
  );
  const page = fs.readFileSync(
    path.join(root, 'src/content/own/Settings/Integrations/Webhooks.tsx'),
    'utf8'
  );
  const backendRoot = path.join(root, '../api/src/main/java/com/grash');
  const backend = readSourceTree(backendRoot, '.java').join('\n');

  for (const event of [
    'NEW_PURCHASE_ORDER',
    'PURCHASE_ORDER_CHANGE',
    'PURCHASE_ORDER_STATUS_CHANGE',
    'WORK_ORDER_OVERDUE'
  ]) {
    assert.match(model, new RegExp(`'${event}'`));
    assert.match(backend, new RegExp(`\\b${event}\\b`));
    assert.doesNotMatch(
      backend,
      new RegExp(`WebhookEvent\\.${event}\\b`),
      `${event} is declared but currently has no backend dispatch call`
    );
  }
  assert.match(page, /CONFIGURABLE_WEBHOOK_EVENTS\.map/);
});
