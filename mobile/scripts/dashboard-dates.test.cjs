const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const { formatDashboardDate, getCompanyDayRange } = mobileRuntime().load(
  'utils/dashboardDates.ts'
);

test('dashboard day range uses the company timezone and an exclusive next-day bound', () => {
  const [start, end] = getCompanyDayRange(
    new Date('2026-10-11T23:45:00-07:00'),
    'Europe/Berlin'
  );

  assert.equal(start.toISOString(), '2026-10-11T22:00:00.000Z');
  assert.equal(end.toISOString(), '2026-10-12T22:00:00.000Z');
  assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
});

test('company dashboard day range respects a 23-hour daylight-saving day', () => {
  const date = new Date('2026-03-29T12:00:00+02:00');
  const [start, end] = getCompanyDayRange(date, 'Europe/Berlin');

  assert.equal(start.toISOString(), '2026-03-28T23:00:00.000Z');
  assert.equal(end.toISOString(), '2026-03-29T22:00:00.000Z');
  assert.equal(end.getTime() - start.getTime(), 23 * 60 * 60 * 1000);
});

test('company dashboard day range respects a 25-hour daylight-saving day', () => {
  const date = new Date('2026-10-25T12:00:00+01:00');
  const [start, end] = getCompanyDayRange(date, 'Europe/Berlin');

  assert.equal(start.toISOString(), '2026-10-24T22:00:00.000Z');
  assert.equal(end.toISOString(), '2026-10-25T23:00:00.000Z');
  assert.equal(end.getTime() - start.getTime(), 25 * 60 * 60 * 1000);
});

test('company dashboard day range falls back safely for an invalid timezone', () => {
  const [start, end] = getCompanyDayRange(
    new Date('2026-03-29T12:00:00+02:00'),
    'Invalid/CompanyZone'
  );
  assert.equal(start.toISOString(), '2026-03-29T00:00:00.000Z');
  assert.equal(end.toISOString(), '2026-03-30T00:00:00.000Z');
});

test('dashboard date label follows the selected application language', () => {
  const date = new Date(2026, 9, 11, 12);
  const english = formatDashboardDate(date, 'en');
  const french = formatDashboardDate(date, 'fr');

  assert.match(english, /Oct/);
  assert.match(french, /oct/i);
  assert.notEqual(english, french);
});

test('Home and Stats drilldowns use the same company timezone as the KPI API', () => {
  for (const screen of ['HomeScreen.tsx', 'WorkOrderStatsScreen.tsx']) {
    const source = fs.readFileSync(
      path.join(__dirname, `../screens/${screen}`),
      'utf8'
    );
    assert.match(source, /getCompanyDayRange\(/, screen);
    assert.match(
      source,
      /companySettings\?\.generalPreferences\?\.timeZone \?\? 'UTC'/,
      screen
    );
    assert.doesNotMatch(source, /getUtcDayRange/, screen);

    const todayMetricStart = source.indexOf("label: 'TODAY_WO'");
    const nextMetricStart = source.indexOf(
      "label: 'HIGH_WO'",
      todayMetricStart
    );
    assert.notEqual(todayMetricStart, -1, `${screen} should define Today WOs`);
    assert.notEqual(nextMetricStart, -1, `${screen} should define High WOs`);
    const todayMetric = source.slice(todayMetricStart, nextMetricStart);
    assert.match(todayMetric, /operation: 'ge',[\s\S]*?value: todayStart/);
    assert.match(todayMetric, /operation: 'lt',[\s\S]*?value: tomorrowStart/);
  }
});
