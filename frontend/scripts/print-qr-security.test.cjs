const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/printQrCode.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports });

test('untrusted portal titles are rendered as text in the QR print document', () => {
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body></body></html>'
  );
  const title = '</title><script>window.pwned = true</script><img src=x>';

  moduleExports.populateQrPrintDocument(
    dom.window,
    `QR Code - ${title}`,
    'data:image/svg+xml;base64,PHN2Zy8+'
  );

  assert.equal(dom.window.document.title, `QR Code - ${title}`);
  assert.equal(dom.window.document.querySelector('script'), null);
  assert.equal(dom.window.document.querySelectorAll('img').length, 1);
  assert.equal(
    dom.window.document.body.querySelector('img').alt,
    `QR Code - ${title}`
  );
  assert.equal(dom.window.pwned, undefined);
  dom.window.close();
});

test('asset label metadata is rendered as text and includes a printable QR', () => {
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body></body></html>'
  );
  const title = '<img src=x onerror=alert(1)>';
  const identifier = '</p><script>window.pwned = true</script>';

  moduleExports.populateQrPrintDocument(
    dom.window,
    title,
    'data:image/svg+xml;base64,PHN2Zy8+',
    { subtitle: 'Scan with the QPM mobile app', identifier }
  );

  assert.equal(dom.window.document.querySelector('h1').textContent, title);
  assert.equal(
    dom.window.document.querySelector('.identifier').textContent,
    identifier
  );
  assert.equal(dom.window.document.querySelectorAll('script').length, 0);
  assert.equal(dom.window.document.querySelectorAll('img').length, 1);
  assert.match(
    dom.window.document.querySelector('style').textContent,
    /@page \{ size: 100mm 70mm/
  );
  dom.window.close();
});
