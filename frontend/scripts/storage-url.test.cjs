const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadStorageUrl(apiUrl, origin) {
  const exports = {};
  const source = fs.readFileSync('src/utils/storageUrl.ts', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    window: { location: { origin } },
    URL,
    require(id) {
      if (id === '../config') return { apiUrl };
      return require(id);
    }
  });
  return exports;
}

test('storage image URLs use the current ingress and retain signed query parameters', () => {
  const { normalizeStorageUrl } = loadStorageUrl(
    '/api/',
    'https://cmms.example.com'
  );
  const signedUrl =
    'http://169.58.86.7:3000/storage/atlas-bucket/images/photo.png?X-Amz-Signature=abc&X-Amz-Expires=300';

  assert.equal(
    normalizeStorageUrl(signedUrl),
    'https://cmms.example.com/storage/atlas-bucket/images/photo.png?X-Amz-Signature=abc&X-Amz-Expires=300'
  );
});

test('already same-origin storage URLs remain unchanged', () => {
  const { normalizeStorageUrl } = loadStorageUrl(
    '/api/',
    'http://localhost:3000'
  );
  const signedUrl =
    'http://localhost:3000/storage/atlas-bucket/images/photo.png?signature=abc';

  assert.equal(normalizeStorageUrl(signedUrl), signedUrl);
});

test('external API deployments retain their configured storage origin', () => {
  const { normalizeStorageUrl } = loadStorageUrl(
    'https://api.example.com/api/',
    'https://cmms.example.com'
  );
  const signedUrl =
    'https://storage.example.com/storage/atlas-bucket/images/photo.png?signature=abc';

  assert.equal(normalizeStorageUrl(signedUrl), signedUrl);
});

test('unrelated URLs and nested file DTOs are handled safely', () => {
  const { normalizeStorageUrls } = loadStorageUrl(
    '/api/',
    'https://cmms.example.com'
  );
  const payload = {
    image: {
      url: 'http://169.58.86.7:3000/storage/atlas-bucket/photo.png?signature=abc'
    },
    documentation: {
      url: 'https://docs.example.com/guide'
    },
    thumbnailUrl:
      'http://169.58.86.7:3000/storage/atlas-bucket/thumb.jpg?signature=def'
  };

  assert.deepEqual(JSON.parse(JSON.stringify(normalizeStorageUrls(payload))), {
    image: {
      url: 'https://cmms.example.com/storage/atlas-bucket/photo.png?signature=abc'
    },
    documentation: {
      url: 'https://docs.example.com/guide'
    },
    thumbnailUrl:
      'https://cmms.example.com/storage/atlas-bucket/thumb.jpg?signature=def'
  });
});
