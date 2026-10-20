const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '../..');
const clientFiles = [
  'frontend/src/layouts/ExtendedSidebarLayout/Header/Buttons/Notifications/index.tsx',
  'frontend/src/hooks/useImport.ts',
  'frontend/src/hooks/useExport.ts',
  'mobile/contexts/AuthContext.tsx'
];

test('all STOMP clients disable protocol logging before sending JWT headers', () => {
  for (const relativePath of clientFiles) {
    const source = fs.readFileSync(
      path.join(repositoryRoot, relativePath),
      'utf8'
    );
    const clientCreations = [...source.matchAll(/Stomp\.over\(/g)];
    assert.ok(
      clientCreations.length > 0,
      `${relativePath} must create a STOMP client`
    );

    for (const [index, creation] of clientCreations.entries()) {
      const clientCreation = creation.index;
      const nextClientCreation =
        clientCreations[index + 1]?.index ?? source.length;
      const connectCall = source.indexOf('.connect(', clientCreation);
      const debugDisable = source.indexOf(
        'client.debug = () => undefined;',
        clientCreation
      );
      assert.ok(
        connectCall !== -1 && connectCall < nextClientCreation,
        `${relativePath} must connect each STOMP client`
      );
      assert.ok(
        debugDisable > clientCreation && debugDisable < connectCall,
        `${relativePath} must disable STOMP protocol logging before connect()`
      );
    }
  }
});
