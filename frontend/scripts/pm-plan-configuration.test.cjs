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
  assert.throws(() => parsePMPlanConfiguration('{broken'), SyntaxError);
});
