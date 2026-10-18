const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/safeWindow.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;

function load() {
  const exports = {};
  const opened = [];
  vm.runInNewContext(source, {
    exports,
    URL,
    window: {
      location: { origin: 'https://qpm.example' },
      open: (...args) => opened.push(args)
    }
  });
  return { ...exports, opened };
}

test('opens only HTTP(S) destinations and detaches the new tab', () => {
  const { openSafeWindow, opened } = load();

  openSafeWindow('https://files.example/report.pdf');
  openSafeWindow('/storage/report.pdf?signature=abc');
  assert.deepEqual(opened, [
    ['https://files.example/report.pdf', '_blank', 'noopener,noreferrer'],
    [
      'https://qpm.example/storage/report.pdf?signature=abc',
      '_blank',
      'noopener,noreferrer'
    ]
  ]);
});

test('rejects script, data, and credential-bearing URLs', () => {
  const { openSafeWindow, opened } = load();

  openSafeWindow('javascript:alert(1)');
  openSafeWindow('data:text/html,<script>alert(1)</script>');
  openSafeWindow('https://user:pass@files.example/report.pdf');
  assert.equal(opened.length, 0);
});

test('normalizes links for rendered anchors and rejects unsafe schemes', () => {
  const { getSafeHttpUrl } = load();

  assert.equal(
    getSafeHttpUrl('/storage/manual.pdf?signature=abc'),
    'https://qpm.example/storage/manual.pdf?signature=abc'
  );
  assert.equal(
    getSafeHttpUrl('qpm.example/contact', { assumeHttps: true }),
    'https://qpm.example/contact'
  );
  assert.equal(getSafeHttpUrl('javascript:alert(1)'), null);
  assert.equal(getSafeHttpUrl('data:text/html,unsafe'), null);
  assert.equal(getSafeHttpUrl('https://user:pass@example.com'), null);
  assert.equal(getSafeHttpUrl('ftp://files.example/manual.pdf'), null);
});

test('supports explicitly enabled mailto links and normalizes bare websites', () => {
  const { openSafeWindow, opened } = load();

  openSafeWindow('mailto:support@qpm.example?subject=Help', {
    allowMailto: true
  });
  openSafeWindow('qpm.example/about', { assumeHttps: true });
  openSafeWindow('mailto:support@qpm.example');

  assert.deepEqual(opened, [
    [
      'mailto:support@qpm.example?subject=Help',
      '_blank',
      'noopener,noreferrer'
    ],
    ['https://qpm.example/about', '_blank', 'noopener,noreferrer']
  ]);
});
