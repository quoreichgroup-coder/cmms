const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

test('asset pages expose NFC assignment only with the existing license entitlement', () => {
  const createPage = read('src/content/own/Assets/index.tsx');
  const detailPage = read('src/content/own/Assets/Show/index.tsx');
  const detailsCard = read('src/content/own/Assets/Show/AssetDetails.tsx');
  const model = read('src/models/owns/asset.ts');

  for (const page of [createPage, detailPage, detailsCard]) {
    assert.match(page, /useLicenseEntitlement\('NFC_BARCODE'\)/);
    assert.match(page, /hasNfcBarcode/);
  }
  assert.match(createPage, /name: 'nfcId'/);
  assert.match(detailPage, /name: 'nfcId'/);
  assert.match(detailsCard, /asset\?\.nfcId/);
  assert.match(model, /nfcId\?: string/);
});

test('asset QR generation uses the existing barcode identifier and download action', () => {
  const detailsCard = read('src/content/own/Assets/Show/AssetDetails.tsx');
  assert.match(detailsCard, /QRCodeSVG/);
  assert.match(detailsCard, /value=\{value\.toString\(\)\}/);
  assert.match(detailsCard, /downloadQRCode\(value\.toString\(\)\)/);
  assert.match(detailsCard, /printAssetLabel\(asset, t\)/);
  assert.match(detailsCard, /populateQrPrintDocument/);
  assert.match(detailsCard, /asset\.barCode/);
  assert.match(detailsCard, /print_asset_label/);
});

test('NFC assignment help states that browser NFC reading is unavailable', () => {
  const english = read('src/i18n/translations/en.ts');
  const french = read('src/i18n/translations/fr.ts');
  assert.match(
    english,
    /nfc_web_assignment_help:[\s\S]*?cannot read NFC tags directly/
  );
  assert.match(
    french,
    /nfc_web_assignment_help:[\s\S]*?ne peuvent pas lire directement/
  );
});
