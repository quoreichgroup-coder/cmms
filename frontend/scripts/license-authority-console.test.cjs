const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(
  path.join(__dirname, '../../license-authority/src/main/resources/static/index.html'),
  'utf8'
);

function consolePage() {
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    beforeParse(window) {
      window.fetch = async () => ({ ok: true, status: 200, json: async () => [] });
    }
  });
  dom.window.document.getElementById('base').value = 'http://localhost';
  dom.window.document.getElementById('token').value = 'ephemeral-test-token';
  return dom;
}

async function waitUntil(condition) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (condition()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.fail('Console did not finish its asynchronous operation');
}

test('issuing a license resets the form and refreshes the list after the event finishes', async () => {
  const dom = consolePage();
  try {
    const { window } = dom;
    const document = window.document;
    await document.getElementById('connect').onclick();
    const form = document.getElementById('issue');
    form.elements.customerName.value = 'Test customer';
    form.elements.startsAt.value = '2026-10-03T12:30';
    form.elements.expiresAt.value = '2027-10-03T12:30';
    let issuedBody;
    let listRequests = 0;
    window.fetch = async (url, options) => {
      if (options.method === 'POST') {
        issuedBody = JSON.parse(options.body);
        return { ok: true, status: 201, json: async () => ({ licenseKey: 'QPM-test-only' }) };
      }
      listRequests++;
      return { ok: true, status: 200, json: async () => [{
        id: 'test-id', customerName: 'Test customer', edition: 'ENTERPRISE',
        licenseType: 'SUBSCRIPTION', status: 'ACTIVE', seatsFull: 10, seatsLight: 25,
        startsAt: issuedBody.startsAt, expiresAt: issuedBody.expiresAt
      }] };
    };
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    assert.equal(event.currentTarget, null);
    await waitUntil(() => listRequests === 1);
    assert.equal(form.elements.customerName.value, '');
    assert.match(document.getElementById('issued').textContent, /QPM-test-only/);
    assert.match(document.getElementById('licenses').textContent, /Test customer/);
    assert.equal(document.getElementById('status').classList.contains('error'), false);
    assert.equal(issuedBody.startsAt, '2026-10-03T12:30:00.000Z');
    assert.equal(issuedBody.expiresAt, '2027-10-03T12:30:00.000Z');
  } finally {
    dom.window.close();
  }
});

test('UTC field defaults and conversions do not use the browser timezone', () => {
  const dom = consolePage();
  try {
    const { window } = dom;
    const currentUtc = new Date().toISOString().slice(0, 16);
    assert.equal(window.document.getElementById('issue').elements.startsAt.value, currentUtc);
    assert.equal(window.eval("iso('2026-07-03T12:30')"), '2026-07-03T12:30:00.000Z');
    assert.equal(window.eval("iso('2026-12-03T12:30')"), '2026-12-03T12:30:00.000Z');
    assert.equal(window.eval("iso('')"), null);
  } finally {
    dom.window.close();
  }
});
