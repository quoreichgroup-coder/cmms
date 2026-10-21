const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const helpCenter = fs.readFileSync(
  path.join(__dirname, '../src/content/own/HelpCenter/index.tsx'),
  'utf8'
);
const appRoutes = fs.readFileSync(
  path.join(__dirname, '../src/router/app.tsx'),
  'utf8'
);

test('the inventory help guide opens a route registered by the app router', () => {
  assert.match(helpCenter, /href:\s*'\/app\/inventory\/parts'/);
  assert.match(appRoutes, /path:\s*'inventory'[\s\S]*?path:\s*'parts'/);
});

test('all help guide links target routes present in the app router', () => {
  const hrefs = [...helpCenter.matchAll(/href:\s*'([^']+)'/g)].map(
    ([, href]) => href
  );

  assert.deepEqual(hrefs, [
    '/app/work-orders',
    '/app/requests',
    '/app/assets',
    '/app/inventory/parts',
    '/app/work-orders?view=calendar',
    '/app/account/profile',
    '/app/settings'
  ]);
  for (const href of hrefs) {
    const routePath = href.split('?')[0].replace(/^\/app\//, '');
    assert.ok(
      appRoutes.includes(`path: '${routePath.split('/')[0]}'`),
      `No top-level app route for ${href}`
    );
  }
});
