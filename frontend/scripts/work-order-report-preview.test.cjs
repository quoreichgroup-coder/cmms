const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
const modal = fs.readFileSync(
  path.join(root, 'src/content/own/WorkOrders/Details/ReportConfigModal.tsx'),
  'utf8'
);
const slice = fs.readFileSync(
  path.join(root, 'src/slices/workOrder.ts'),
  'utf8'
);

test('work order report preview opens from the user gesture and isolates its opener', () => {
  assert.match(modal, /window\.open\('about:blank', '_blank'\)/);
  assert.match(modal, /if \(previewWindow\) previewWindow\.opener = null/);
  assert.match(modal, /getPDFReport\(workOrderId, config, previewWindow\)/);
});

test('generated report opens as a preview and falls back to download when blocked', () => {
  assert.match(slice, /previewWindow\.location\.replace\(url\)/);
  assert.match(
    slice,
    /window\.setTimeout\(\(\) => window\.URL\.revokeObjectURL\(url\), 60_000\)/
  );
  assert.match(slice, /link\.download = filename/);
  assert.match(
    modal,
    /\.catch\(\(error\) => \{[\s\S]*?previewWindow\?\.close\(\)/
  );
  assert.match(modal, /work_order_report_preview_error/);
});
