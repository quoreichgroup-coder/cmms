const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/layouts/ExtendedSidebarLayout/Header/Buttons/Notifications/index.tsx'
  ),
  'utf8'
);
const scrollbar = fs.readFileSync(
  path.join(__dirname, '../src/components/Scrollbar/index.tsx'),
  'utf8'
);

test('notification pagination listens to the actual scroll container', () => {
  assert.match(scrollbar, /onScroll\?:\s*UIEventHandler<HTMLDivElement>/);
  assert.match(source, /<Scrollbar onScroll=\{onScroll\}>/);
  assert.match(source, /<List sx=\{\{ position: 'relative' \}\}>/);
  assert.doesNotMatch(source, /<List onScroll=\{onScroll\}/);
});

test('notification pagination handles fractional scroll positions and stops at the last page', () => {
  assert.match(source, /scrollHeight - scrollTop - clientHeight <= 2/);
  assert.match(
    source,
    /atBottom && !loadingGet && !lastPage[\s\S]*?getMoreNotifications\(criteria, currentPageNum \+ 1\)/
  );
});

test('notification read failures are shown and keep the popover open for retry', () => {
  assert.match(source, /const onReadNotification = async/);
  assert.match(
    source,
    /await dispatch\(editNotification\([\s\S]*?\{ seen: true \}\)\)/
  );
  assert.match(
    source,
    /catch \(error\) \{\s*showSnackBar\(getErrorMessage\(error\), 'error'\);\s*\}/
  );
  assert.doesNotMatch(source, /\.finally\(handleClose\)/);
});

test('mark-all-as-read failures are handled through the shared snackbar', () => {
  assert.match(source, /const handleReadAll = async/);
  assert.match(source, /await dispatch\(readAllNotifications\(\)\)/);
  assert.match(source, /onClick=\{\(\) => void handleReadAll\(\)\}/);
});

test('notifications reload when the authenticated account changes', () => {
  assert.match(
    source,
    /if \(user\?\.id\) dispatch\(getNotifications\(criteria\)\)/
  );
  assert.match(source, /\}, \[user\?\.id, dispatch\]\);/);
});

test('clicking an already-read informational notification closes the popover', () => {
  assert.match(
    source,
    /if \(notification\.seen\) \{\s*if \(url\) \{\s*navigate\(url\);\s*\}\s*handleClose\(\);\s*return;/
  );
});

test('messages from a notification socket are ignored after account teardown', () => {
  assert.match(
    source,
    /const client = createAuthenticatedStompClient\(\);\s*let isActive = true;\s*client\.onConnect = \(\) => \{\s*if \(!isActive\) return;\s*client\.subscribe\([\s\S]*?if \(!isActive\) return;[\s\S]*?return \(\) => \{\s*isActive = false;/
  );
});
