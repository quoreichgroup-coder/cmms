const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const sourcePath = path.resolve(__dirname, '../src/utils/pmPlanConfiguration.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }
}).outputText;
const utilityModule = new Module(sourcePath, module);
utilityModule.filename = sourcePath;
utilityModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
utilityModule._compile(compiled, sourcePath);
const { parsePMPlanConfiguration, validatePMPlanConfiguration } = utilityModule.exports;
const taskListOptionsPath = path.resolve(__dirname, '../src/utils/maintenanceTaskListOptions.ts');
const taskListOptionsCompiled = ts.transpileModule(
  fs.readFileSync(taskListOptionsPath, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }
).outputText;
const taskListOptionsModule = new Module(taskListOptionsPath, module);
taskListOptionsModule.filename = taskListOptionsPath;
taskListOptionsModule.paths = Module._nodeModulePaths(path.dirname(taskListOptionsPath));
taskListOptionsModule._compile(taskListOptionsCompiled, taskListOptionsPath);
const { getCompatibleMaintenanceTaskLists } = taskListOptionsModule.exports;
const pmFormSource = fs.readFileSync(
  path.resolve(__dirname, '../src/content/own/PreventiveMaintenance/index.tsx'),
  'utf8'
);
const pmConfigurationEditorSource = fs.readFileSync(
  path.resolve(__dirname, '../src/content/own/PreventiveMaintenance/PMPlanConfigurationEditor.tsx'),
  'utf8'
);

const validStrategy = {
  mode: 'STRATEGY',
  packages: [
    { code: 'routine', name: 'Routine', everyBaseCycles: 1, taskBaseIds: [11] },
    { code: 'overhaul', name: 'Overhaul', everyBaseCycles: 12, taskBaseIds: [12] }
  ]
};

const validMultiCounter = {
  mode: 'MULTI_COUNTER',
  combination: 'AND',
  cycles: [
    { code: 'hours', name: 'Hours', dimension: 'METER', meterId: 21, referenceValue: 0, interval: 100, taskBaseIds: [31] },
    { code: 'starts', name: 'Starts', dimension: 'METER', meterId: 22, referenceValue: 10, interval: 500, taskBaseIds: [32] }
  ]
};

test('accepts a single plan and strategy packages with selected tasks', () => {
  assert.equal(validatePMPlanConfiguration({ mode: 'SINGLE' }), null);
  assert.equal(validatePMPlanConfiguration(validStrategy), null);
});

test('rejects incomplete packages and duplicate strategy codes', () => {
  assert.equal(validatePMPlanConfiguration({ mode: 'STRATEGY', packages: [] }), 'pm_validation_add_package');
  assert.equal(validatePMPlanConfiguration({
    mode: 'STRATEGY',
    packages: [
      { code: 'same', name: 'One', everyBaseCycles: 1, taskBaseIds: [1] },
      { code: 'same', name: 'Two', everyBaseCycles: 4, taskBaseIds: [2] }
    ]
  }), 'pm_validation_unique_codes');
  assert.equal(validatePMPlanConfiguration({
    mode: 'STRATEGY',
    packages: [{ code: 'routine', name: 'Routine', everyBaseCycles: 0, taskBaseIds: [1] }]
  }), 'pm_validation_package_interval');
});

test('requires two complete multi-counter cycles and a combination rule', () => {
  assert.equal(validatePMPlanConfiguration({ mode: 'MULTI_COUNTER', combination: 'OR', cycles: [] }), 'pm_validation_two_cycles');
  assert.equal(validatePMPlanConfiguration({
    ...validMultiCounter,
    combination: undefined
  }), 'pm_validation_combination');
  assert.equal(validatePMPlanConfiguration(validMultiCounter), null);
});

test('validates counter interval, reference, end reading and task selection', () => {
  const withCycleChange = (patch) => ({
    ...validMultiCounter,
    cycles: [{ ...validMultiCounter.cycles[0], ...patch }, validMultiCounter.cycles[1]]
  });
  assert.equal(validatePMPlanConfiguration(withCycleChange({ interval: 0 })), 'pm_validation_cycle_interval');
  assert.equal(validatePMPlanConfiguration(withCycleChange({ referenceValue: -1 })), 'pm_validation_cycle_reference');
  assert.equal(validatePMPlanConfiguration(withCycleChange({ endValue: 0 })), 'pm_validation_cycle_end');
  assert.equal(validatePMPlanConfiguration(withCycleChange({ taskBaseIds: [] })), 'pm_validation_cycle_tasks');
});

test('parses a plan configuration from the form value', () => {
  assert.deepEqual(parsePMPlanConfiguration(JSON.stringify(validStrategy)), validStrategy);
  assert.equal(parsePMPlanConfiguration(JSON.stringify({
    mode: 'SINGLE',
    maintenanceTaskListId: 481
  })).maintenanceTaskListId, 481);
  assert.throws(() => parsePMPlanConfiguration('{broken'), SyntaxError);
});

test('filters PM task-list choices by status, validity, and SAP reference object', () => {
  const options = [
    { id: 1, taskListType: 'GENERAL', status: 'ACTIVE', validFrom: '2026-01-01', validTo: null },
    { id: 2, taskListType: 'EQUIPMENT', status: 'ACTIVE', assetId: 42 },
    { id: 3, taskListType: 'FUNCTIONAL_LOCATION', status: 'ACTIVE', locationId: 9 },
    { id: 4, taskListType: 'FUNCTIONAL_LOCATION', status: 'ACTIVE', locationId: 12 },
    { id: 5, taskListType: 'GENERAL', status: 'DRAFT' },
    { id: 6, taskListType: 'GENERAL', status: 'ACTIVE', validTo: '2026-10-29' },
    { id: 7, taskListType: 'GENERAL', status: 'ACTIVE', validFrom: '2026-10-31' }
  ];

  const result = getCompatibleMaintenanceTaskLists(options, {
    assetId: 42,
    assetLocationId: 9,
    locationId: null,
    today: '2026-10-30'
  });

  assert.deepEqual(result.map(({ id }) => id), [1, 2, 3]);
});

test('functional-location task lists match the plan location or the selected equipment location', () => {
  const options = [
    { id: 8, taskListType: 'FUNCTIONAL_LOCATION', status: 'ACTIVE', locationId: 9 },
    { id: 9, taskListType: 'FUNCTIONAL_LOCATION', status: 'ACTIVE', locationId: 12 }
  ];

  const result = getCompatibleMaintenanceTaskLists(options, {
    assetId: 42,
    assetLocationId: 9,
    locationId: 12,
    today: '2026-10-30'
  });

  assert.deepEqual(result.map(({ id }) => id), [8, 9]);
});

test('PM form places the Maintenance Task List beside the distinct work-order checklist selector', () => {
  const taskListFieldIndex = pmFormSource.indexOf("name: 'maintenanceTaskListEditor'");
  const checklistFieldIndex = pmFormSource.indexOf("name: 'tasks'");

  assert.ok(taskListFieldIndex >= 0);
  assert.ok(checklistFieldIndex > taskListFieldIndex);
  assert.match(pmFormSource, /renderCustomField=\{\(field, values, setFieldValue\)/);
  assert.match(pmFormSource, /pm_work_order_checklists_help/);
  assert.match(pmConfigurationEditorSource, /const taskListOptions = taskLists/);
  assert.match(pmConfigurationEditorSource, /getOptionDisabled=\{\(option\) => !selectableTaskListIds\.has\(option\.id\)\}/);
  assert.match(pmConfigurationEditorSource, /pm_task_list_option_incompatible/);
});
