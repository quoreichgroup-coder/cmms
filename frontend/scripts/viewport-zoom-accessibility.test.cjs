const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('web viewport does not prevent browser zoom', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/i);

  assert.ok(viewport, 'viewport meta tag is present');
  assert.match(viewport[1], /width=device-width/);
  assert.doesNotMatch(viewport[1], /maximum-scale\s*=\s*1(?:\.0)?\b/i);
  assert.doesNotMatch(
    viewport[1],
    /user-scalable\s*=\s*no|user-scalable\s*=\s*0/i
  );
});
