const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const repositoryRoot = path.resolve(__dirname, '../..');
const clientFiles = [
  'frontend/src/layouts/ExtendedSidebarLayout/Header/Buttons/Notifications/index.tsx',
  'frontend/src/hooks/useImport.ts',
  'frontend/src/hooks/useExport.ts'
];

test('Web STOMP consumers use the shared reconnecting client', () => {
  for (const relativePath of clientFiles) {
    const source = fs.readFileSync(
      path.join(repositoryRoot, relativePath),
      'utf8'
    );
    assert.match(source, /createAuthenticatedStompClient/);
    assert.doesNotMatch(source, /Stomp\.over\(/);
    assert.match(source, /client\.activate\(\)/);
    assert.match(source, /client\.deactivate\(\)/);
  }
});

test('shared Web STOMP client refreshes auth headers before reconnecting safely', () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, 'frontend/src/utils/authenticatedStompClient.ts'),
    'utf8'
  );
  assert.match(source, /new Client\(/);
  assert.match(source, /webSocketFactory:\s*\(\)\s*=>\s*new SockJS/);
  assert.match(source, /reconnectDelay:\s*5000/);
  assert.match(source, /debug:\s*\(\)\s*=>\s*undefined/);
  assert.match(source, /client\.beforeConnect\s*=\s*async/);
  assert.match(source, /client\.connectHeaders\s*=\s*token \?/);
  assert.match(source, /\{ token \} : \{\}/);
});

test('STOMP CONNECT headers use the latest JWT each time beforeConnect runs', async () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, 'frontend/src/utils/authenticatedStompClient.ts'),
    'utf8'
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    }
  }).outputText;
  let clientOptions;
  class FakeClient {
    constructor(options) {
      clientOptions = options;
      this.connectHeaders = {};
    }
  }
  class FakeSockJS {
    constructor(url) {
      this.url = url;
    }
  }
  const testExports = {};
  const localRequire = (id) => {
    if (id === '@stomp/stompjs') return { Client: FakeClient };
    if (id === 'sockjs-client') return FakeSockJS;
    if (id === '../config') return { apiUrl: 'https://qpm.example/' };
    throw new Error(`Unexpected test dependency: ${id}`);
  };
  new Function('require', 'exports', compiled)(localRequire, testExports);

  const previousWindow = global.window;
  let currentToken = 'jwt-before-refresh';
  global.window = {
    localStorage: { getItem: () => currentToken }
  };
  try {
    const client = testExports.createAuthenticatedStompClient();
    assert.equal(clientOptions.reconnectDelay, 5000);
    assert.equal(clientOptions.debug(), undefined);
    assert.equal(
      clientOptions.webSocketFactory().url,
      'https://qpm.example/ws'
    );

    await client.beforeConnect();
    assert.deepEqual(client.connectHeaders, { token: 'jwt-before-refresh' });

    currentToken = 'jwt-after-refresh';
    await client.beforeConnect();
    assert.deepEqual(client.connectHeaders, { token: 'jwt-after-refresh' });
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});

test('Mobile STOMP continues to use a reconnectable SockJS factory with logs disabled', () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, 'mobile/contexts/AuthContext.tsx'),
    'utf8'
  );
  assert.match(source, /Stomp\.over\(\(\)\s*=>\s*new SockJS\(/);
  assert.match(source, /client\.debug\s*=\s*\(\)\s*=>\s*undefined/);
  assert.match(source, /client\.reconnectDelay\s*=\s*5000/);
});
