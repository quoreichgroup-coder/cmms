const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const { createWorkOrderWithTasks, isWorkOrderTasksCreationError } =
  mobileRuntime().load('utils/workOrderCreation.ts');

test('task templates keep the existing labels payload and attach to the created WO', async () => {
  const created = { id: 42 };
  let createCalls = 0;
  let attachedWorkOrderId;
  let attachedTaskBases;

  const result = await createWorkOrderWithTasks(
    {
      id: 0,
      tasks: [
        {
          taskBase: {
            title: 'Inspect belt',
            options: [{ label: 'Pass' }, { label: 'Fail' }]
          }
        }
      ]
    },
    async () => {
      createCalls += 1;
      return created;
    },
    async (workOrderId, taskBases) => {
      attachedWorkOrderId = workOrderId;
      attachedTaskBases = taskBases;
    }
  );

  assert.equal(result, created);
  assert.equal(createCalls, 1);
  assert.equal(attachedWorkOrderId, 42);
  assert.equal(
    JSON.stringify(attachedTaskBases),
    JSON.stringify([{ title: 'Inspect belt', options: ['Pass', 'Fail'] }])
  );
});

test('meter task templates preserve the selected meter association in the API payload', async () => {
  let attachedTaskBases;

  await createWorkOrderWithTasks(
    {
      id: 0,
      tasks: [
        {
          taskBase: {
            label: 'Record vibration reading',
            taskType: 'METER',
            meter: { id: 17, name: 'Pump vibration' },
            options: []
          }
        }
      ]
    },
    async () => ({ id: 42 }),
    async (_workOrderId, taskBases) => {
      attachedTaskBases = taskBases;
    }
  );

  assert.deepEqual(attachedTaskBases[0].meter, {
    id: 17,
    name: 'Pump vibration'
  });
  assert.equal(attachedTaskBases[0].taskType, 'METER');
});

test('task attachment failure reports the already-created WO for safe recovery', async () => {
  const attachmentError = new Error('network timeout');
  let createCalls = 0;

  await assert.rejects(
    createWorkOrderWithTasks(
      {
        id: 0,
        tasks: [{ taskBase: { title: 'Inspect', options: [] } }]
      },
      async () => {
        createCalls += 1;
        return { id: 73 };
      },
      async () => {
        throw attachmentError;
      }
    ),
    (error) => {
      assert.equal(isWorkOrderTasksCreationError(error), true);
      assert.equal(error.workOrderId, 73);
      assert.equal(error.originalError, attachmentError);
      return true;
    }
  );

  assert.equal(createCalls, 1);
});

test('work-order creation errors remain ordinary failures and do not attempt task attachment', async () => {
  const creationError = new Error('server rejected work order');
  let taskCalls = 0;

  await assert.rejects(
    createWorkOrderWithTasks(
      {
        id: 0,
        tasks: [{ taskBase: { title: 'Inspect', options: [] } }]
      },
      async () => {
        throw creationError;
      },
      async () => {
        taskCalls += 1;
      }
    ),
    (error) => error === creationError
  );

  assert.equal(taskCalls, 0);
});
