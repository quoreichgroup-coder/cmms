const assert = require('node:assert/strict'),
  { test } = require('node:test'),
  { mobileRuntime } = require('./mobile-test-runtime.cjs');
const response = (status, body) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status });
test('requested-by WO filter targets the existing parent-request creator relation', () => {
  const { filterSingleField } = mobileRuntime().load('utils/filter.ts');
  const filters = filterSingleField(
    [],
    { requestedBy: [{ value: 37, label: 'Aïssata Diallo' }] },
    'requestedBy',
    'parentRequest.createdBy',
    'array'
  );
  assert.equal(
    JSON.stringify(filters),
    JSON.stringify([
      {
        field: 'parentRequest.createdBy',
        operation: 'in',
        joinType: null,
        value: '',
        values: [37]
      }
    ])
  );
});
test('refreshed task records retain uploaded evidence in the per-work-order store', () => {
  const { reducer, default: tasks } = mobileRuntime().load('slices/task.ts');
  const task = {
    id: 501,
    value: 'COMPLETE',
    taskBase: { id: 71, taskType: 'SUBTASK', label: 'Inspect coupling' },
    notes: '',
    images: [{ id: 9001, name: 'coupling.jpg', url: '/files/coupling.jpg' }]
  };
  let state = reducer(undefined, { type: '@@init' });
  state = reducer(state, tasks.actions.getTasks({ id: 44, tasks: [task] }));

  assert.deepEqual(
    JSON.parse(JSON.stringify(state.tasksByWorkOrder[44][0].images)),
    [task.images[0]]
  );
  assert.equal(state.tasksByWorkOrder[45], undefined);
});
test('task refresh preserves unsaved note drafts and adopts saved notes for clean tasks', () => {
  const { getPersistedTaskNote, isTaskNoteDirty, mergeTaskNotesWithDrafts } =
    mobileRuntime().load('utils/taskNoteDrafts.ts');
  const refreshedTasks = [
    { id: 1, notes: 'server note', value: 'COMPLETE' },
    { id: 2, notes: 'saved remotely', value: 'PASS' }
  ];
  const localTasks = [
    { id: 1, notes: 'technician draft', value: 'COMPLETE' },
    { id: 2, notes: 'old note', value: 'PASS' }
  ];

  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        mergeTaskNotesWithDrafts(refreshedTasks, localTasks, new Set([1]))
      )
    ),
    [
      { id: 1, notes: 'technician draft', value: 'COMPLETE' },
      { id: 2, notes: 'saved remotely', value: 'PASS' }
    ]
  );
  assert.equal(isTaskNoteDirty('draft', 'saved'), true);
  assert.equal(isTaskNoteDirty('saved', 'saved'), false);
  assert.equal(
    getPersistedTaskNote(1, 'technician draft', refreshedTasks, localTasks),
    'server note'
  );
});
test('role loading clears its busy state after the API rejects', async () => {
  const { load } = mobileRuntime({
    apiMock: {
      async get() {
        throw new Error('network unavailable');
      }
    }
  });
  const { getRoles } = load('slices/role.ts');
  const actions = [];
  const dispatch = (action) => {
    actions.push(action);
    return action;
  };

  await assert.rejects(getRoles()(dispatch), /network unavailable/);
  assert.deepEqual(
    actions
      .filter((action) => action.type.endsWith('/setLoadingGet'))
      .map((action) => action.payload.loading),
    [true, false]
  );
});
test('dashboard distinguishes initial placeholder zeros from fetched zero counts', () => {
  const { reducer, default: analytics } = mobileRuntime().load(
    'slices/analytics/workOrder.ts'
  );
  let state = reducer(undefined, { type: '@@init' });
  assert.equal(state.mobileOverviewLoaded, false);
  state = reducer(
    state,
    analytics.actions.getMobileOverview({
      requestId: 0,
      stats: {
        open: 0,
        onHold: 0,
        inProgress: 0,
        complete: 0,
        today: 0,
        high: 0
      }
    })
  );
  assert.equal(state.mobileOverviewLoaded, true);
  assert.equal(state.mobileOverview.open, 0);
});
test('dashboard hides previously fetched counts while refreshing for a new filter', () => {
  const { reducer, default: analytics } = mobileRuntime().load(
    'slices/analytics/workOrder.ts'
  );
  let state = reducer(undefined, { type: '@@init' });
  const previousStats = {
    open: 3,
    onHold: 1,
    inProgress: 2,
    complete: 4,
    today: 1,
    high: 2
  };
  state = reducer(
    state,
    analytics.actions.startMobileOverviewRequest({ requestId: 1 })
  );
  state = reducer(
    state,
    analytics.actions.getMobileOverview({
      requestId: 1,
      stats: previousStats
    })
  );
  assert.equal(state.mobileOverviewLoaded, true);

  state = reducer(
    state,
    analytics.actions.startMobileOverviewRequest({ requestId: 2 })
  );

  assert.equal(state.mobileOverviewLoaded, false);
  assert.deepEqual(state.mobileOverview, previousStats);
  assert.equal(state.loading.mobileOverview, true);
});
test('mobile dashboard overview requests and displays backend counts', async () => {
  const requestedUrls = [];
  const stats = {
    open: 7,
    onHold: 2,
    inProgress: 3,
    complete: 9,
    today: 4,
    high: 1
  };
  const { load } = mobileRuntime({
    apiMock: {
      async get(url) {
        requestedUrls.push(url);
        return stats;
      }
    }
  });
  const { getMobileOverviewStats } = load('slices/analytics/workOrder.ts');
  const actions = [];
  const dispatch = (action) => {
    actions.push(action);
    return action;
  };

  await getMobileOverviewStats(true)(dispatch);

  assert.deepEqual(requestedUrls, [
    'analytics/work-orders/mobile/overview?assignedToMe=true'
  ]);
  const loadedStats = actions.find((action) =>
    action.type?.endsWith('/getMobileOverview')
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(loadedStats.payload.stats)),
    stats
  );
  assert.equal(
    actions.some(
      (action) =>
        action.type?.endsWith('/setLoading') &&
        action.payload.operation === 'mobileOverview' &&
        action.payload.loading === false
    ),
    false
  );
  assert.equal(
    actions.some((action) =>
      action.type?.endsWith('/finishMobileOverviewRequest')
    ),
    true
  );
});

test('dashboard ignores stale overview responses when filters are refreshed quickly', async () => {
  const requests = [];
  const { load } = mobileRuntime({
    apiMock: {
      get(url) {
        return new Promise((resolve, reject) => {
          requests.push({ url, resolve, reject });
        });
      }
    }
  });
  const { reducer, getMobileOverviewStats } = load(
    'slices/analytics/workOrder.ts'
  );
  let state = reducer(undefined, { type: '@@init' });
  const dispatch = (action) => {
    state = reducer(state, action);
    return action;
  };
  const oldRequest = getMobileOverviewStats(false)(dispatch);
  const latestRequest = getMobileOverviewStats(true)(dispatch);

  assert.deepEqual(
    requests.map(({ url }) => url),
    [
      'analytics/work-orders/mobile/overview?assignedToMe=false',
      'analytics/work-orders/mobile/overview?assignedToMe=true'
    ]
  );
  assert.equal(state.loading.mobileOverview, true);

  const latestStats = {
    open: 7,
    onHold: 2,
    inProgress: 3,
    complete: 9,
    today: 4,
    high: 1
  };
  requests[1].resolve(latestStats);
  await latestRequest;
  assert.deepEqual(state.mobileOverview, latestStats);
  assert.equal(state.loading.mobileOverview, false);

  requests[0].resolve({
    open: 99,
    onHold: 99,
    inProgress: 99,
    complete: 99,
    today: 99,
    high: 99
  });
  await oldRequest;
  assert.deepEqual(state.mobileOverview, latestStats);
  assert.equal(state.errors.mobileOverview, '');
});

test('a stale dashboard failure cannot replace the current request state', async () => {
  const requests = [];
  const { load } = mobileRuntime({
    apiMock: {
      get(url) {
        return new Promise((resolve, reject) => {
          requests.push({ url, resolve, reject });
        });
      }
    }
  });
  const { reducer, getMobileOverviewStats } = load(
    'slices/analytics/workOrder.ts'
  );
  let state = reducer(undefined, { type: '@@init' });
  const dispatch = (action) => {
    state = reducer(state, action);
    return action;
  };
  const oldRequest = getMobileOverviewStats(false)(dispatch);
  const latestRequest = getMobileOverviewStats(true)(dispatch);

  requests[1].reject(new Error('latest request failed'));
  await latestRequest;
  assert.equal(state.errors.mobileOverview, 'latest request failed');
  assert.equal(state.loading.mobileOverview, false);

  requests[0].resolve({
    open: 5,
    onHold: 0,
    inProgress: 0,
    complete: 0,
    today: 0,
    high: 0
  });
  await oldRequest;
  assert.equal(state.errors.mobileOverview, 'latest request failed');
  assert.equal(state.mobileOverviewLoaded, false);
  assert.equal(state.loading.mobileOverview, false);
});
test('work-order completion reports all missing configured requirements', () => {
  const { getWorkOrderCompletionBlockers, getWorkOrderCompletionNextStep } =
    mobileRuntime().load('utils/workOrderCompletion.ts');
  const requirements = [
    { fieldName: 'completeFiles', fieldType: 'REQUIRED' },
    { fieldName: 'completeTasks', fieldType: 'REQUIRED' },
    { fieldName: 'completeCost', fieldType: 'OPTIONAL' }
  ];
  const checks = [
    {
      fieldName: 'completeFiles',
      isMissing: true,
      message: 'required_files_on_completion'
    },
    {
      fieldName: 'completeTasks',
      isMissing: true,
      message: 'required_tasks_on_completion'
    },
    {
      fieldName: 'completeCost',
      isMissing: true,
      message: 'required_cost_on_completion'
    }
  ];
  assert.deepEqual(getWorkOrderCompletionBlockers(requirements, checks), [
    'required_files_on_completion',
    'required_tasks_on_completion'
  ]);
  assert.deepEqual(getWorkOrderCompletionBlockers(undefined, checks), []);
  assert.equal(
    getWorkOrderCompletionNextStep({
      feedbackRequired: false,
      signatureRequired: true,
      signatureFeatureEnabled: false
    }),
    'blocked'
  );
  assert.equal(
    getWorkOrderCompletionNextStep({
      feedbackRequired: true,
      signatureRequired: false,
      signatureFeatureEnabled: false
    }),
    'collect-details'
  );
  assert.equal(
    getWorkOrderCompletionNextStep({
      feedbackRequired: false,
      signatureRequired: false,
      signatureFeatureEnabled: false
    }),
    'confirm'
  );
  assert.equal(
    getWorkOrderCompletionNextStep({
      feedbackRequired: false,
      signatureRequired: true,
      signatureFeatureEnabled: true
    }),
    'collect-details'
  );
});
test('work-order task load failure is distinguishable from an empty task list', () => {
  const { reducer, default: tasksSlice } =
    mobileRuntime().load('slices/task.ts');
  let state = reducer(undefined, { type: '@@init' });
  assert.equal(state.taskLoadStatusByWorkOrder[42], undefined);
  state = reducer(
    state,
    tasksSlice.actions.setLoadingByTask({ id: 42, loading: true })
  );
  assert.equal(state.taskLoadStatusByWorkOrder[42], 'loading');
  state = reducer(state, tasksSlice.actions.getTasks({ id: 42, tasks: [] }));
  assert.equal(state.taskLoadStatusByWorkOrder[42], 'success');
  assert.deepEqual(state.tasksByWorkOrder[42], []);
  state = reducer(state, tasksSlice.actions.failGetTasks({ id: 42 }));
  assert.equal(state.taskLoadStatusByWorkOrder[42], 'error');
});
test('work-order detail refresh updates the matching cached list row', () => {
  const { reducer, default: workOrders } = mobileRuntime().load(
    'slices/workOrder.ts'
  );
  let state = reducer(undefined, { type: '@@init' });
  state = reducer(
    state,
    workOrders.actions.getWorkOrders({
      workOrders: {
        content: [{ id: 24, status: 'OPEN', title: 'Pump check' }],
        last: true
      },
      requestId: 0
    })
  );
  const refreshed = { id: 24, status: 'IN_PROGRESS', title: 'Pump check' };
  state = reducer(
    state,
    workOrders.actions.getWorkOrderDetails({ id: 24, workOrder: refreshed })
  );
  assert.equal(state.workOrderInfos[24].workOrder.status, 'IN_PROGRESS');
  assert.equal(state.workOrders.content[0].status, 'IN_PROGRESS');
});
test('subtask progress only counts COMPLETE as done; inspection outcomes count as recorded', () => {
  const { isTaskComplete } = mobileRuntime().load('models/tasks.ts');
  const task = (taskType, value) => ({ taskBase: { taskType }, value });
  assert.equal(isTaskComplete(task('SUBTASK', 'OPEN')), false);
  assert.equal(isTaskComplete(task('SUBTASK', 'IN_PROGRESS')), false);
  assert.equal(isTaskComplete(task('SUBTASK', 'ON_HOLD')), false);
  assert.equal(isTaskComplete(task('SUBTASK', 'COMPLETE')), true);
  assert.equal(isTaskComplete(task('INSPECTION', 'PASS')), true);
  assert.equal(isTaskComplete(task('INSPECTION', 'FLAG')), true);
  assert.equal(isTaskComplete(task('INSPECTION', 'FAIL')), true);
  assert.equal(isTaskComplete(task('METER', 0)), true);
  assert.equal(isTaskComplete(task('NUMBER', '0')), true);
  assert.equal(isTaskComplete(task('NUMBER', ' 0 ')), true);
  assert.equal(isTaskComplete(task('NUMBER', '')), false);
  assert.equal(isTaskComplete(task('METER', 'not-a-reading')), false);
  assert.equal(isTaskComplete(task('TEXT', 0)), true);
  assert.equal(isTaskComplete(task('TEXT', '')), false);
});
test('work-order labor loading distinguishes an empty success from a failed request', () => {
  const { reducer, default: laborSlice } =
    mobileRuntime().load('slices/labor.ts');
  let state = reducer(undefined, { type: '@@init' });
  assert.equal(state.laborLoadStatusByWorkOrder[24], undefined);
  state = reducer(
    state,
    laborSlice.actions.setLoadingByWorkOrder({ id: 24, loading: true })
  );
  assert.equal(state.laborLoadStatusByWorkOrder[24], 'loading');
  state = reducer(state, laborSlice.actions.getLabors({ id: 24, labors: [] }));
  assert.equal(state.laborLoadStatusByWorkOrder[24], 'success');
  assert.deepEqual(state.timesByWorkOrder[24], []);
  state = reducer(state, laborSlice.actions.failGetLabors({ id: 24 }));
  assert.equal(state.laborLoadStatusByWorkOrder[24], 'error');
});
test('late labor refresh responses cannot replace newer execution data', async () => {
  const pending = [];
  const { reducer, getLabors } = mobileRuntime({
    apiMock: {
      get: () =>
        new Promise((resolve, reject) => pending.push({ resolve, reject }))
    }
  }).load('slices/labor.ts');
  let state = reducer(undefined, { type: '@@init' });
  const dispatch = (action) => {
    if (typeof action === 'function') {
      return action(dispatch, () => ({ labors: state }), undefined);
    }
    state = reducer(state, action);
    return action;
  };
  const olderRefresh = dispatch(getLabors(24));
  const newerRefresh = dispatch(getLabors(24));
  const currentLabors = [{ id: 202, duration: 90 }];
  pending[1].resolve(currentLabors);
  await newerRefresh;
  pending[0].resolve([{ id: 101, duration: 30 }]);
  await olderRefresh;

  assert.equal(state.loadingLabors[24], false);
  assert.equal(state.laborLoadStatusByWorkOrder[24], 'success');
  assert.deepEqual(state.timesByWorkOrder[24], currentLabors);
});
test('work-order timer requires edit permission, the plan feature, and the license entitlement', () => {
  const { canUseWorkOrderTimer } = mobileRuntime().load(
    'utils/workOrderTimer.ts'
  );
  assert.equal(canUseWorkOrderTimer(true, true, true), true);
  assert.equal(canUseWorkOrderTimer(false, true, true), false);
  assert.equal(canUseWorkOrderTimer(true, false, true), false);
  assert.equal(canUseWorkOrderTimer(true, true, false), false);
});
test('work-order timer lookup tolerates labor rows without an assigned user', () => {
  const { getPrimaryWorkOrderLabor } = mobileRuntime().load(
    'utils/workOrderTimer.ts'
  );
  const unassignedLabor = { id: 1, logged: true, assignedTo: null };
  const anotherUserLabor = {
    id: 2,
    logged: true,
    assignedTo: { id: 99 }
  };
  const currentUserLabor = {
    id: 3,
    logged: true,
    assignedTo: { id: 7 }
  };

  assert.equal(
    getPrimaryWorkOrderLabor(
      [unassignedLabor, anotherUserLabor, currentUserLabor],
      7
    ),
    currentUserLabor
  );
  assert.equal(getPrimaryWorkOrderLabor([unassignedLabor], 7), undefined);
});
test('enum filter selection safely handles scalar filters and partial selections', () => {
  const { getEnumFilterStatuses } = mobileRuntime().load('utils/filter.ts');
  const options = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETE'];

  assert.deepEqual(
    getEnumFilterStatuses(
      [{ field: 'status', operation: 'eq', value: 'OPEN' }],
      'status',
      options
    ),
    [false, false, false, false]
  );
  assert.deepEqual(
    getEnumFilterStatuses(
      [
        {
          field: 'status',
          operation: 'in',
          value: '',
          values: ['OPEN', 'ON_HOLD']
        }
      ],
      'status',
      options
    ),
    [true, false, true, false]
  );
});
test('image and document upload metadata always has a usable MIME type and filename', () => {
  const { createImageUploadFile, createUploadFile } = mobileRuntime().load(
    'utils/uploadFiles.ts'
  );
  assert.deepEqual(
    {
      ...createImageUploadFile(
        { uri: 'file:///cache/photo', mimeType: 'image/heic' },
        1
      )
    },
    { uri: 'file:///cache/photo', name: 'image-1.jpg', type: 'image/heic' }
  );
  assert.deepEqual(
    { ...createImageUploadFile({ uri: 'file:///cache/photo.jpg' }, 2) },
    { uri: 'file:///cache/photo.jpg', name: 'photo.jpg', type: 'image/jpeg' }
  );
  assert.deepEqual(
    {
      ...createUploadFile({
        uri: 'file:///cache/report%20final.pdf',
        mimeType: 'application/pdf'
      })
    },
    {
      uri: 'file:///cache/report%20final.pdf',
      name: 'report final.pdf',
      type: 'application/pdf'
    }
  );
});
test('iOS photo picker uses compatible assets without requesting broad library access', () => {
  const { shouldRequestPhotoLibraryPermission, getImageLibraryOptions } =
    mobileRuntime().load('utils/mediaPickerPlatform.ts');
  assert.equal(shouldRequestPhotoLibraryPermission('ios'), false);
  assert.equal(shouldRequestPhotoLibraryPermission('android'), true);
  assert.equal(
    getImageLibraryOptions('ios', { quality: 0.5 })
      .preferredAssetRepresentationMode,
    'compatible'
  );
  assert.deepEqual(getImageLibraryOptions('android', { quality: 0.5 }), {
    quality: 0.5
  });
});
test('server URL accepts host or API path and rejects invalid configuration', async () => {
  const { normalizeApiUrl, getApiUrl } = mobileRuntime({
    apiUrl: 'https://server:3000'
  }).load('config.ts');
  assert.equal(await getApiUrl(), 'https://server:3000/api/');
  assert.equal(
    normalizeApiUrl(' https://server/cmms/api/ '),
    'https://server/cmms/api/'
  );
  const withoutExpoExtra = mobileRuntime({ apiUrl: null }).load('config.ts');
  assert.equal(
    await withoutExpoExtra.getApiUrl(),
    'https://169-58-86-7.sslip.io/api/'
  );
  for (const url of [
    '',
    'server',
    'ftp://server',
    'https://user:password@server',
    'https://server?key=x',
    'https://server#x'
  ])
    assert.throws(() => normalizeApiUrl(url));
  assert.throws(() => normalizeApiUrl('http://cmms.example.com/api'), /HTTPS/);
  const french = mobileRuntime().load('i18n/translations/fr.ts').default;
  assert.throws(
    () => normalizeApiUrl('server', (key) => french[key]),
    /commençant par http:\/\/ ou https:\/\//
  );
  assert.throws(
    () => normalizeApiUrl('http://cmms.example.com/api', (key) => french[key]),
    /Utilisez HTTPS/
  );
});
test('custom-server connection errors are localized in English and French', () => {
  for (const language of ['en', 'fr']) {
    const translations = mobileRuntime().load(
      `i18n/translations/${language}.ts`
    ).default;
    assert.ok(translations.server_unreachable);
    assert.ok(translations.invalid_cmms_server_address);
  }
});
test('notification taps map only valid resource payloads to detail screens', () => {
  const { getNotificationUrlFromData } =
    mobileRuntime().load('utils/urlPaths.ts');
  const workOrder = getNotificationUrlFromData({ type: 'WORK_ORDER', id: 42 });
  assert.equal(workOrder.route, 'WODetails');
  assert.equal(workOrder.params.id, 42);
  const request = getNotificationUrlFromData({ type: 'REQUEST', id: '7' });
  assert.equal(request.route, 'RequestDetails');
  assert.equal(request.params.id, 7);
  for (const data of [
    null,
    {},
    { type: 'UNKNOWN', id: 1 },
    { type: 'INFO', id: 1 },
    { type: 'ASSET', id: 0 },
    { type: 'ASSET', id: true },
    { type: 'ASSET', id: '' },
    { type: 'ASSET', id: 'not-an-id' },
    { type: 'ASSET', id: Number.MAX_SAFE_INTEGER + 1 }
  ])
    assert.equal(getNotificationUrlFromData(data), null);
});
test('preferred language tolerates missing company preferences during sign-in', () => {
  const { getPreferredLanguage } = mobileRuntime().load(
    'utils/preferredLanguage.ts'
  );
  assert.equal(getPreferredLanguage('fr', 'en'), 'fr');
  assert.equal(getPreferredLanguage('  ', 'FR'), 'fr');
  assert.equal(getPreferredLanguage(null, null), 'en');
});
test('writes preserve payload without stale company injection; DELETE 204 succeeds', async () => {
  const api = mobileRuntime({
    initialStorage: { accessToken: 'access', companyId: '999' },
    fetch: async (_, o) => {
      assert.equal(o.headers.get('Authorization'), 'Bearer access');
      assert.equal(o.headers.get('X-Platform'), 'android');
      if (o.method === 'DELETE') return response(204);
      assert.deepEqual(JSON.parse(o.body), { name: 'Workshop' });
      return response(200, { id: 2 });
    }
  }).load('utils/api.ts').default;
  await api.post('locations', { name: 'Workshop' });
  await api.patch('locations/2', { name: 'Workshop' });
  assert.equal(await api.deletes('locations/2'), undefined);
});
test('multipart upload lets fetch generate the boundary', async () => {
  const api = mobileRuntime({
    fetch: async (_, o) => {
      assert.equal(o.headers.has('Content-Type'), false);
      assert.ok(o.body instanceof FormData);
      return response(200, []);
    }
  }).load('utils/api.ts').default;
  const form = new FormData();
  form.append('type', 'OTHER');
  await api.post('files/upload', form, {}, true, true);
});
test('simultaneous 401s share a refresh and retry with fresh bearer', async () => {
  let refreshes = 0,
    reads = 0;
  const r = mobileRuntime({
    initialStorage: { accessToken: 'old', refreshToken: 'refresh' },
    fetch: async (url, o) => {
      if (url.endsWith('auth/refresh')) {
        refreshes++;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return response(200, { accessToken: 'new', refreshToken: 'rotated' });
      }
      reads++;
      return o.headers.get('Authorization') === 'Bearer new'
        ? response(200, [])
        : response(401, {});
    }
  });
  const api = r.load('utils/api.ts').default;
  await Promise.all([
    api.get('locations'),
    api.get('assets', { headers: { Authorization: 'Bearer old' } })
  ]);
  assert.equal(refreshes, 1);
  assert.equal(reads, 4);
  assert.equal(r.values.get('refreshToken'), 'rotated');
});
for (const succeeds of [false, true])
  test(`persistent 401 is bounded; refresh success=${succeeds}`, async () => {
    let refreshes = 0,
      reads = 0;
    const r = mobileRuntime({
      initialStorage: { accessToken: 'old', refreshToken: 'refresh' },
      fetch: async (url) => {
        if (url.endsWith('auth/refresh')) {
          refreshes++;
          return response(
            succeeds ? 200 : 401,
            succeeds ? { accessToken: 'new' } : {}
          );
        }
        reads++;
        return response(401, {});
      }
    });
    await assert.rejects(
      r.load('utils/api.ts').default.get('locations'),
      (e) => e.status === 401
    );
    assert.equal(refreshes, 1);
    assert.equal(reads, succeeds ? 2 : 1);
    if (!succeeds) assert.equal(r.values.has('accessToken'), false);
  });
test('login sends no old bearer and wrong password does not refresh', async () => {
  let requests = 0;
  const api = mobileRuntime({
    initialStorage: { accessToken: 'old', refreshToken: 'refresh' },
    fetch: async (url, o) => {
      requests++;
      assert.ok(url.endsWith('auth/signin'));
      assert.equal(o.headers.has('Authorization'), false);
      return response(401, {});
    }
  }).load('utils/api.ts').default;
  await assert.rejects(
    api.post('auth/signin', { email: 'user', password: 'wrong' })
  );
  assert.equal(requests, 1);
});
test('pending requests time out and caller cancellation remains silent', async () => {
  const r = mobileRuntime({
    timers: { setTimeout: (callback) => setTimeout(callback, 5) },
    fetch: (_, o) =>
      new Promise((_, reject) => {
        const fail = () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        if (o.signal.aborted) fail();
        else o.signal.addEventListener('abort', fail);
      })
  });
  const api = r.load('utils/api.ts').default;
  await assert.rejects(api.get('locations'), /serveur ne répond pas/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    api.get('assets', { signal: controller.signal }),
    (e) => e.name === 'AbortError'
  );
});
test('HTTP errors reach the global UI error handler', async () => {
  const module = mobileRuntime({
    fetch: async () => response(403, { message: 'Access denied' })
  }).load('utils/api.ts');
  let message;
  const cleanup = module.setApiErrorHandler(
    (e) => (message = module.getErrorMessage(e))
  );
  await assert.rejects(module.default.get('locations'));
  assert.equal(message, 'Access denied');
  cleanup();
});
test('work-order list keeps the newest search when responses arrive out of order', async () => {
  const pending = [];
  const runtime = mobileRuntime({
    apiMock: { post: () => new Promise((resolve) => pending.push(resolve)) }
  });
  const module = runtime.load('slices/workOrder.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = module.reducer(state, action)), action);
  const criteria = { filterFields: [], pageSize: 10, pageNum: 0 };
  const oldRequest = dispatch(module.getWorkOrders(criteria));
  const newRequest = dispatch(
    module.getWorkOrders({
      ...criteria,
      filterFields: [{ field: 'status', operation: 'eq', value: 'OPEN' }]
    })
  );
  const page = (content) => ({
    ...state.workOrders,
    content,
    totalElements: content.length,
    numberOfElements: content.length,
    empty: content.length === 0
  });
  pending[1](page([{ id: 22, title: 'Current filter' }]));
  await newRequest;
  pending[0](page([{ id: 11, title: 'Stale filter' }]));
  await oldRequest;
  assert.deepEqual(
    state.workOrders.content.map((order) => order.id),
    [22]
  );
  assert.equal(state.loadingGet, false);
});
test('stale work-order pagination cannot append after a new first-page search', async () => {
  const pending = [];
  const runtime = mobileRuntime({
    apiMock: { post: () => new Promise((resolve) => pending.push(resolve)) }
  });
  const module = runtime.load('slices/workOrder.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = module.reducer(state, action)), action);
  const criteria = { filterFields: [], pageSize: 10, pageNum: 0 };
  const page = (content) => ({
    ...state.workOrders,
    content,
    totalElements: content.length,
    numberOfElements: content.length,
    empty: content.length === 0
  });
  const first = dispatch(module.getWorkOrders(criteria));
  pending[0](page([{ id: 1, title: 'First page' }]));
  await first;
  const oldNext = dispatch(module.getMoreWorkOrders(criteria, 1));
  const refreshed = dispatch(
    module.getWorkOrders({
      ...criteria,
      filterFields: [{ field: 'status', operation: 'eq', value: 'OPEN' }]
    })
  );
  pending[2](page([{ id: 2, title: 'Refreshed result' }]));
  await refreshed;
  pending[1](page([{ id: 99, title: 'Stale page' }]));
  await oldNext;
  assert.deepEqual(
    state.workOrders.content.map((order) => order.id),
    [2]
  );
  assert.equal(state.currentPageNum, 0);
  assert.equal(state.loadingGet, false);
});
test('request list ignores out-of-order search and pagination responses', async () => {
  const pending = [];
  const runtime = mobileRuntime({
    apiMock: { post: () => new Promise((resolve) => pending.push(resolve)) }
  });
  const module = runtime.load('slices/request.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = module.reducer(state, action)), action);
  const criteria = { filterFields: [], pageSize: 10, pageNum: 0 };
  const page = (content) => ({
    ...state.requests,
    content,
    totalElements: content.length,
    numberOfElements: content.length,
    empty: content.length === 0
  });
  const staleSearch = dispatch(module.getRequests(criteria));
  const currentSearch = dispatch(
    module.getRequests({
      ...criteria,
      filterFields: [{ field: 'status', operation: 'eq', value: 'PENDING' }]
    })
  );
  pending[1](page([{ id: 22, title: 'Current request' }]));
  await currentSearch;
  pending[0](page([{ id: 11, title: 'Stale request' }]));
  await staleSearch;
  assert.deepEqual(
    state.requests.content.map((request) => request.id),
    [22]
  );
  const stalePage = dispatch(module.getMoreRequests(criteria, 1));
  const refreshedSearch = dispatch(
    module.getRequests({
      ...criteria,
      filterFields: [{ field: 'status', operation: 'eq', value: 'APPROVED' }]
    })
  );
  pending[3](page([{ id: 33, title: 'Refreshed request' }]));
  await refreshedSearch;
  pending[2](page([{ id: 99, title: 'Stale page' }]));
  await stalePage;
  assert.deepEqual(
    state.requests.content.map((request) => request.id),
    [33]
  );
  assert.equal(state.currentPageNum, 0);
  assert.equal(state.loadingGet, false);
});
for (const succeeds of [false, true])
  test(`meter readings stop loading after ${
    succeeds ? 'success' : 'failure'
  }`, async () => {
    const records = [{ id: 4, value: 128, createdAt: '2026-10-11T09:00:00Z' }];
    const runtime = mobileRuntime({
      apiMock: {
        get: async (url) => {
          assert.equal(url, 'readings/meter/17');
          if (!succeeds) throw new Error('Server unavailable');
          return records;
        }
      }
    });
    const module = runtime.load('slices/reading.ts');
    let state = module.reducer(undefined, { type: '@@init' });
    const dispatch = (action) =>
      typeof action === 'function'
        ? action(dispatch, () => ({ readings: state }), null)
        : ((state = module.reducer(state, action)), action);
    if (succeeds) await dispatch(module.getReadings(17));
    else
      await assert.rejects(
        dispatch(module.getReadings(17)),
        /Server unavailable/
      );
    assert.equal(state.loadingGet, false);
    assert.deepEqual(state.readingsByMeter[17] ?? [], succeeds ? records : []);
  });
for (const name of ['workOrder', 'asset', 'part', 'request', 'user']) {
  const module = mobileRuntime({
    apiMock: {
      get: async () => {
        throw new Error('Server unavailable');
      },
      post: async () => {
        throw new Error('Server unavailable');
      }
    }
  }).load(`slices/analytics/${name}.ts`);
  for (const operation of Object.keys(module).filter((k) =>
    k.startsWith('get')
  ))
    test(`analytics ${name}.${operation} stops loading on failure and resets on logout`, async () => {
      let state = module.reducer(undefined, { type: '@@init' });
      await module[operation](name === 'user' ? 1 : false)(
        (action) => (state = module.reducer(state, action))
      );
      assert.ok(Object.values(state.loading).every((v) => v === false));
      assert.ok(Object.values(state.errors).includes('Server unavailable'));
      state = module.reducer(state, { type: 'REVERT_ALL' });
      assert.deepEqual(Object.keys(state.errors), []);
    });
}
for (const [name, operation] of [
  ['location', 'getLocationDetails'],
  ['asset', 'getAssetDetails'],
  ['workOrder', 'getWorkOrderDetails'],
  ['preventiveMaintenance', 'getSinglePreventiveMaintenance']
])
  test(`detail ${name} stops loading on rejection`, async () => {
    const module = mobileRuntime({
      apiMock: {
        get: async () => {
          throw new Error('Missing');
        }
      }
    }).load(`slices/${name}.ts`);
    let state = module.reducer(undefined, { type: '@@init' });
    await assert.rejects(
      module[operation](404)(
        (action) => (state = module.reducer(state, action))
      )
    );
    assert.equal(state.loadingGet, false);
  });
test('license activation contract and reset of entitlements', async () => {
  const module = mobileRuntime({
    apiMock: {
      post: async (url, body) => {
        assert.equal(url, 'license/activate');
        assert.equal(body.licenseKey, 'test-license-key');
        return { valid: true, entitlements: ['NFC_BARCODE'] };
      }
    }
  }).load('slices/license.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  await module.activateLicense('test-license-key')(
    (action) => (state = module.reducer(state, action))
  );
  assert.equal(state.state.valid, true);
  state = module.reducer(state, { type: 'REVERT_ALL' });
  assert.equal(state.state.valid, false);
});
