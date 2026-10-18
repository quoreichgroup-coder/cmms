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
  'src/content/own/Analytics/Part/Consumption/PartConsumptionByWOCategory.tsx'
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
