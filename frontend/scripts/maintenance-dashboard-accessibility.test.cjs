const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const dashboard = fs.readFileSync(
  'src/content/own/MaintenanceDashboard/index.tsx',
  'utf8'
);
const english = fs.readFileSync('src/i18n/translations/en.ts', 'utf8');
const french = fs.readFileSync('src/i18n/translations/fr.ts', 'utf8');

test('maintenance charts expose localized summaries to assistive technology', () => {
  assert.match(dashboard, /role="img"/);
  assert.match(
    dashboard,
    /aria-label=\{`\$\{title\}\. \$\{chartDescription\}`\}/
  );
  assert.match(dashboard, /chartDescription=\{statusChartDescription\}/);
  assert.match(dashboard, /chartDescription=\{costChartDescription\}/);
  assert.match(english, /dashboard_status_chart_accessible_summary:/);
  assert.match(english, /dashboard_cost_chart_accessible_summary:/);
  assert.match(french, /dashboard_status_chart_accessible_summary:/);
  assert.match(french, /dashboard_cost_chart_accessible_summary:/);
});

test('work-order status chart uses fixed semantic colors and theme-aware tooltips', () => {
  assert.match(dashboard, /qpmWorkOrderStatusTokens/);
  assert.match(dashboard, /chartStatusColor\('OPEN'\)/);
  assert.match(dashboard, /chartStatusColor\('IN_PROGRESS'\)/);
  assert.match(dashboard, /chartStatusColor\('ON_HOLD'\)/);
  assert.match(dashboard, /chartStatusColor\('COMPLETE'\)/);
  assert.match(dashboard, /contentStyle=\{tooltipContentStyle\}/);
  assert.match(dashboard, /labelStyle=\{tooltipLabelStyle\}/);
});
