const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '../src/content/own/Analytics/recordNavigation.ts'),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, {
  exports: moduleExports,
  require: () => ({
    getAssetUrl: (id) => `/app/assets/${id}/overview`,
    getPartUrl: (id) => `/app/inventory/parts/${id}`,
    getUserUrl: (id) => `/app/people-teams/people/${id}`
  })
});

test('analytics records navigate to their existing entity detail routes', () => {
  const { getAnalyticsRecordPath } = moduleExports;
  assert.equal(
    getAnalyticsRecordPath([{ key: 'asset', value: 23 }]),
    '/app/assets/23/overview'
  );
  assert.equal(
    getAnalyticsRecordPath([{ key: 'part', value: 17 }]),
    '/app/inventory/parts/17'
  );
  assert.equal(
    getAnalyticsRecordPath([{ key: 'user', value: 8 }]),
    '/app/people-teams/people/8'
  );
});

test('analytics does not invent record routes for aggregate or invalid filters', () => {
  const { getAnalyticsRecordPath } = moduleExports;
  assert.equal(
    getAnalyticsRecordPath([{ key: 'month', value: '2026-10' }]),
    null
  );
  assert.equal(getAnalyticsRecordPath([{ key: 'category', value: 5 }]), null);
  assert.equal(getAnalyticsRecordPath([{ key: 'fs', value: false }]), null);
  assert.equal(getAnalyticsRecordPath([{ key: 'asset', value: 0 }]), null);
  assert.equal(getAnalyticsRecordPath([{ key: 'asset', value: '23' }]), null);
  assert.equal(
    getAnalyticsRecordPath([
      { key: 'asset', value: 23 },
      { key: 'month', value: '2026-10' }
    ]),
    null
  );
});

test('asset cost chart passes the equipment ID as an asset filter', () => {
  const component = fs.readFileSync(
    path.join(
      __dirname,
      '../src/content/own/Analytics/Asset/Cost/DowntimesAndCosts.tsx'
    ),
    'utf8'
  );
  assert.match(
    component,
    /filters:\s*\[\{ key: 'asset', value: asset\.id \}\]/
  );
  assert.doesNotMatch(
    component,
    /filters:\s*\[\{ key: 'user', value: asset\.id \}\]/
  );
});

test('part category aggregates are not presented as clickable records', () => {
  const component = fs.readFileSync(
    path.join(
      __dirname,
      '../src/content/own/Analytics/Part/Consumption/PartConsumptionByCategory.tsx'
    ),
    'utf8'
  );
  assert.doesNotMatch(component, /onClick=/);
  assert.match(component, /label: category\.name/);
});
