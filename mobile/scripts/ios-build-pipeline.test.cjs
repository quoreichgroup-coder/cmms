const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('GitHub Actions runs Fastlane from the directory containing its Fastfile', () => {
  const workflow = fs.readFileSync(
    '../.github/workflows/ios-build.yml',
    'utf8'
  );
  const fastfile = fs.readFileSync('ios/fastlane/Fastfile', 'utf8');

  assert.equal(
    (workflow.match(/working-directory: mobile\/ios/g) || []).length,
    2
  );
  assert.match(workflow, /run: bundle exec fastlane ios verify_build/);
  assert.match(workflow, /run: bundle exec fastlane ios build_adhoc/);
  assert.match(fastfile, /default_platform\(:ios\)/);
});

test('Jenkins runs both shared Fastlane lanes from mobile/ios', () => {
  const jenkinsfile = fs.readFileSync('../Jenkinsfile', 'utf8');

  assert.equal((jenkinsfile.match(/dir\('mobile\/ios'\)/g) || []).length, 2);
  assert.match(jenkinsfile, /bundle exec fastlane ios verify_build/);
  assert.match(jenkinsfile, /bundle exec fastlane ios build_adhoc/);
});
