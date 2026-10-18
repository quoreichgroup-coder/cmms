const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const blockList = require('../metro.config').resolver.blockList;
const blockRules = Array.isArray(blockList) ? blockList : [blockList];

const isBlocked = (relativePath) => {
  const absolutePath = path.resolve(projectRoot, relativePath);
  return blockRules.some((rule) => rule.test(absolutePath));
};

test('Metro excludes generated native and local build trees from file watching', () => {
  const generatedPaths = [
    '.build-tools/android-sdk/platforms/android-36',
    '.expo-export-review/android/assets',
    'node_modules/expo-dev-launcher/expo-dev-launcher-gradle-plugin/build/classes/kotlin',
    'node_modules/react-native-safe-area-context/android/build/generated'
  ];

  for (const generatedPath of generatedPaths) {
    assert.equal(
      isBlocked(generatedPath),
      true,
      `Metro should exclude ${generatedPath}`
    );
  }

  assert.equal(isBlocked('screens/HomeScreen.tsx'), false);
});
