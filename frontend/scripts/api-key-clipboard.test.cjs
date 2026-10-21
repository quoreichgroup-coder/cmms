const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '../src/utils/clipboard.ts'),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports, navigator: {} });

test('reports success only after clipboard write resolves', async () => {
  let copiedText;
  const copied = await moduleExports.writeClipboardText(
    'one-time-secret',
    () => ({
      writeText: async (text) => {
        copiedText = text;
      }
    })
  );

  assert.equal(copied, true);
  assert.equal(copiedText, 'one-time-secret');
});

test('reports failure when clipboard is rejected or unavailable', async () => {
  const rejected = await moduleExports.writeClipboardText('secret', () => ({
    writeText: async () => {
      throw new Error('clipboard permission denied');
    }
  }));
  const unavailable = await moduleExports.writeClipboardText(
    'secret',
    () => undefined
  );

  assert.equal(rejected, false);
  assert.equal(unavailable, false);
});
