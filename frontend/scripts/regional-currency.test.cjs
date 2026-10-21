const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/utils/regionalCurrency.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const testModule = { exports: {} };
vm.runInNewContext(compiled, {
  module: testModule,
  exports: testModule.exports
});
const { isUemoaCountry } = testModule.exports;

for (const country of ['BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG']) {
  assert.equal(isUemoaCountry(country), true, `${country} should be UEMOA`);
  assert.equal(isUemoaCountry(` ${country.toLowerCase()} `), true);
}

for (const country of ['FR', 'GH', 'NG', '', null, undefined]) {
  assert.equal(
    isUemoaCountry(country),
    false,
    `${country} should not be UEMOA`
  );
}

console.log('UEMOA country to currency recommendation mapping passed.');
