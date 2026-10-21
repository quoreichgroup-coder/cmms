const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const screen = fs.readFileSync(
  path.join(__dirname, '..', 'screens/assets/AssetsScreen.tsx'),
  'utf8'
);

test('a new equipment search invalidates pagination error and lock updates', () => {
  assert.match(
    screen,
    /const paginationRequestSequence = useRef\(0\);[\s\S]*?beginRequest\(paginationRequestSequence\);\s*listPageRequestInProgress\.current = false;/
  );

  const pagination = screen.match(
    /const loadNextAssetPage = useCallback\([\s\S]*?\n  const loadAssetChildren/
  )?.[0];
  assert.ok(pagination, 'expected the equipment pagination callback');
  assert.match(
    pagination,
    /const firstPageSequence = listRequestSequence\.current;\s*const paginationSequence = beginRequest\(paginationRequestSequence\);/
  );
  assert.equal(
    (
      pagination.match(
        /isCurrentRequest\(firstPageSequence, listRequestSequence\)/g
      ) || []
    ).length,
    2,
    'both stale error state and stale finalizers must be ignored'
  );
  assert.equal(
    (
      pagination.match(
        /isCurrentRequest\(paginationSequence, paginationRequestSequence\)/g
      ) || []
    ).length,
    2
  );
});

test('old pagination failures are stale after a first-page search starts', () => {
  const { beginRequest, isCurrentRequest } = mobileRuntime().load(
    'utils/requestSequence.ts'
  );
  const firstPage = { current: 0 };
  const pagination = { current: 0 };

  const oldFirstPage = beginRequest(firstPage);
  const oldPagination = beginRequest(pagination);
  beginRequest(firstPage);
  beginRequest(pagination);

  assert.equal(isCurrentRequest(oldFirstPage, firstPage), false);
  assert.equal(isCurrentRequest(oldPagination, pagination), false);
});
