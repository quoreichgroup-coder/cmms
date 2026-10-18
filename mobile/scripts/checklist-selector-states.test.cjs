const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'screens/modals/SelectChecklistsModal.tsx'),
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

test('checklist selector shows distinct initial loading, empty and error states', () => {
  assert.match(source, /loading && !checklists\.length/);
  assert.match(source, /loadError && !checklists\.length/);
  assert.match(source, /mode="error"[\s\S]*?checklists_load_error/);
  assert.match(source, /filteredChecklists\.length === 0/);
  assert.match(
    english,
    /checklists_load_error:[\s\S]*Could not load checklists/
  );
  assert.match(
    french,
    /checklists_load_error:[\s\S]*Impossible de charger les listes de contrôle/
  );
});

test('cached checklists remain visible with a retry banner after refresh failure', () => {
  assert.match(source, /loadError && checklists\.length > 0/);
  assert.match(
    source,
    /mode="banner"[\s\S]*?onRetry=\{\(\) => void loadChecklists\(\)\}/
  );
  assert.match(source, /data=\{filteredChecklists\}/);
  assert.doesNotMatch(source, /ListFooterComponent/);
});

test('checklist modal loading is local and duplicate fetch taps are coalesced', () => {
  assert.match(source, /const \[loading, setLoading\] = useState\(true\)/);
  assert.match(source, /const loadingRef = useRef\(false\)/);
  assert.match(source, /if \(loadingRef\.current\) return/);
  assert.match(source, /refreshing=\{loading\}/);
  assert.doesNotMatch(source, /loadingGet/);
});

test('checklist selection still appends generated tasks and returns to its caller', () => {
  assert.match(
    source,
    /onChange\(\[\s*\.\.\.selected,[\s\S]*getTaskFromTaskBase\(taskBase\)/
  );
  assert.match(source, /navigation\.pop\(2\)/);
});
