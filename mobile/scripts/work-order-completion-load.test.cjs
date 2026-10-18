const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

test('work order completion explains its read-only and authorized-reopen effect', () => {
  const root = path.join(__dirname, '..');
  const details = fs.readFileSync(
    path.join(root, 'screens/workOrders/WODetailsScreen.tsx'),
    'utf8'
  );
  const detailsForm = fs.readFileSync(
    path.join(root, 'screens/workOrders/CompleteWorkOrderModal.tsx'),
    'utf8'
  );
  const english = fs.readFileSync(
    path.join(root, 'i18n/translations/en.ts'),
    'utf8'
  );
  const french = fs.readFileSync(
    path.join(root, 'i18n/translations/fr.ts'),
    'utf8'
  );

  assert.match(details, /work_order_completion_read_only_notice/);
  assert.match(detailsForm, /work_order_completion_read_only_notice/);
  assert.match(
    english,
    /work_order_completion_read_only_notice:[\s\S]*?read-only/
  );
  assert.match(
    french,
    /work_order_completion_read_only_notice:[\s\S]*?lecture seule/
  );
});

test('feedback and signature completion form identifies the work order and asset', () => {
  const root = path.join(__dirname, '..');
  const details = fs.readFileSync(
    path.join(root, 'screens/workOrders/WODetailsScreen.tsx'),
    'utf8'
  );
  const completionForm = fs.readFileSync(
    path.join(root, 'screens/workOrders/CompleteWorkOrderModal.tsx'),
    'utf8'
  );
  const routes = fs.readFileSync(path.join(root, 'types.tsx'), 'utf8');

  assert.match(
    details,
    /workOrderContext:\s*\{[\s\S]*?identifier:[\s\S]*?title:/
  );
  assert.match(
    routes,
    /workOrderContext:\s*\{[\s\S]*?identifier: string;[\s\S]*?title: string;/
  );
  assert.match(completionForm, /workOrderContext\.identifier/);
  assert.match(completionForm, /workOrderContext\.title/);
  assert.match(completionForm, /workOrderContext\.assetName/);
});

test('simple completion confirmation identifies its work order and asset', () => {
  const details = fs.readFileSync(
    path.join(__dirname, '..', 'screens/workOrders/WODetailsScreen.tsx'),
    'utf8'
  );
  const confirmation = details.match(
    /const renderConfirmComplete = \(\) => \([\s\S]*?\n  \);/
  );

  assert.ok(confirmation, 'expected the simple completion confirmation');
  assert.match(confirmation[0], /workOrder\.customId \|\| workOrder\.id/);
  assert.match(confirmation[0], /workOrder\.title/);
  assert.match(confirmation[0], /workOrder\.asset\?\.name/);
  assert.match(confirmation[0], /work_order_completion_read_only_notice/);
});

test('required completion validation distinguishes loading and failed reads from empty data', () => {
  const { getWorkOrderCompletionLoadIssues } = mobileRuntime().load(
    'utils/workOrderCompletion.ts'
  );
  const requirements = [
    { fieldName: 'completeFiles', fieldType: 'REQUIRED' },
    { fieldName: 'completeTime', fieldType: 'REQUIRED' },
    { fieldName: 'completeParts', fieldType: 'REQUIRED' },
    { fieldName: 'completeCost', fieldType: 'OPTIONAL' }
  ];

  const issues = getWorkOrderCompletionLoadIssues(requirements, {
    workOrder: 'success',
    comments: 'error',
    labor: 'loading',
    parts: 'success',
    costs: 'idle'
  });

  assert.equal(
    JSON.stringify(
      issues.map(({ fieldName, source, status }) => ({
        fieldName,
        source,
        status
      }))
    ),
    JSON.stringify([
      { fieldName: 'completeFiles', source: 'comments', status: 'error' },
      { fieldName: 'completeTime', source: 'labor', status: 'loading' }
    ])
  );
});

test('parts and additional-cost reads retain an explicit retryable failure state', async () => {
  const failure = new Error('temporary API failure');
  const runtime = mobileRuntime({
    apiMock: {
      get: async () => {
        throw failure;
      }
    }
  });
  const parts = runtime.load('slices/partQuantity.ts');
  const costs = runtime.load('slices/additionalCost.ts');

  async function runThunk(thunk) {
    let state;
    const reducer = thunk === 'parts' ? parts.reducer : costs.reducer;
    const dispatch = (action) => {
      if (typeof action === 'function') return action(dispatch);
      state = reducer(state, action);
      return action;
    };
    state = reducer(undefined, { type: '@@init' });
    await dispatch(
      thunk === 'parts'
        ? parts.getPartQuantitiesByWorkOrder(19)
        : costs.getAdditionalCosts(19)
    );
    return state;
  }

  const partState = await runThunk('parts');
  const costState = await runThunk('costs');
  assert.equal(partState.loadStatusByWorkOrder[19], 'error');
  assert.equal(costState.loadStatusByWorkOrder[19], 'error');
});

test('a failed comment read is not mistaken for a work order with no attachments', async () => {
  const runtime = mobileRuntime({
    apiMock: {
      post: async () => {
        throw new Error('temporary API failure');
      }
    }
  });
  const comments = runtime.load('slices/comment.ts');
  let state = comments.reducer(undefined, { type: '@@init' });
  const dispatch = (action) => {
    if (typeof action === 'function') return action(dispatch);
    state = comments.reducer(state, action);
    return action;
  };

  await assert.rejects(dispatch(comments.getCommentsByWorkOrder(29)));
  assert.equal(state.loadStatusByWorkOrder[29], 'error');
});

test('task execution is read-only for completed or non-editable work orders', () => {
  const { isWorkOrderTaskExecutionReadOnly } = mobileRuntime().load(
    'utils/workOrderTaskAccess.ts'
  );

  assert.equal(
    isWorkOrderTaskExecutionReadOnly({ status: 'IN_PROGRESS' }, true),
    false
  );
  assert.equal(
    isWorkOrderTaskExecutionReadOnly({ status: 'COMPLETE' }, true),
    true
  );
  assert.equal(
    isWorkOrderTaskExecutionReadOnly({ status: 'OPEN' }, false),
    true
  );
  assert.equal(isWorkOrderTaskExecutionReadOnly(undefined, true), true);
});
