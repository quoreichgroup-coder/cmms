const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

test('mobile navigation exposes the approved destinations and keeps scanning explicit', () => {
  const navigation = read('navigation/index.tsx');
  const types = read('types.tsx');

  for (const route of ['Home', 'WorkOrders', 'Scan', 'Stats', 'MoreEntities']) {
    assert.match(types, new RegExp(`\\b${route}:`));
    assert.match(navigation, new RegExp(`name="${route}"`));
  }

  assert.match(
    navigation,
    /tabPress:\s*\(event\)\s*=>\s*\{\s*event\.preventDefault\(\);\s*navigation\.navigate\('ScanAsset'\)/
  );
  assert.doesNotMatch(
    navigation,
    /tabPress:\s*\(event\)\s*=>\s*\{[^}]*startNfc|startCamera/
  );
});

test('create action remains permission-gated, contextual, and hidden while the keyboard is open', () => {
  const navigation = read('navigation/index.tsx');

  assert.match(navigation, /const canCreate = createEntities\.some\(/);
  assert.match(navigation, /hasCreatePermission\(entity\)/);
  assert.match(navigation, /if \(keyboardVisible\) return null/);
  assert.match(
    navigation,
    /user\.role\.code === 'REQUESTER'[\s\S]*?navigate\('AddRequest' as never\)/
  );
  assert.match(navigation, /SheetManager\.show\('create-entities-sheet'/);
  assert.match(
    navigation,
    /hasViewPermission\(PermissionEntity\.ASSETS\)\s*&&\s*\(/
  );
  assert.match(
    navigation,
    /hasViewPermission\(PermissionEntity\.ANALYTICS\)\s*&&\s*\(/
  );
});

test('More menu retains request management with its existing view permission and company configuration', () => {
  const more = read('screens/MoreEntitiesScreen.tsx');
  const navigation = read('navigation/index.tsx');

  assert.match(
    more,
    /label: 'requests'[\s\S]*?link: 'Requests'[\s\S]*?PermissionEntity\.REQUESTS[\s\S]*?uiConfiguration\.requests/
  );
  assert.match(
    navigation,
    /const canViewRequests =\s*hasViewPermission\(PermissionEntity\.REQUESTS\)\s*&&\s*user\.uiConfiguration\.requests/
  );
  assert.match(
    navigation,
    /\{canViewRequests && \(\s*<Stack\.Screen\s+name="Requests"/
  );
});

test('narrow screens use compact labels and keep tab destinations accessible', () => {
  const navigation = read('navigation/index.tsx');

  assert.match(navigation, /tabBarShowLabel:\s*width\s*>=\s*440/);
  for (const label of ['home', 'requests', 'work_orders', 'stats', 'more']) {
    assert.match(
      navigation,
      new RegExp(`tabBarAccessibilityLabel:\\s*t\\('${label}'\\)`)
    );
  }
});

test('bottom navigation uses semantic theme colors and keeps the raised scan touch target', () => {
  const navigation = read('navigation/index.tsx');
  const tokens = read('theme/paperColors.ts');

  assert.match(tokens, /navigationSurface:\s*tokens\.surface/);
  assert.match(tokens, /navigationActive:\s*tokens\.brandPrimary/);
  assert.match(tokens, /onNavigationSurface:\s*tokens\.textPrimary/);
  assert.match(tokens, /onNavigationActive:\s*tokens\.onPrimary/);
  assert.match(navigation, /width:\s*60,\s*height:\s*60/);
  assert.match(navigation, /top:\s*-18/);
  assert.match(navigation, /overflow:\s*'visible'/);
});
