const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const sourcePath = path.join(
  __dirname,
  '../src/content/own/WorkOrders/Calendar/eventPresentation.ts'
);
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
}).outputText;
const dueDatePath = path.join(__dirname, '../src/content/own/WorkOrders/dueDate.ts');
const dueDateCompiled = ts.transpileModule(
  fs.readFileSync(dueDatePath, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }
).outputText;

const dueDate = (() => {
  const exports = {};
  const module = { exports };
  vm.runInNewContext(dueDateCompiled, {
    exports,
    module,
    require
  });
  return module.exports;
})();

const tokens = {
  OPEN: { foreground: '#2F5BEA' },
  IN_PROGRESS: { foreground: '#6941C6' },
  ON_HOLD: { foreground: '#B54708' },
  OVERDUE: { foreground: '#B42318' },
  COMPLETE: { foreground: '#067647' },
  DEFAULT: { foreground: '#475467' }
};

const presentation = (() => {
  const exports = {};
  const module = { exports };
  vm.runInNewContext(compiled, {
    exports,
    module,
    require(name) {
      if (name === 'date-fns') return require(name);
      if (name === 'src/theme/tokens')
        return { qpmWorkOrderStatusTokens: tokens };
      if (name === '../dueDate') return dueDate;
      throw new Error(`Unexpected import: ${name}`);
    }
  });
  return module.exports;
})();

test('calendar maps work-order status to fixed semantic colors', () => {
  assert.equal(
    presentation.getCalendarEventColor({ status: 'OPEN' }),
    '#2F5BEA'
  );
  assert.equal(
    presentation.getCalendarEventColor({ status: 'IN_PROGRESS' }),
    '#6941C6'
  );
  assert.equal(
    presentation.getCalendarEventColor({ status: 'ON_HOLD' }),
    '#B54708'
  );
  assert.equal(
    presentation.getCalendarEventColor({ status: 'COMPLETE' }),
    '#067647'
  );
});

test('calendar marks past-due open work as overdue but keeps completed work complete', () => {
  const now = new Date(2026, 9, 17, 12);
  assert.equal(
    presentation.getCalendarEventStatus(
      { status: 'OPEN', dueDate: '2026-10-16' },
      now
    ),
    'OVERDUE'
  );
  assert.equal(
    presentation.getCalendarEventStatus(
      { status: 'COMPLETE', dueDate: '2026-10-16' },
      now
    ),
    'COMPLETE'
  );
  assert.equal(
    presentation.getCalendarEventStatus(
      { status: 'OPEN', dueDate: '2026-10-17' },
      now
    ),
    'OPEN'
  );
});

test('calendar treats UTC midnight due dates as the same local due day', () => {
  const originalTimezone = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    const now = new Date('2026-10-17T20:00:00.000Z'); // 13:00 on Oct 17 locally
    assert.equal(
      presentation.getCalendarEventStatus(
        { status: 'OPEN', dueDate: '2026-10-17T00:00:00.000Z' },
        now
      ),
      'OPEN'
    );
    assert.equal(
      presentation.getCalendarEventStatus(
        { status: 'OPEN', dueDate: '2026-10-16T00:00:00.000Z' },
        now
      ),
      'OVERDUE'
    );
    assert.equal(
      dueDate.isDueDateWithinNextDays(
        '2026-10-17T00:00:00.000Z',
        2,
        now
      ),
      true
    );
    assert.equal(
      dueDate.isDueDateWithinNextDays(
        '2026-10-18T00:00:00.000Z',
        2,
        now
      ),
      true
    );
    assert.equal(
      dueDate.isDueDateWithinNextDays(
        '2026-10-19T00:00:00.000Z',
        2,
        now
      ),
      false
    );
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test('calendar leaves unknown and invalid status metadata safely unclassified', () => {
  const now = new Date(2026, 9, 17, 12);
  assert.equal(
    presentation.getCalendarEventColor({ status: 'UNKNOWN' }, now),
    null
  );
  assert.equal(
    presentation.getCalendarEventStatus(
      { status: 'OPEN', dueDate: 'not-a-date' },
      now
    ),
    'OPEN'
  );
  assert.equal(presentation.getCalendarEventColor({}, now), null);
});
