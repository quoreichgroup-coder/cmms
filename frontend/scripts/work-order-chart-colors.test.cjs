const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const chartFiles = [
  'src/content/own/Analytics/WorkOrder/Analysis/WOByCategory.tsx',
  'src/content/own/Analytics/WorkOrder/Analysis/WOByCompletedBy.tsx',
  'src/content/own/Analytics/WorkOrder/Analysis/WOByPrimaryUser.tsx',
  'src/content/own/Analytics/WorkOrder/Aging/IncompleteByAsset.tsx',
  'src/content/own/Analytics/WorkOrder/Aging/IncompleteByUser.tsx',
  'src/content/own/Analytics/WorkOrder/TimeAndCost/TimeCostByAsset.tsx',
  'src/content/own/Analytics/Request/Analysis/RequestsByCategory.tsx',
  'src/content/own/Analytics/Part/Consumption/PartConsumptionByCategory.tsx',
  'src/content/own/Analytics/Part/Consumption/PartConsumptionByWOCategory.tsx',
  'src/content/own/Analytics/Asset/UsefulLife/IncompleteByAsset.tsx',
  'src/content/own/Analytics/Asset/UsefulLife/IncompleteByUser.tsx',
  'src/content/own/Analytics/Asset/Cost/DowntimesAndCosts.tsx',
  'src/content/own/Analytics/Asset/Reliability/index.tsx'
];

test('maintenance analytics use stable QPM chart colors for series', () => {
  for (const file of chartFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /getQpmChartColor\(/, file);
    assert.doesNotMatch(source, /getRandomColor\(\)/, file);
  }

  const helper = fs.readFileSync('src/utils/chartColors.ts', 'utf8');
  assert.match(helper, /qpmAnalyticsTokens/);
  assert.match(helper, /Math\.imul/);
  assert.doesNotMatch(helper, /Math\.random/);
});

test('time-series chart colors remain stable through theme tokens', () => {
  const source = fs.readFileSync(
    'src/content/own/Analytics/Asset/Cost/DowntimesByDate.tsx',
    'utf8'
  );
  assert.match(source, /color:\s*theme\.palette\.primary\.main/);
  assert.match(source, /stroke=\{theme\.palette\.warning\.main\}/);
  assert.doesNotMatch(source, /getRandomColor\(\)|#8884d8|#ff7300/);
});

test('asset reliability chart series use semantic theme colors', () => {
  const files = [
    'src/content/own/Analytics/Asset/Reliability/DowntimesByAsset.tsx',
    'src/content/own/Analytics/Asset/Reliability/MTBFByAsset.tsx',
    'src/content/own/Analytics/Asset/Reliability/RepairTimeByAsset.tsx'
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /theme\.palette\.primary\.main/, file);
    assert.doesNotMatch(source, /#8884d8|#ff7300/, file);
  }
});
