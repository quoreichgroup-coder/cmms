const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const exports = {};
  const source = ts.transpileModule(
    fs.readFileSync('src/hooks/stompResponse.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText;
  vm.runInNewContext(source, { exports, setTimeout, clearTimeout });
  return exports;
}

test('STOMP completion resolves and releases the subscription', async () => {
  const { waitForStompMessage } = load();
  let receive;
  let unsubscribed = false;
  const pending = waitForStompMessage(
    {
      subscribe: (_destination, callback) => {
        receive = callback;
        return { unsubscribe: () => { unsubscribed = true; } };
      }
    },
    '/user/example/imports/id',
    1000
  );

  receive({ body: '{"created":1,"updated":0}' });
  assert.equal((await pending.message).body, '{"created":1,"updated":0}');
  assert.equal(unsubscribed, true);
});

test('missing STOMP completion rejects and releases the subscription', async () => {
  const { waitForStompMessage } = load();
  let unsubscribed = false;
  const pending = waitForStompMessage(
    { subscribe: () => ({ unsubscribe: () => { unsubscribed = true; } }) },
    '/user/example/exports/id',
    5
  );

  await assert.rejects(pending.message, /Vérifiez les données avant de réessayer/);
  assert.equal(unsubscribed, true);
});

test('cancelling the request rejects its pending wait and unsubscribes', async () => {
  const { waitForStompMessage } = load();
  let unsubscribed = false;
  const pending = waitForStompMessage(
    { subscribe: () => ({ unsubscribe: () => { unsubscribed = true; } }) },
    '/user/example/imports/id',
    1000
  );

  pending.cancel();
  await assert.rejects(pending.message, /annulée/);
  assert.equal(unsubscribed, true);
});
