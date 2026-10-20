const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');

function extractPolicy(text, pattern) {
  const match = text.match(pattern);
  assert.ok(match, 'Content-Security-Policy header must be configured');
  return match[1].trim().replace(/^"|"$/g, '');
}

test('production CSP blocks inline scripts and unsafe object embedding', () => {
  const nginx = fs.readFileSync(path.join(root, 'nginx.conf'), 'utf8');
  const headers = fs.readFileSync(
    path.join(root, 'frontend/public/_headers'),
    'utf8'
  );
  const nginxPolicy = extractPolicy(
    nginx,
    /add_header Content-Security-Policy\s+"([^"]+)" always;/
  );
  const staticPolicy = extractPolicy(
    headers,
    /Content-Security-Policy:\s*([^\n]+)/
  );

  for (const policy of [nginxPolicy, staticPolicy]) {
    const scriptPolicy = policy
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('script-src '));
    assert.ok(scriptPolicy, 'script-src directive must be present');
    assert.ok(
      !scriptPolicy.includes("'unsafe-inline'"),
      'inline scripts must not be allowed'
    );
    assert.ok(
      !scriptPolicy.includes("'unsafe-eval'"),
      'runtime code evaluation must not be allowed'
    );
    assert.match(policy, /(?:^|;\s*)default-src 'self'(?:;|$)/);
    assert.match(policy, /(?:^|;\s*)object-src 'none'(?:;|$)/);
    assert.match(policy, /(?:^|;\s*)frame-ancestors 'none'(?:;|$)/);
    assert.match(policy, /(?:^|;\s*)base-uri 'self'(?:;|$)/);
    assert.match(policy, /(?:^|;\s*)form-action 'self'(?:;|$)/);
  }

  assert.equal(
    nginxPolicy,
    staticPolicy,
    'Docker nginx and static-host policies must remain aligned'
  );

  const html = fs.readFileSync(
    path.join(root, 'frontend/public/index.html'),
    'utf8'
  );
  const scriptTags = html.match(/<script\b[^>]*>/gi) || [];
  assert.ok(scriptTags.length > 0, 'the HTML should load its runtime script');
  assert.ok(
    scriptTags.every((tag) => /\bsrc\s*=/.test(tag)),
    'HTML scripts must be loaded from an allowed source, not inline'
  );
});
