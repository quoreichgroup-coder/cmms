const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

test('realtime notifications do not duplicate records on the next offset page', async () => {
  const runtime = mobileRuntime({
    apiMock: {
      post: async (_url, body) => ({
        content:
          body.pageNum === 0 ? [{ id: 1 }, { id: 2 }] : [{ id: 2 }, { id: 3 }],
        last: body.pageNum === 1,
        totalElements: 3,
        numberOfElements: 2,
        empty: false
      })
    }
  });
  const module = runtime.load('slices/notification.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = module.reducer(state, action)), action);
  const criteria = { filterFields: [], pageSize: 2, pageNum: 0 };
  await dispatch(module.getNotifications(criteria));
  dispatch(
    module.newReceivedNotification({ id: 99, notificationType: 'INFO' })
  );
  await dispatch(module.getMoreNotifications(criteria, 1));

  assert.deepEqual(
    state.notifications.content.map((notification) => notification.id),
    [99, 1, 2, 3]
  );
});
