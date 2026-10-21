const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/content/own/Settings/Features/Workflows/index.tsx'
  ),
  'utf8'
);

test('workflow checklist action selects a real checklist template', () => {
  assert.match(source, /ADD_CHECKLIST:\s*\{\s*type:\s*'select'/);
  assert.match(source, /items:\s*checklists/);
  assert.match(source, /accessor:\s*'checklist'/);
  assert.match(source, /dispatch\(getChecklists\(\)\)/);
  assert.match(source, /apiFormatter:\s*objectFormatter/);
});

test('request checklist action is offered only after approval', () => {
  const createdRequest = source.match(
    /REQUEST_CREATED:\s*\{([\s\S]*?)\n\s*\},/
  );
  const approvedRequest = source.match(
    /REQUEST_APPROVED:\s*\{([\s\S]*?)\n\s*\},/
  );
  const rejectedRequest = source.match(
    /REQUEST_REJECTED:\s*\{([\s\S]*?)\n\s*\},/
  );

  assert.ok(createdRequest);
  assert.ok(approvedRequest);
  assert.ok(rejectedRequest);
  assert.match(
    createdRequest[1],
    /filter\(\(action\) => action !== 'ADD_CHECKLIST'\)/
  );
  assert.match(approvedRequest[1], /actions:\s*requestActions/);
  assert.match(
    rejectedRequest[1],
    /filter\(\(action\) => action !== 'ADD_CHECKLIST'\)/
  );
});

test('workflow editor state is cleared after success, cancel, and before a new workflow', () => {
  assert.match(source, /const resetEditor = \(\) => \{/);
  assert.match(source, /setCurrentTitle\(''\)/);
  assert.match(source, /setCurrentWorkflowId\(undefined\)/);
  assert.match(source, /setCurrentConditions\(\[\]\)/);
  assert.match(
    source,
    /type: mainConfig\[defaultMainCondition\]\.actions\[0\]/
  );
  assert.match(
    source,
    /onWorkflowCreationSuccess = \(\) => \{[\s\S]*?resetEditor\(\);[\s\S]*?setView\('list'\)/
  );
  assert.match(
    source,
    /onWorkflowEditSuccess = \(\) => \{[\s\S]*?resetEditor\(\);[\s\S]*?setView\('list'\)/
  );
  assert.match(
    source,
    /onClick=\{\(\) => \{\s*resetEditor\(\);\s*setView\('create'\);/
  );
});
