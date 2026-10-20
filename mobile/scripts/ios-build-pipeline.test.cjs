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

test('production EAS updates require credentials and skip native runtime changes', () => {
  const workflow = fs.readFileSync(
    '../.github/workflows/mobile-update.yml',
    'utf8'
  );

  assert.match(workflow, /EXPO_TOKEN:\s*\$\{\{\s*secrets\.EXPO_TOKEN\s*\}\}/);
  assert.match(workflow, /mobile\/android mobile\/ios/);
  assert.match(workflow, /mobile\/app\.config\.ts mobile\/app\.json/);
  assert.match(
    workflow,
    /mobile\/package\.json mobile\/package-lock\.json mobile\/plugins/
  );
  assert.match(workflow, /echo "publish=false" >> "\$GITHUB_OUTPUT"/);
  assert.match(workflow, /eas update --channel production/);

  for (const stepName of [
    'Setup Node',
    'Setup EAS',
    'Install dependencies',
    'Publish update'
  ]) {
    const stepStart = workflow.indexOf(`- name: ${stepName}`);
    assert.notEqual(stepStart, -1, `${stepName} step should exist`);
    const nextStep = workflow.indexOf('\n      - name:', stepStart + 1);
    const step = workflow.slice(
      stepStart,
      nextStep === -1 ? undefined : nextStep
    );
    assert.match(step, /if: steps\.gate\.outputs\.publish == 'true'/);
  }
});
