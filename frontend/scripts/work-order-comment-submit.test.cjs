const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(
  'src/content/own/WorkOrders/Details/CommentsSection.tsx',
  'utf8'
);
const submitHandler = source.slice(
  source.indexOf('const handleSubmit = async () => {'),
  source.indexOf(
    '\n  const handleFileDrop',
    source.indexOf('const handleSubmit')
  )
);

test('comment draft is cleared only after the create request succeeds', () => {
  assert.match(submitHandler, /await dispatch\s*\(\s*createComment/);
  const requestEnd = submitHandler.indexOf('await dispatch');
  const clearDraftCalls = [
    "setContent('');",
    "setPlainTextContent('');",
    'setFiles([]);'
  ];
  assert.ok(requestEnd >= 0);
  for (const clearCall of clearDraftCalls) {
    const clearPosition = submitHandler.indexOf(clearCall);
    assert.ok(
      clearPosition > requestEnd,
      `${clearCall} must follow API success`
    );
  }
});

test('failed comment submission keeps draft and files available for retry', () => {
  const catchBlock = submitHandler.slice(
    submitHandler.indexOf('} catch (error)')
  );
  assert.match(catchBlock, /showSnackBar\(getErrorMessage\(error\), 'error'\)/);
  assert.doesNotMatch(catchBlock, /setContent\(''\)|setFiles\(\[\]\)/);
});

test('successful comment submission confirms the result to the user', () => {
  assert.match(
    submitHandler,
    /showSnackBar\(t\('changes_saved_success'\), 'success'\)/
  );
});
