const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const file = process.env.QPM_PILOT_FIXTURE;
assert.ok(file, 'QPM_PILOT_FIXTURE is required');
const f = JSON.parse(fs.readFileSync(file, 'utf8'));
const base = process.env.QPM_PILOT_URL || 'http://127.0.0.1:3410';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
assert.match(f.appdb, /^qpm_pilot_\d+$/, 'Use only the isolated pilot database');
let token;
async function request(method, route, data, status = 200) {
  const response = await fetch(base + '/api/' + route, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data)
  });
  assert.equal(response.status, status, method + ' ' + route);
  return response.json();
}
async function countOrders(assetId) {
  const page = await request('POST', 'work-orders/search', {
    filterFields: [{ field: 'asset.id', operation: 'eq', value: assetId }],
    pageNum: 0, pageSize: 10, sortField: 'id', direction: 'ASC'
  });
  return page.totalElements;
}
(async () => {
  const auth = await request('POST', 'auth/signin', { email: 'responsable@pilot.test', password: f.password });
  token = auth.accessToken;
  const state = await request('GET', 'license/state');
  assert.equal(state.valid, true); assert.equal(state.previewMode, false);
  assert.ok(state.entitlements.includes('CONDITION_BASED_PM'));
  const results = [];
  for (const condition of ['MORE_THAN', 'LESS_THAN']) {
    const asset = await request('POST', 'assets', { name: 'Convoyeur seuil ' + condition + ' — pilote', status: 'OPERATIONAL' });
    const meter = await request('POST', 'meters', { name: 'Mesure seuil ' + condition, unit: 'h', updateFrequency: 1, asset: { id: asset.id } });
    await request('POST', 'work-order-meter-triggers', {
      name: 'Seuil ' + condition, title: 'Ordre au seuil — pilote ' + condition,
      triggerCondition: condition, value: 100, waitBefore: 30, recurrent: false,
      meter: { id: meter.id }, asset: { id: asset.id }
    });
    const reading = await request('POST', 'readings', { meter: { id: meter.id }, value: condition === 'MORE_THAN' ? 99 : 101 });
    assert.equal(await countOrders(asset.id), 0, condition + ': non-triggering side');
    await request('PATCH', 'readings/' + reading.id, { value: 100 });
    assert.equal(await countOrders(asset.id), 0, condition + ': equality');
    await request('PATCH', 'readings/' + reading.id, { value: condition === 'MORE_THAN' ? 101 : 99 });
    assert.equal(await countOrders(asset.id), 1, condition + ': strict threshold');
    await request('PATCH', 'readings/' + reading.id, { value: condition === 'MORE_THAN' ? 102 : 98 });
    assert.equal(await countOrders(asset.id), 2, condition + ': repeated evaluation');
    await request('POST', 'readings', { meter: { id: meter.id }, value: condition === 'MORE_THAN' ? 103 : 97 }, 406);
    assert.equal(await countOrders(asset.id), 2, condition + ': minimum frequency respected');
    // Age this test reading only, to simulate the next permitted reading day.
    assert.ok(Number.isSafeInteger(reading.id));
    execFileSync(process.env.QPM_PSQL || '/usr/bin/psql', [
      '-h', '127.0.0.1', '-p', '55439', '-U', 'qpm_test', '-d', f.appdb,
      '-v', 'ON_ERROR_STOP=1', '-c',
      `UPDATE reading SET created_at = created_at - INTERVAL '2 days' WHERE id = ${reading.id}`
    ], { stdio: 'pipe' });
    await request('POST', 'readings', { meter: { id: meter.id }, value: condition === 'MORE_THAN' ? 103 : 97 });
    assert.equal(await countOrders(asset.id), 3, condition + ': another permitted reading triggers again');
    results.push({ condition, threshold: 100, generatedOrders: 3, assetId: asset.id });
    console.log('PASS', condition, ': égalité, seuil strict, répétition, modification et fréquence minimale');
  }
  fs.writeFileSync(path.join(path.dirname(file), 'meter-results.json'), JSON.stringify(results, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
