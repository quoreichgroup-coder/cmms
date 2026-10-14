const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

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
