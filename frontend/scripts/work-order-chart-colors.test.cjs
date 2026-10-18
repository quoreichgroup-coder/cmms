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
  'src/content/own/Analytics/Asset/Reliability/index.tsx',
  'src/content/own/Analytics/Part/Consumption/PartConsumptionsByAsset.tsx',
  'src/content/own/Analytics/Part/Consumption/PartConsumptionsPareto.tsx'
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

  const overallUtilities = fs.readFileSync('src/utils/overall.ts', 'utf8');
  assert.doesNotMatch(overallUtilities, /getRandomColor/);
});

test('time-series chart colors remain stable through theme tokens', () => {
  const files = [
    'src/content/own/Analytics/Asset/Cost/DowntimesByDate.tsx',
    'src/content/own/Analytics/Part/Consumption/PartConsumptionsByDate.tsx'
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /theme\.palette\.primary\.main/, file);
    assert.doesNotMatch(source, /getRandomColor\(\)|#8884d8|#ff7300/, file);
  }
});

test('Pareto cumulative percentages include the current part and avoid zero division', () => {
  const source = fs.readFileSync(
    'src/content/own/Analytics/Part/Consumption/PartConsumptionsPareto.tsx',
    'utf8'
  );
  assert.match(source, /totalCost > 0/);
  assert.match(source, /slice\(0, index \+ 1\)/);
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

test('priority and request resolution charts use semantic theme colors', () => {
  const semanticColorFiles = [
    'src/content/own/Analytics/WorkOrder/Analysis/WOByPriority.tsx',
    'src/content/own/Analytics/Request/Analysis/RequestStatsByPriority.tsx',
    'src/content/own/Analytics/WorkOrder/Status/IncompleteWO.tsx'
  ];

  for (const file of semanticColorFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /theme\.palette\.primary\.main/, file);
    assert.doesNotMatch(source, /#8884d8|#ff7300/, file);
  }

  const resolution = fs.readFileSync(
    'src/content/own/Analytics/Request/Analysis/RequestsResolution.tsx',
    'utf8'
  );
  assert.match(resolution, /theme\.palette\.primary\.main/);
  assert.match(resolution, /theme\.palette\.success\.main/);
  assert.match(resolution, /theme\.palette\.info\.main/);
  assert.doesNotMatch(resolution, /fill=['"](red|blue)['"]|#ff7300/);
});
