const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const sourcePath = path.join(
  __dirname,
  '../src/content/own/WorkOrders/Calendar/periodLabel.ts'
);
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
}).outputText;

const periodLabel = (() => {
  const exports = {};
  const module = { exports };
  vm.runInNewContext(compiled, {
    exports,
    module,
    require(name) {
      if (name === 'date-fns') return require(name);
      throw new Error(`Unexpected import: ${name}`);
    }
  });
  return module.exports.getCalendarPeriodLabel;
})();

test('month and day views identify their exact displayed period', () => {
  const date = new Date(2026, 9, 12);
  assert.equal(periodLabel({ date, view: 'dayGridMonth' }), 'October 2026');
  assert.equal(
    periodLabel({ date, view: 'timeGridDay' }),
    'Monday, 12 October 2026'
  );
});

test('week view displays the inclusive dates represented by FullCalendar range', () => {
  const date = new Date(2026, 8, 30);
  assert.equal(
    periodLabel({
      date,
      view: 'timeGridWeek',
      rangeStart: new Date(2026, 8, 28),
      rangeEnd: new Date(2026, 9, 5),
      locale: require('date-fns/locale/en-GB')
    }),
    '28 Sep – 4 Oct 2026'
  );
});

test('same-month week range uses a compact localized label', () => {
  assert.equal(
    periodLabel({
      date: new Date(2026, 9, 14),
      view: 'listWeek',
      rangeStart: new Date(2026, 9, 12),
      rangeEnd: new Date(2026, 9, 19),
      locale: require('date-fns/locale/fr')
    }),
    '12–18 octobre 2026'
  );
});
