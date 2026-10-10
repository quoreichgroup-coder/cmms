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
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForOrders(assetId, expected) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const count = await countOrders(assetId);
    if (count === expected) return;
    await sleep(100);
  }
  assert.equal(await countOrders(assetId), expected, 'timed out waiting for scheduled meter trigger');
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
      triggerCondition: condition, value: 100, waitBefore: 1, recurrent: true,
      meter: { id: meter.id }, asset: { id: asset.id }
    });
    const reading = await request('POST', 'readings', { meter: { id: meter.id }, value: condition === 'MORE_THAN' ? 99 : 101 });
    assert.equal(await countOrders(asset.id), 0, condition + ': non-triggering side');
    await request('PATCH', 'readings/' + reading.id, { value: 100 });
    assert.equal(await countOrders(asset.id), 0, condition + ': equality');
    await request('PATCH', 'readings/' + reading.id, { value: condition === 'MORE_THAN' ? 101 : 99 });
    assert.equal(await countOrders(asset.id), 0, condition + ': wait-before delay');
    await request('PATCH', 'readings/' + reading.id, { value: condition === 'MORE_THAN' ? 99 : 101 });
    assert.equal(await countOrders(asset.id), 0, condition + ': clearing condition cancels pending order');
    await request('PATCH', 'readings/' + reading.id, { value: condition === 'MORE_THAN' ? 101 : 99 });
    assert.equal(await countOrders(asset.id), 0, condition + ': new crossing starts a fresh delay');
    await waitForOrders(asset.id, 1);
    await request('PATCH', 'readings/' + reading.id, { value: condition === 'MORE_THAN' ? 102 : 98 });
    assert.equal(await countOrders(asset.id), 1, condition + ': same-side update does not duplicate');
    await request('POST', 'readings', { meter: { id: meter.id }, value: condition === 'MORE_THAN' ? 103 : 97 }, 406);
    assert.equal(await countOrders(asset.id), 1, condition + ': minimum frequency respected');
    // Age this test reading only, to simulate the next permitted reading day.
    assert.ok(Number.isSafeInteger(reading.id));
    execFileSync(process.env.QPM_PSQL || '/usr/bin/psql', [
      '-h', '127.0.0.1', '-p', '55439', '-U', 'qpm_test', '-d', f.appdb,
      '-v', 'ON_ERROR_STOP=1', '-c',
      `UPDATE reading SET created_at = created_at - INTERVAL '2 days' WHERE meter_id = ${meter.id}`
    ], { stdio: 'pipe' });
    await request('POST', 'readings', { meter: { id: meter.id }, value: condition === 'MORE_THAN' ? 99 : 101 });
    assert.equal(await countOrders(asset.id), 1, condition + ': clearing the condition creates no order');
    execFileSync(process.env.QPM_PSQL || '/usr/bin/psql', [
      '-h', '127.0.0.1', '-p', '55439', '-U', 'qpm_test', '-d', f.appdb,
      '-v', 'ON_ERROR_STOP=1', '-c',
      `UPDATE reading SET created_at = created_at - INTERVAL '2 days' WHERE meter_id = ${meter.id}`
    ], { stdio: 'pipe' });
    await request('POST', 'readings', { meter: { id: meter.id }, value: condition === 'MORE_THAN' ? 103 : 97 });
    assert.equal(await countOrders(asset.id), 1, condition + ': second crossing respects wait-before');
    await waitForOrders(asset.id, 2);
    results.push({ condition, threshold: 100, generatedOrders: 2, assetId: asset.id });
    console.log('PASS', condition, ': égalité, délai, absence de doublon, réarmement et fréquence minimale');
  }
  fs.writeFileSync(path.join(path.dirname(file), 'meter-results.json'), JSON.stringify(results, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
