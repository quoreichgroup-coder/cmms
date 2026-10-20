const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const loadMediaPermissions = (alerts, camera) => {
  const file = path.join(__dirname, '..', 'utils/mediaPermissions.ts');
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    }
  }).outputText;
  const exports = {};

  vm.runInNewContext(
    compiled,
    {
      exports,
      console,
      require(id) {
        if (id === 'react-native') {
          return {
            Alert: { alert: (...args) => alerts.push(args) },
            Linking: { openSettings: async () => {} },
            Platform: { OS: 'android' }
          };
        }
        if (id === 'expo-camera') return { Camera: camera };
        if (id === 'expo-image-picker') return {};
        if (id === '../i18n/i18n') {
          return { __esModule: true, default: { t: (key) => key } };
        }
        if (id === './mediaPickerPlatform') {
          return {
            getImageLibraryOptions: (_platform, options) => options,
            shouldRequestPhotoLibraryPermission: () => true
          };
        }
        if (id === './safeErrorLog') return { logSafeError: () => {} };
        throw new Error(`Unexpected module: ${id}`);
      }
    },
    { filename: file }
  );

  return exports;
};

test('scanner permission uses its own denial UI without duplicate system alerts', async () => {
  const alerts = [];
  const denied = { granted: false, canAskAgain: false, status: 'denied' };
  const camera = {
    requestCameraPermissionsAsync: async () => denied,
    getCameraPermissionsAsync: async () => denied
  };
  const { ensurePermission, ensureScannerCameraPermission } =
    loadMediaPermissions(alerts, camera);

  assert.equal(
    await ensurePermission({
      permissionNameKey: 'camera',
      requestPermission: camera.requestCameraPermissionsAsync,
      getPermission: camera.getCameraPermissionsAsync
    }),
    false
  );
  assert.equal(alerts.length, 1, 'other media flows keep their alert');

  alerts.length = 0;
  assert.equal(
    await ensureScannerCameraPermission('SelectBarcodeModal'),
    false
  );
  assert.equal(alerts.length, 0, 'scanner modal owns denial recovery');

  camera.requestCameraPermissionsAsync = async () => {
    throw new Error('native permission request failed');
  };
  assert.equal(
    await ensureScannerCameraPermission('SelectBarcodeModal'),
    false
  );
  assert.equal(alerts.length, 0, 'scanner failure uses its own recovery UI');
});
