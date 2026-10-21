const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const filterSource = fs.readFileSync(
  path.join(__dirname, '../src/content/own/WorkOrders/Filters/MoreFilters.tsx'),
  'utf8'
);
const workOrderService = fs.readFileSync(
  path.join(
    __dirname,
    '../../api/src/main/java/com/grash/service/WorkOrderService.java'
  ),
  'utf8'
);

test('work order advanced filters expose the request creator using the existing API field', () => {
  assert.match(
    filterSource,
    /accessor:\s*'requestedBy',[\s\S]*?fieldName:\s*'parentRequest\.createdBy',[\s\S]*?type:\s*'array'/
  );
  assert.match(
    filterSource,
    /name:\s*'requestedBy',[\s\S]*?label:\s*t\('requested_by'\),[\s\S]*?type2:\s*'user',[\s\S]*?multiple:\s*true/
  );
  assert.match(
    filterSource,
    /getLabelAndValue\([\s\S]*?allUsersMini\.length\s*\?\s*allUsersMini\s*:\s*usersMini,[\s\S]*?'parentRequest\.createdBy'/
  );
  assert.match(
    filterSource,
    /fieldsInUse\.has\('parentRequest\.createdBy'\)[\s\S]*?getUsersMini\(true\)/
  );
  const userSelect = fs.readFileSync(
    path.join(
      __dirname,
      '../src/content/own/components/form/CustomSelect2.tsx'
    ),
    'utf8'
  );
  assert.match(
    userSelect,
    /field\.includeRequesters\s*\?\s*allUsersMini\s*:\s*usersMini/
  );
  assert.match(filterSource, /'parentRequest\.createdBy'/);
  assert.match(workOrderService, /\.field\("parentRequest\.createdBy"\)/);
});
