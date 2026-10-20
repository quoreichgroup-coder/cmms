const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../..');
const workflow = fs.readFileSync(
  path.join(repoRoot, '.github/workflows/main-ci.yml'),
  'utf8'
);
const compose = fs.readFileSync(
  path.join(repoRoot, 'docker-compose.yml'),
  'utf8'
);

test('self-host smoke test runs the exact SHA-tagged images without building', () => {
  assert.match(
    compose,
    /image:\s*\$\{QPM_API_IMAGE:-atlas-cmms-backend:local\}/
  );
  assert.match(
    compose,
    /image:\s*\$\{QPM_WEB_IMAGE:-atlas-cmms-frontend:local\}/
  );
  assert.match(
    workflow,
    /QPM_API_IMAGE:\s*intelloop\/atlas-cmms-backend:\$\{\{ github\.sha \}\}/
  );
  assert.match(
    workflow,
    /QPM_WEB_IMAGE:\s*intelloop\/atlas-cmms-frontend:\$\{\{ github\.sha \}\}/
  );
  assert.match(workflow, /smoke: \$\{\{ steps\.out\.outputs\.smoke \}\}/);
  assert.match(workflow, /outputs\.smoke == 'true'/);
  assert.match(
    workflow,
    /docker compose --env-file \.env\.example up --no-build -d --wait/
  );
  assert.doesNotMatch(workflow, /\/tmp\/selfhost/);
  assert.ok(fs.existsSync(path.join(repoRoot, 'Caddyfile')));
  assert.match(compose, /\.\/Caddyfile:\/etc\/caddy\/Caddyfile:ro/);
});

test('VPS deployment requires smoke success and uses Docker Hub image names', () => {
  const deployJob = workflow.split('  deploy-vps:')[1];
  assert.ok(deployJob, 'deploy-vps job must exist');
  assert.match(deployJob, /needs:.*selfhost-smoke-test/);
  assert.match(deployJob, /needs\.selfhost-smoke-test\.result == 'success'/);
  assert.match(
    deployJob,
    /QPM_API_IMAGE=intelloop\/atlas-cmms-backend:latest QPM_WEB_IMAGE=intelloop\/atlas-cmms-frontend:latest docker compose pull api frontend/
  );
  assert.match(deployJob, /Check backend health through nginx[\s\S]*Mark successfully deployed images/);
  assert.doesNotMatch(
    workflow.split('  push-backend-docker:')[1].split('  deploy-koyeb:')[0],
    /Mark backend image as deployed/
  );
});
