const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'screens/modals/SelectTasksModal.tsx'),
  'utf8'
);
const english = fs.readFileSync(
  path.join(__dirname, '..', 'i18n/translations/en.ts'),
  'utf8'
);
const french = fs.readFileSync(
  path.join(__dirname, '..', 'i18n/translations/fr.ts'),
  'utf8'
);

test('dynamic task options keep stable identity while editing and removing rows', () => {
  assert.match(
    source,
    /interface TaskOption\s*\{\s*id: number;\s*value: string;/
  );
  assert.match(source, /key=\{option\.id\}/);
  assert.match(source, /option\.id === optionId/);
  assert.match(
    source,
    /current\.filter\(\(option\) => option\.id !== optionId\)/
  );
});

test('task option fields and removal controls have localized accessible labels', () => {
  assert.match(source, /accessibilityLabel=\{t\('enter_task_name'\)\}/);
  assert.match(source, /accessibilityLabel=\{t\('task_option_number'/);
  assert.match(source, /accessibilityLabel=\{t\('remove_task_option'/);
  assert.match(source, /accessibilityRole="button"/);
  assert.match(english, /task_option_number: 'Option \{\{number\}\}'/);
  assert.match(english, /remove_task_option: 'Remove option \{\{number\}\}'/);
  assert.match(french, /task_option_number: 'Option \{\{number\}\}'/);
  assert.match(
    french,
    /remove_task_option: ['"]Supprimer l’option \{\{number\}\}['"]/
  );
});

test('manual task editor keeps option actions reachable with the keyboard open', () => {
  assert.match(
    source,
    /<KeyboardAvoidingView[\s\S]*?behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/
  );
  assert.match(source, /<ScrollView keyboardShouldPersistTaps="handled">/);
});

test('manual task payload continues sending the selected option labels', () => {
  assert.match(
    source,
    /options: options\.map\(\(option\) => \(\{\s*id: randomInt\(\),\s*label: option\.value/s
  );
});
