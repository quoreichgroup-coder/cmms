const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const { formatDashboardDate, getUtcDayRange } = mobileRuntime().load(
  'utils/dashboardDates.ts'
);

test('dashboard day range uses UTC midnight and an exclusive next-day bound', () => {
  const [start, end] = getUtcDayRange(new Date('2026-10-11T23:45:00-07:00'));

  assert.equal(start.toISOString(), '2026-10-12T00:00:00.000Z');
  assert.equal(end.toISOString(), '2026-10-13T00:00:00.000Z');
  assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
});

test('dashboard UTC day range is unaffected by local timezone offsets', () => {
  const date = new Date('2026-03-29T00:30:00+02:00');
  const [start, end] = getUtcDayRange(date);

  assert.equal(start.toISOString(), '2026-03-28T00:00:00.000Z');
  assert.equal(end.toISOString(), '2026-03-29T00:00:00.000Z');
});

test('dashboard date label follows the selected application language', () => {
  const date = new Date(2026, 9, 11, 12);
  const english = formatDashboardDate(date, 'en');
  const french = formatDashboardDate(date, 'fr');

  assert.match(english, /Oct/);
  assert.match(french, /oct/i);
  assert.notEqual(english, french);
});
