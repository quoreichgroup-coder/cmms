const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  { test } = require('node:test'),
  { mobileRuntime } = require('./mobile-test-runtime.cjs');
const response = (status, body) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status });
test('form selectors restore single and multi-selection IDs consistently', () => {
  const runtime = mobileRuntime();
  const { getSelectedFormValues } = runtime.load('utils/formSelection.ts');
  const task = { id: 4, taskBase: { label: 'Inspect bearing' } };

  assert.deepEqual(
    Array.from(getSelectedFormValues({ label: 'Conveyor', value: '42' })),
    [42]
  );
  assert.deepEqual(
    Array.from(
      getSelectedFormValues([
        { label: 'Team A', value: 7 },
        { label: 'Team B', value: '8' }
      ])
    ),
    [7, 8]
  );
  assert.deepEqual(
    Array.from(getSelectedFormValues([task, { label: 'Task', value: task }])),
    [task, task]
  );
  assert.deepEqual(Array.from(getSelectedFormValues(undefined)), []);

  const form = fs.readFileSync(
    path.join(__dirname, '..', 'components/form/index.tsx'),
    'utf8'
  );
  assert.match(
    form,
    /selected: getSelectedFormValues<FormSelectionValue>\(values\)/
  );
});
test('persisted account cache resets before the storage flush completes', async () => {
  const runtime = mobileRuntime();
  const { clearPersistedAppState } = runtime.load(
    'utils/clearPersistedAppState.ts'
  );
  const events = [];

  await clearPersistedAppState(
    (action) => events.push(action.type),
    async () => events.push('flushed')
  );

  assert.deepEqual(events, ['REVERT_ALL', 'flushed']);
  const auth = fs.readFileSync(
    path.join(__dirname, '..', 'contexts/AuthContext.tsx'),
    'utf8'
  );
  const server = fs.readFileSync(
    path.join(__dirname, '..', 'screens/auth/CustomServerScreen.tsx'),
    'utf8'
  );
  assert.match(auth, /clearPersistedAppState\(globalDispatch/);
  assert.equal((server.match(/clearServerSessionState\(/g) || []).length, 2);
});
test('single category picker announces and marks the current selection', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectCategoryModal.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /accessibilityState=\{\s*multiple\s*\?\s*\{\s*checked: selectedIds\.includes\(category\.id\)\s*\}\s*:\s*\{\s*selected: selectedIds\.includes\(category\.id\)\s*\}\s*\}/
  );
  assert.match(
    source,
    /selectedIds\.includes\(category\.id\)\s*\?\s*\(\s*<Icon\s+source="check-circle"/
  );
});
test('single user picker announces and marks the current selection', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectUsersModal.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /accessibilityState=\{\s*multiple\s*\?\s*\{\s*checked: selectedIds\.includes\(user\.id\)\s*\}\s*:\s*\{\s*selected: selectedIds\.includes\(user\.id\)\s*\}\s*\}/
  );
  assert.match(
    source,
    /!multiple\s*&&\s*selectedIds\.includes\(user\.id\)\s*&&\s*\(\s*<Icon\s+source="check-circle"/
  );
});
test('single location picker announces and marks the current selection', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectLocationsModal.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /accessibilityState=\{\s*multiple\s*\?\s*\{\s*checked: isSelected\s*\}\s*:\s*\{\s*selected: isSelected\s*\}\s*\}/
  );
  assert.match(
    source,
    /!multiple\s*&&\s*isSelected\s*&&\s*\(\s*<Icon\s+source="check-circle"/
  );
});
test('single team picker announces and marks the current selection', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectTeamsModal.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /accessibilityState=\{\s*multiple\s*\?\s*\{\s*checked: selectedIds\.includes\(team\.id\)\s*\}\s*:\s*\{\s*selected: selectedIds\.includes\(team\.id\)\s*\}\s*\}/
  );
  assert.match(
    source,
    /!multiple\s*&&\s*selectedIds\.includes\(team\.id\)\s*&&\s*\(\s*<Icon\s+source="check-circle"/
  );
});
test('single meter picker announces and marks the current selection', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectMetersModal.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /accessibilityState=\{\s*multiple\s*\?\s*\{\s*checked: selectedIds\.includes\(meter\.id\)\s*\}\s*:\s*\{\s*selected: selectedIds\.includes\(meter\.id\)\s*\}\s*\}/
  );
  assert.match(
    source,
    /!multiple\s*&&\s*selectedIds\.includes\(meter\.id\)\s*&&\s*\(\s*<Icon\s+source="check-circle"/
  );
});
test('shared error retry actions meet the QPM minimum touch target', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components/AsyncStateFeedback.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /<Button compact onPress=\{onRetry\} style=\{styles\.retryButton\}/
  );
  assert.match(
    source,
    /<Button\s+mode="contained"\s+onPress=\{onRetry\}\s+style=\{styles\.retryButton\}/
  );
  assert.match(
    source,
    /retryButton:\s*\{\s*minHeight:\s*qpmLayoutTokens\.touchTarget\.minimum/
  );
});
test('work order and request list retry actions meet the QPM minimum touch target', () => {
  for (const screen of [
    'screens/workOrders/WorkOrdersScreen.tsx',
    'screens/requests/RequestsScreen.tsx'
  ]) {
    const source = fs.readFileSync(path.join(__dirname, '..', screen), 'utf8');
    const retryButtons = [
      ...source.matchAll(
        /<Button\b[\s\S]*?>[\s\S]*?\{t\('retry'\)\}[\s\S]*?<\/Button>/g
      )
    ];

    assert.equal(
      retryButtons.length,
      3,
      `${screen} should have three retry actions`
    );
    for (const [button] of retryButtons) {
      assert.match(
        button,
        /style=\{styles\.retryButton\}/,
        `${screen} retry button should use the shared style`
      );
    }
    assert.match(
      source,
      /retryButton:\s*\{\s*minHeight:\s*qpmLayoutTokens\.touchTarget\.minimum/
    );
  }
});
test('failed task saves expose a retry action with the QPM minimum touch target', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components/SingleTask.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /taskSaveStatus === 'error'[\s\S]*?<Button[\s\S]*?style=\{styles\.retryButton\}/
  );
  assert.match(
    source,
    /retryButton:\s*\{\s*minHeight:\s*qpmLayoutTokens\.touchTarget\.minimum/
  );
});
test('task note save exposes its busy state and QPM prominent touch target', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components/SingleTask.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /style=\{styles\.saveNotesButton\}[\s\S]*?loading=\{savingNotes\}[\s\S]*?accessibilityState=\{\{\s*busy: savingNotes,\s*disabled: savingNotes \|\| isTaskReadOnly/
  );
  assert.match(
    source,
    /saveNotesButton:\s*\{[\s\S]*?minHeight:\s*qpmLayoutTokens\.touchTarget\.prominent/
  );
});
test('home scan action uses the QPM prominent touch target', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/HomeScreen.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /<Button[\s\S]*?accessibilityLabel=\{t\('to_scan'\)\}[\s\S]*?style=\{styles\.scanButton\}/
  );
  assert.match(
    source,
    /scanButton:\s*\{\s*minHeight:\s*qpmLayoutTokens\.touchTarget\.prominent/
  );
});
test('all mobile Searchbar controls expose a localized accessible name', () => {
  const screensRoot = path.join(__dirname, '..', 'screens');
  const screenFiles = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (/\.tsx?$/.test(entry.name)) screenFiles.push(entryPath);
    }
  };
  visit(screensRoot);

  const searchbars = screenFiles.flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return [...source.matchAll(/<Searchbar\b[\s\S]*?\/>/g)].map(
      ([searchbar]) => ({ file, searchbar })
    );
  });

  assert.ok(searchbars.length > 0, 'expected mobile Searchbar controls');
  for (const { file, searchbar } of searchbars) {
    assert.match(
      searchbar,
      /accessibilityLabel=\{t\('search'\)\}/,
      `${path.relative(
        screensRoot,
        file
      )} Searchbar must expose the localized search label`
    );
  }
});
test('primary mobile links and controls use the shared 48 dp touch target', () => {
  const files = [
    'screens/workOrders/components/EnumFilter.tsx',
    'screens/workOrders/components/QuickFilter.tsx',
    'components/form/ScanIdentifierField.tsx',
    'components/BasicField.tsx',
    'components/ListField.tsx',
    'screens/assets/details/AssetDetails.tsx',
    'screens/HomeScreen.tsx',
    'screens/auth/AuthenticationScreen.tsx',
    'components/ImageViewer.tsx',
    'components/ImageViewer.web.tsx',
    'components/SingleTask.tsx'
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.match(
      source,
      /qpmLayoutTokens\.touchTarget\.minimum/,
      `${file} should use the shared minimum touch target`
    );
  }

  const workOrders = fs.readFileSync(
    path.join(__dirname, '..', 'screens/workOrders/WorkOrdersScreen.tsx'),
    'utf8'
  );
  const quickFilter = fs.readFileSync(
    path.join(__dirname, '..', 'screens/workOrders/components/QuickFilter.tsx'),
    'utf8'
  );
  assert.match(workOrders, /accessibilityLabel=\{t\('only_assigned_to_me'\)\}/);
  assert.match(quickFilter, /accessibilityRole="checkbox"/);
  assert.match(quickFilter, /accessibilityState=\{\{ checked: isSelected \}\}/);

  const singleTask = fs.readFileSync(
    path.join(__dirname, '..', 'components/SingleTask.tsx'),
    'utf8'
  );
  assert.match(singleTask, /accessibilityLabel=\{t\('toggle_numeric_sign'\)\}/);
  assert.match(
    singleTask,
    /textStyle=\{\{\s*minWidth: qpmLayoutTokens\.touchTarget\.minimum,\s*minHeight: qpmLayoutTokens\.touchTarget\.minimum/
  );

  const form = fs.readFileSync(
    path.join(__dirname, '..', 'components/form/index.tsx'),
    'utf8'
  );
  assert.match(
    form,
    /submitButton:\s*\{[\s\S]*?minHeight:\s*qpmLayoutTokens\.touchTarget\.prominent/
  );
});
test('notifications mark-all action meets the shared 48 dp header target', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/NotificationsScreen.tsx'),
    'utf8'
  );
  const headerAction = source.match(
    /headerRight: hasUnreadNotifications[\s\S]*?: undefined/
  );
  assert.ok(headerAction, 'expected the conditional mark-all header action');
  const button = headerAction[0].match(/<Pressable[\s\S]*?<\/Pressable>/);
  assert.ok(button, 'expected a Pressable mark-all action');
  assert.match(button[0], /minWidth: qpmLayoutTokens\.touchTarget\.minimum/);
  assert.match(button[0], /minHeight: qpmLayoutTokens\.touchTarget\.minimum/);
  assert.match(button[0], /accessibilityLabel=\{t\('mark_all_as_seen'\)\}/);
  assert.match(button[0], /accessibilityState=\{\{[\s\S]*?disabled/);
});
test('notifications mark-all action uses the aggregate unread count', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/NotificationsScreen.tsx'),
    'utf8'
  );
  assert.match(
    source,
    /const\s*\{[\s\S]*?notifications,[\s\S]*?unreadCount[\s\S]*?\}\s*=\s*useSelector/
  );
  assert.match(source, /getUnreadNotificationCount/);
  assert.match(
    source,
    /const hasUnreadNotifications =\s*\(unreadCount \?\? 0\) > 0 \|\|\s*notifications\.content\.some/
  );
  assert.match(
    source,
    /await dispatch\(readAllNotifications\(\)\);\s*await refreshUnreadCount\(\)/
  );
  assert.match(
    source,
    /await dispatch\(editNotification\(notification\.id, \{ seen: true \}\)\);\s*await refreshUnreadCount\(\)/
  );
  assert.match(
    source,
    /Promise\.all\(\[loadNotifications\(\), refreshUnreadCount\(\)\]\)/
  );
  assert.match(
    source,
    /unreadCountError && \([\s\S]*?mode="banner"[\s\S]*?notifications_load_error[\s\S]*?onRetry=\{\(\) => void refreshUnreadCount\(\)\}/
  );
});
test('work-order filter controls show semantic selected and unselected outlines', () => {
  const root = path.join(__dirname, '..');
  for (const file of [
    'screens/workOrders/components/EnumFilter.tsx',
    'screens/workOrders/components/QuickFilter.tsx'
  ]) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(
      source,
      /backgroundColor: isSelected\s*\?[\s\S]*?: theme\.colors\.surface/
    );
    assert.match(source, /borderWidth: 1/);
    assert.match(
      source,
      /borderColor: isSelected\s*\?\s*theme\.colors\.primary\s*:\s*theme\.colors\.controlOutline/
    );
  }

  const list = fs.readFileSync(
    path.join(root, 'screens/workOrders/WorkOrdersScreen.tsx'),
    'utf8'
  );
  assert.match(list, /accessibilityState=\{\{ selected: hasActiveFilters \}\}/);
  assert.match(list, /borderColor: theme\.colors\.controlOutline/);

  const requests = fs.readFileSync(
    path.join(root, 'screens/requests/RequestsScreen.tsx'),
    'utf8'
  );
  const resetButton = requests.match(
    /<IconButton\s+icon="close"[\s\S]*?onPress=\{\(\)\s*=>\s*onFilterChange\(defaultFilterFields\)\}/
  );
  assert.ok(resetButton, 'expected the Requests filter reset button');
  assert.match(resetButton[0], /theme\.colors\.controlOutline/);
  assert.match(resetButton[0], /qpmLayoutTokens\.touchTarget\.minimum/);
});
test('asset scanning waits for license verification and offers retry on failure', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/ScanAssetScreen.tsx'),
    'utf8'
  );

  assert.match(source, /await dispatch\(getLicenseValidity\(\)\)/);
  assert.match(
    source,
    /if \(isCheckingLicense\)[\s\S]*?mode="loading"[\s\S]*?return \(/
  );
  assert.match(source, /message=\{t\('license_load_error'\)\}/);
  assert.match(source, /onRetry=\{\(\)\s*=>\s*void loadLicense\(\)\}/);
});
test('scanned asset creation is offered only for a confirmed 404 and existing create permission', () => {
  const { shouldOfferAssetCreationAfterScan } =
    mobileRuntime().load('utils/assetScan.ts');

  assert.equal(shouldOfferAssetCreationAfterScan(404, true), true);
  assert.equal(shouldOfferAssetCreationAfterScan(404, false), false);
  for (const status of [400, 401, 403, 500, undefined, null, '404']) {
    assert.equal(shouldOfferAssetCreationAfterScan(status, true), false);
  }

  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/ScanAssetScreen.tsx'),
    'utf8'
  );
  assert.match(source, /shouldOfferAssetCreationAfterScan\(/);
  assert.match(source, /hasCreatePermission\(PermissionEntity\.ASSETS\)/);
});
test('asset scanner choices explain NFC and QR actions visually and accessibly', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/ScanAssetScreen.tsx'),
    'utf8'
  );
  const nfcItem = source.match(
    /<List\.Item\s+title=\{t\('NFC'\)\}[\s\S]*?onPress=/
  );
  const barcodeItem = source.match(
    /<List\.Item\s+title=\{t\('barcode'\) \+ '\/QR code'\}[\s\S]*?onPress=/
  );

  assert.ok(nfcItem, 'expected an NFC scanner action');
  assert.ok(barcodeItem, 'expected a barcode/QR scanner action');
  assert.match(nfcItem[0], /icon="nfc"/);
  assert.match(nfcItem[0], /description=\{t\('nfc_hold_near_device'\)\}/);
  assert.match(nfcItem[0], /accessibilityRole="button"/);
  assert.match(nfcItem[0], /accessibilityHint=\{t\('nfc_hold_near_device'\)\}/);
  assert.match(barcodeItem[0], /icon="barcode-scan"/);
  assert.match(barcodeItem[0], /description=\{t\('scan_barcode_hint'\)\}/);
  assert.match(barcodeItem[0], /accessibilityRole="button"/);
  assert.match(
    barcodeItem[0],
    /accessibilityHint=\{t\('scan_barcode_hint'\)\}/
  );
});
test('requester notification badge uses the aggregate unread count and stays accessible', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/requests/RequestsScreen.tsx'),
    'utf8'
  );

  assert.match(source, /const \{ unreadCount \} = useSelector/);
  assert.match(source, /dispatch\(getUnreadNotificationCount\(\)\)/);
  assert.doesNotMatch(source, /notifications\.content\.filter/);
  assert.match(source, /visible=\{unreadNotificationCount > 0\}/);
  assert.match(source, /accessible=\{false\}[\s\S]*?pointerEvents="none"/);
  assert.match(
    source,
    /accessibilityLabel=\{[\s\S]*?unread_notifications_count/
  );
  assert.match(source, /isFocused,[\s\S]*?user\.role\.code/);
  assert.match(source, /navigation\.navigate\('Settings'\)/);
  assert.doesNotMatch(source, /<Pressable[\s\S]*?<IconButton/);
});
test('Asset 360 meter section uses the meter permission-denied translation', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/assets/details/AssetMaintenance.tsx'),
    'utf8'
  );
  const meterSection = source.match(
    /section\.kind === 'meters' \? \(([\s\S]*?)\) : section\.kind === 'plans'/
  );

  assert.ok(meterSection, 'expected an Equipment 360 meter section');
  assert.match(meterSection[1], /'no_access_meters'/);
});
test('Asset 360 parts hides linked part data without the parts view permission', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/assets/details/AssetParts.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /hasViewPermission\(PermissionEntity\.PARTS_AND_MULTIPARTS\)/
  );
  assert.match(
    source,
    /data=\{canViewParts \? asset\.parts \?\? \[\] : \[\]\}/
  );
  assert.match(
    source,
    /t\(canViewParts \? 'no_parts' : 'no_access_inventory'\)/
  );
  assert.match(source, /!canViewParts\s*\|\|\s*!canEditAsset/);
});
test('Asset 360 action menu is hidden when the role has no available actions', () => {
  const { getAssetDetailsActionVisibility } = mobileRuntime().load(
    'utils/assetDetailsAccess.ts'
  );
  const noActions = getAssetDetailsActionVisibility({
    canEditAsset: false,
    canCreateWorkOrder: false,
    canCreateChildAsset: false,
    canDeleteAsset: false
  });
  const oneAction = getAssetDetailsActionVisibility({
    canEditAsset: false,
    canCreateWorkOrder: true,
    canCreateChildAsset: false,
    canDeleteAsset: false
  });
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/assets/details/index.tsx'),
    'utf8'
  );

  assert.equal(noActions.hasAnyAction, false);
  assert.equal(oneAction.hasAnyAction, true);
  assert.match(source, /asset && assetActionVisibility\.hasAnyAction \? \(/);
  assert.match(source, /: null/);
});
test('Part and meter detail menus are single controls and hidden without actions', () => {
  const partSource = fs.readFileSync(
    path.join(__dirname, '..', 'screens/parts/details/index.tsx'),
    'utf8'
  );
  const meterSource = fs.readFileSync(
    path.join(__dirname, '..', 'screens/meters/MeterDetails.tsx'),
    'utf8'
  );
  const partHeader = partSource.slice(
    partSource.indexOf('navigation.setOptions'),
    partSource.indexOf('const onDeleteSuccess')
  );
  const meterHeader = meterSource.slice(
    meterSource.indexOf('navigation.setOptions'),
    meterSource.indexOf('const onAddReading')
  );

  assert.match(
    partSource,
    /canOpenPartActions = Boolean\([\s\S]*?hasEditPermission[\s\S]*?hasDeletePermission/
  );
  assert.match(
    partSource,
    /headerRight: \(\) =>[\s\S]*?canOpenPartActions && part/
  );
  assert.match(
    meterSource,
    /canOpenMeterActions = Boolean\([\s\S]*?hasEditPermission[\s\S]*?hasDeletePermission/
  );
  assert.match(
    meterSource,
    /headerRight: \(\) =>[\s\S]*?canOpenMeterActions && meter/
  );
  for (const header of [partHeader, meterHeader]) {
    assert.doesNotMatch(header, /<Pressable/);
    assert.match(
      header,
      /<IconButton[\s\S]*?accessibilityLabel=\{t\('more_options'\)\}/
    );
    assert.match(header, /: null/);
  }
});
test('form selector hint icons are decorative inside their labelled action', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components/form/index.tsx'),
    'utf8'
  );
  const plusIcons =
    source.match(
      /<MaterialCommunityIcons[\s\S]*?name="plus-circle"[\s\S]*?accessible=\{false\}\s*\/>/g
    ) ?? [];

  assert.equal(plusIcons.length, 2);
  assert.match(
    source,
    /selectedValue \? 'check-circle' : 'plus-circle'[\s\S]*?accessible=\{false\}/
  );
  assert.doesNotMatch(source, /<IconButton[\s\S]*?icon=\{?['"]plus-circle/);
  assert.match(
    source,
    /accessibilityRole="button"[\s\S]*?accessibilityLabel=\{selectorAccessibilityLabel\}/
  );
});
test('task source chooser uses responsive accessible card actions', () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'screens/modals/SelectTasksOrChecklistModal.tsx'
    ),
    'utf8'
  );

  assert.match(source, /accessibilityRole="header"/);
  assert.match(source, /key=\{option\.screen\}/);
  assert.match(source, /accessible\s+accessibilityRole="button"/);
  assert.match(source, /accessibilityLabel=\{option\.label\}/);
  assert.match(source, /<Icon\s+source=\{option\.icon\}/);
  assert.doesNotMatch(source, /<IconButton/);
  assert.doesNotMatch(source, /fontSize:\s*50/);
  assert.match(source, /minHeight:\s*80/);
  assert.match(source, /qpmLayoutTokens\.touchTarget\.minimum/);
  assert.match(
    source,
    /navigation\.navigate\(option\.screen,\s*\{\s*onChange,\s*selected\s*\}\)/
  );
});
test('barcode scanner synchronously accepts only the first scan callback', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectBarcodeModal.tsx'),
    'utf8'
  );

  assert.match(source, /const scanHandledRef = useRef\(false\)/);
  assert.match(
    source,
    /if \(!appIsActiveRef\.current \|\| scanHandledRef\.current\) return;\s*scanHandledRef\.current = true;/
  );
});
test('NFC reader cancels in background and resumes after the pending read settles', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectNfcModal.tsx'),
    'utf8'
  );

  assert.match(source, /AppState\.addEventListener\(\s*'change'/);
  assert.match(source, /if \(nextState !== 'active'\)[\s\S]*?generation \+= 1/);
  assert.match(
    source,
    /NfcManager\.cancelTechnologyRequest\(\)\.catch\(\(\) => \{\}\)/
  );
  assert.match(source, /if \(!scanInFlight\) void scan\(\)/);
  assert.match(
    source,
    /finally \{\s*scanInFlight = false;\s*if \(!disposed && isForeground && !isTerminal\) void scan\(\)/
  );
  assert.match(source, /appStateSubscription\.remove\(\)/);
});
test('NFC reader announces its active scan to assistive technology', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectNfcModal.tsx'),
    'utf8'
  );

  assert.match(source, /accessibilityRole="progressbar"/);
  assert.match(source, /accessibilityLabel=\{t\('scanning'\)\}/);
});
test('form scan callbacks update identifiers without popping the parent form', () => {
  const form = fs.readFileSync(
    path.join(__dirname, '..', 'components/form/index.tsx'),
    'utf8'
  );
  const getFormScannerAction = (screenName) => {
    const start = form.indexOf(`navigate('${screenName}'`);
    const end = form.indexOf('\n                        />', start);
    return start >= 0 && end >= 0 ? form.slice(start, end) : '';
  };
  const barcodeScanner = getFormScannerAction('SelectBarcode');
  const nfcScanner = getFormScannerAction('SelectNfc');
  const barcodeModal = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectBarcodeModal.tsx'),
    'utf8'
  );
  const nfcModal = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectNfcModal.tsx'),
    'utf8'
  );

  assert.ok(barcodeScanner, 'expected the form barcode scanner callback');
  assert.ok(nfcScanner, 'expected the form NFC scanner callback');
  assert.match(barcodeScanner, /handleChange\(formik, field\.name, value\)/);
  assert.match(nfcScanner, /handleChange\(formik, field\.name, value\)/);
  assert.doesNotMatch(barcodeScanner, /navigation\.goBack\(\)/);
  assert.doesNotMatch(nfcScanner, /navigation\.goBack\(\)/);
  assert.match(barcodeModal, /navigation\.goBack\(\);\s*onChange\(data\)/);
  assert.match(nfcModal, /navigation\.goBack\(\);\s*onChange\(tagId\)/);
});
test('Android asset NFC scanning accepts NDEF and UID-capable technologies', () => {
  const { getAssetScanNfcTechnologies, isNfcSupportedOnPlatform } =
    mobileRuntime().load('utils/nfc.ts');
  const technologies = {
    Ndef: 'Ndef',
    NfcA: 'NfcA',
    NfcB: 'NfcB',
    NfcF: 'NfcF',
    NfcV: 'NfcV',
    IsoDep: 'IsoDep',
    MifareClassic: 'MifareClassic',
    MifareUltralight: 'MifareUltralight',
    NdefFormatable: 'NdefFormatable',
    MifareIOS: 'MifareIOS',
    Iso15693IOS: 'Iso15693IOS'
  };
  const scanner = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectNfcModal.tsx'),
    'utf8'
  );
  const scanScreen = fs.readFileSync(
    path.join(__dirname, '..', 'screens/ScanAssetScreen.tsx'),
    'utf8'
  );
  const form = fs.readFileSync(
    path.join(__dirname, '..', 'components/form/index.tsx'),
    'utf8'
  );
  const workOrderFields = fs.readFileSync(
    path.join(__dirname, '..', 'utils/fields.ts'),
    'utf8'
  );

  assert.equal(isNfcSupportedOnPlatform('android'), true);
  assert.equal(isNfcSupportedOnPlatform('ios'), true);
  assert.equal(isNfcSupportedOnPlatform('web'), false);

  assert.deepEqual(
    JSON.parse(JSON.stringify(getAssetScanNfcTechnologies(technologies))),
    [
      'Ndef',
      'NfcA',
      'NfcB',
      'NfcF',
      'NfcV',
      'IsoDep',
      'MifareClassic',
      'MifareUltralight',
      'NdefFormatable'
    ]
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(getAssetScanNfcTechnologies(technologies, 'ios'))
    ),
    ['MifareIOS', 'Iso15693IOS']
  );
  assert.match(
    scanner,
    /requestTechnology\(\s*getAssetScanNfcTechnologies\(NfcTech, Platform\.OS\)\s*\)/
  );
  assert.match(scanner, /Platform\.OS === 'web'/);
  assert.match(scanScreen, /isNfcSupportedOnPlatform\(Platform\.OS\)/);
  assert.match(form, /isNfcSupportedOnPlatform\(Platform\.OS\)/);
  assert.match(workOrderFields, /name: 'nfcId',[\s\S]*?type: 'nfc'/);
  assert.doesNotMatch(workOrderFields, /isIos|Platform\.OS/);
});
test('asset identifier fields use accessible scanner buttons', () => {
  const form = fs.readFileSync(
    path.join(__dirname, '..', 'components/form/index.tsx'),
    'utf8'
  );
  const scannerField = fs.readFileSync(
    path.join(__dirname, '..', 'components/form/ScanIdentifierField.tsx'),
    'utf8'
  );

  assert.match(form, /kind="nfc"[\s\S]*?hint=\{t\('nfc_hold_near_device'\)\}/);
  assert.match(form, /kind="barcode"[\s\S]*?hint=\{t\('scan_barcode_hint'\)\}/);
  assert.match(scannerField, /mode="outlined"/);
  assert.match(scannerField, /accessibilityRole="button"/);
  assert.match(
    scannerField,
    /accessibilityLabel=\{value \? `\$\{label\}, \$\{value\}` : label\}/
  );
  assert.match(scannerField, /accessibilityHint=\{hint\}/);
  assert.match(scannerField, /disabled=\{disabled\}/);
});
test('custom meter tasks submit the selected meter and expose one radio action per type', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectTasksModal.tsx'),
    'utf8'
  );

  assert.match(source, /meter: type === 'METER' \? meter : null/);
  assert.match(
    source,
    /<RadioButton\.Group[\s\S]*?onValueChange=\{onTaskTypeChange\}/
  );
  assert.match(source, /<RadioButton\.Item[\s\S]*?key=\{taskType\.value\}/);
  assert.doesNotMatch(source, /<TouchableOpacity[\s\S]*?<RadioButton/);
});
test('work order task execution is read-only when permission is missing or the WO is complete', () => {
  const details = fs.readFileSync(
    path.join(__dirname, '..', 'screens/workOrders/WODetailsScreen.tsx'),
    'utf8'
  );
  const screen = fs.readFileSync(
    path.join(__dirname, '..', 'screens/workOrders/TasksScreen.tsx'),
    'utf8'
  );
  const taskCard = fs.readFileSync(
    path.join(__dirname, '..', 'components/SingleTask.tsx'),
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

  assert.match(details, /isReadOnly: isWorkOrderTaskExecutionReadOnly\(/);
  assert.match(screen, /readOnly=\{isReadOnly\}/);
  assert.match(screen, /work_order_tasks_read_only/);
  assert.match(
    taskCard,
    /preview \|\| externallyReadOnly \|\| isTaskAssignedToAnotherUser/
  );
  assert.match(taskCard, /disabled=\{isTaskReadOnly\}/);
  assert.match(english, /work_order_tasks_read_only:/);
  assert.match(french, /work_order_tasks_read_only:/);
});
test('work order details show assigned contractors without technicians', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/workOrders/WODetailsScreen.tsx'),
    'utf8'
  );
  const sectionStart = source.indexOf('workOrder.assignedTo.length > 0 ||');
  const sectionEnd = source.indexOf(
    '!generalPreferences.simplifiedWorkOrder',
    sectionStart
  );
  const assignments = source.slice(sectionStart, sectionEnd);

  assert.notEqual(sectionStart, -1, 'expected combined assignment visibility');
  assert.notEqual(sectionEnd, -1, 'expected work order detail sections');
  assert.match(assignments, /workOrder\.customers\.length > 0/);
  assert.match(assignments, /t\('assigned_customers'\)/);
  assert.match(assignments, /workOrder\.assignedTo\.map/);
  assert.match(assignments, /workOrder\.customers\.map/);
  assert.doesNotMatch(assignments, /TouchableOpacity/);
});
test('Asset 360 identity links have accessible names and touch targets', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/assets/details/AssetDetails.tsx'),
    'utf8'
  );
  const identityRelations = source.slice(
    source.indexOf('{asset.primaryUser && ('),
    source.indexOf('<ListField', source.indexOf('{asset.primaryUser && ('))
  );

  assert.match(identityRelations, /accessibilityRole="link"/g);
  assert.match(
    identityRelations,
    /accessibilityLabel=\{`\$\{t\('primary_worker'\)\}:/
  );
  assert.match(
    identityRelations,
    /accessibilityLabel=\{`\$\{t\('location'\)\}:/
  );
  assert.match(identityRelations, /style=\{styles\.relatedObjectLink\}/g);
  assert.match(
    source,
    /relatedObjectLink:\s*\{\s*minHeight:\s*qpmLayoutTokens\.touchTarget\.minimum/
  );
});
test('location hierarchy action identifies its parent to screen readers', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/locations/LocationsScreen.tsx'),
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

  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /accessibilityLabel=\{t\('view_children_for_location'/);
  assert.match(
    source,
    /accessibilityHint=\{t\('view_child_locations_hint'\)\}/
  );
  assert.match(english, /view_children_for_location:/);
  assert.match(english, /view_child_locations_hint:/);
  assert.match(french, /view_children_for_location:/);
  assert.match(french, /view_child_locations_hint:/);
});
test('in-app camera overlays controls outside CameraView and handles lifecycle', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components/InAppCamera.tsx'),
    'utf8'
  );

  const cameraView = source.match(/<CameraView\s[\s\S]*?\/>/);
  assert.ok(cameraView, 'expected a self-closing CameraView');
  assert.match(cameraView[0], /style=\{StyleSheet\.absoluteFillObject\}/);
  assert.match(source, /AppState\.addEventListener\('change'/);
  assert.match(source, /!visible \|\|\s*!isAppActive/);
  assert.match(source, /visible && isAppActive \? \(/);
  assert.match(source, /onCameraReady=\{\(\) => \{/);
  assert.match(source, /cameraMountError \? \(/);
  assert.match(source, /<CameraPreviewError/);
  assert.match(source, /camera_preview_loading/);
  assert.match(source, /disabled=\{capturing \|\| !cameraReady\}/);
  assert.match(source, /onRequestClose=\{onClose\}/);
  assert.match(source, /refreshPermission\(\)/);
});
test('barcode scanner reports camera preview mount failures and allows retry', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectBarcodeModal.tsx'),
    'utf8'
  );

  assert.match(source, /onMountError=\{\(event\) => \{/);
  assert.match(source, /if \(cameraMountError\)/);
  assert.match(source, /<CameraPreviewError/);
  assert.match(source, /onOpenSettings=\{\(\) => \{/);
  assert.match(
    source,
    /openedSettingsRef\.current = true;[\s\S]*?Linking\.openSettings\(\)/
  );
  assert.match(source, /active=\{isAppActive\}/);
  assert.match(
    source,
    /appIsActiveRef = useRef\(AppState\.currentState === 'active'\)/
  );
  assert.match(source, /useState\(\s*AppState\.currentState === 'active'\s*\)/);
  assert.match(source, /facing="back"/);
  assert.match(source, /barcodeScannerSettings=\{\{/);
  assert.match(source, /barcodeTypes: \[[\s\S]*?'qr'/);
  assert.match(source, /\{isAppActive \? \([\s\S]*?<CameraView/);
  assert.match(source, /appIsActiveRef\.current\) setCameraReady\(true\)/);
  assert.match(source, /AppState\.addEventListener\('change'/);
  assert.match(source, /setCameraReady\(false\);\s*return;/);
  assert.match(
    source,
    /if \(permission\.granted\) \{\s*setCameraReady\(false\);\s*setCameraMountError\(false\);/
  );
  assert.match(
    source,
    /setTimeout\(\(\) => setCameraMountError\(true\), 12000\)/
  );
  assert.match(source, /!cameraReady \? \(/);
  assert.match(source, /camera_preview_loading/);
  assert.match(source, /Camera preview mount failed/);
});
test('barcode scanner exposes a safe-area-aware close action while previewing', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectBarcodeModal.tsx'),
    'utf8'
  );

  assert.match(
    source,
    /import \{ SafeAreaView \} from 'react-native-safe-area-context'/
  );
  assert.match(source, /<SafeAreaView[\s\S]*?edges=\{\['top'\]\}/);
  assert.match(
    source,
    /<IconButton[\s\S]*?icon="close"[\s\S]*?onPress=\{\(\) => navigation\.goBack\(\)\}[\s\S]*?accessibilityLabel=\{t\('go_back'\)\}/
  );
  assert.match(
    source,
    /controlsSafeArea:\s*\{\s*\.\.\.StyleSheet\.absoluteFillObject/
  );
});
test('shared camera preview error is themed and offers retry and exit actions', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components/CameraPreviewError.tsx'),
    'utf8'
  );

  assert.match(source, /backgroundColor: theme\.colors\.background/);
  assert.match(source, /color: theme\.colors\.onSurface/);
  assert.match(source, /t\('camera_preview_error'\)/);
  assert.match(source, /onPress=\{onRetry\}/);
  assert.match(source, /onOpenSettings \? \([\s\S]*?t\('open_settings'\)/);
  assert.match(source, /onPress=\{onClose\}/);
});
test('barcode permission denial explains recovery and exposes retry, settings and exit', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components/CameraPermissionError.tsx'),
    'utf8'
  );
  const scanner = fs.readFileSync(
    path.join(__dirname, '..', 'screens/modals/SelectBarcodeModal.tsx'),
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
  const permissions = fs.readFileSync(
    path.join(__dirname, '..', 'utils/mediaPermissions.ts'),
    'utf8'
  );

  assert.match(source, /backgroundColor: theme\.colors\.background/);
  assert.match(source, /color: theme\.colors\.onSurface/);
  assert.match(source, /t\('camera_permission_explanation'\)/);
  assert.match(source, /t\('retry'\)/);
  assert.match(source, /t\('open_settings'\)/);
  assert.match(source, /t\('go_back'\)/);
  assert.match(
    source,
    /action:\s*\{[^}]*minHeight:\s*qpmLayoutTokens\.touchTarget\.minimum/s
  );
  assert.match(
    source,
    /onPress=\{onOpenSettings\}[\s\S]*?style=\{styles\.action\}/
  );
  assert.match(source, /onPress=\{onClose\}[\s\S]*?style=\{styles\.action\}/);
  assert.match(scanner, /<CameraPermissionError/);
  assert.match(scanner, /permissionRequestRef\.current\) return/);
  assert.match(scanner, /AppState\.addEventListener\('change'/);
  assert.match(
    scanner,
    /if \(!isActive\) \{[\s\S]*?setCameraReady\(false\);\s*return;/
  );
  assert.match(scanner, /if \(!openedSettingsRef\.current\) return/);
  assert.match(scanner, /Camera\.getCameraPermissionsAsync\(\)/);
  assert.match(scanner, /subscription\.remove\(\)/);
  assert.match(permissions, /presentAlerts = true/);
  assert.match(
    permissions,
    /ensureScannerCameraPermission[\s\S]*?presentAlerts: false/
  );
  assert.match(permissions, /if \(!presentAlerts\) \{\s*return false/);
  assert.match(english, /camera_permission_explanation:/);
  assert.match(french, /camera_permission_explanation:/);
});
test('camera preview error is localized in French and English', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components/CameraPreviewError.tsx'),
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

  assert.match(english, /camera_preview_error:/);
  assert.match(french, /camera_preview_error:/);
  assert.match(english, /camera_preview_loading:/);
  assert.match(french, /camera_preview_loading:/);
  assert.match(
    source,
    /action:\s*\{[^}]*minHeight:\s*qpmLayoutTokens\.touchTarget\.minimum/s
  );
  assert.match(source, /onPress=\{onRetry\}[\s\S]*?style=\{styles\.action\}/);
  assert.match(source, /onPress=\{onClose\}[\s\S]*?style=\{styles\.action\}/);
});
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
test('stale related IDs in saved WO filters keep their value and render safely', () => {
  const { getLabelAndValue } = mobileRuntime().load('utils/filter.ts');
  const filters = [
    {
      field: 'assignedTo',
      operation: 'in',
      value: '',
      values: [37, 99]
    }
  ];
  const users = [{ id: 37, firstName: 'Aïssata', lastName: 'Diallo' }];
  const values = getLabelAndValue(
    filters,
    users,
    'assignedTo',
    null,
    (user) => `${user.firstName} ${user.lastName}`
  );

  assert.deepEqual(JSON.parse(JSON.stringify(values)), [
    { label: 'Aïssata Diallo', value: 37 },
    { label: '#99', value: 99 }
  ]);
  assert.deepEqual(filters[0].values, [37, 99]);
});
test('shared search fields remain intact across successive query updates', () => {
  const { onSearchQueryChange } = mobileRuntime().load('utils/overall.ts');
  const fields = ['name', 'customId', 'description'];
  let criteria = {
    filterFields: [{ field: 'status', operation: 'eq', value: 'OPEN' }]
  };
  let searchQuery = '';
  const setCriteria = (update) => {
    criteria = typeof update === 'function' ? update(criteria) : update;
  };
  const setSearchQuery = (query) => {
    searchQuery = query;
  };

  onSearchQueryChange('pump', criteria, setCriteria, setSearchQuery, fields);
  onSearchQueryChange('pump 2', criteria, setCriteria, setSearchQuery, fields);

  assert.deepEqual(fields, ['name', 'customId', 'description']);
  assert.equal(searchQuery, 'pump 2');
  assert.deepEqual(JSON.parse(JSON.stringify(criteria.filterFields)), [
    { field: 'status', operation: 'eq', value: 'OPEN' },
    {
      field: 'name',
      value: 'pump 2',
      operation: 'cn',
      alternatives: [
        { field: 'customId', operation: 'cn', value: 'pump 2' },
        { field: 'description', operation: 'cn', value: 'pump 2' }
      ]
    }
  ]);
});
test('clearing WO or request search keeps focused search ready for new text', () => {
  for (const screen of [
    'screens/workOrders/WorkOrdersScreen.tsx',
    'screens/requests/RequestsScreen.tsx'
  ]) {
    const source = fs.readFileSync(path.join(__dirname, '..', screen), 'utf8');
    const clearAction = source.match(
      /const clearSearchAndFilters = \(\) => \{[\s\S]*?\n  \};/
    );

    assert.ok(clearAction, `${screen}: expected the combined clear action`);
    assert.match(clearAction[0], /setStartedSearch\(true\)/, screen);
    assert.match(clearAction[0], /setSearchQuery\(''\)/, screen);
    assert.match(
      clearAction[0],
      /setCriteria\(getCriteriaFromFilterFields\(\[\]\)\)/,
      screen
    );
  }
});
test('compliance stats show no data when there are no completed work orders', () => {
  const { formatComplianceRateDisplay } =
    mobileRuntime().load('utils/analytics.ts');

  assert.equal(formatComplianceRateDisplay(1, 0), '—');
  assert.equal(formatComplianceRateDisplay(0, 0), '—');
  assert.equal(formatComplianceRateDisplay(0.875, 8), '87.50%');
  assert.equal(formatComplianceRateDisplay(Number.NaN, 8), '—');
});
test('stale meter search responses cannot replace the latest filtered results', async () => {
  const pending = [];
  const runtime = mobileRuntime({
    apiMock: {
      post: () => new Promise((resolve) => pending.push(resolve))
    }
  });
  const { reducer, getMeters } = runtime.load('slices/meter.ts');
  let state = reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = reducer(state, action)), action);
  const criteria = (value) => ({
    filterFields: [{ field: 'name', operation: 'cn', value }],
    pageSize: 10,
    pageNum: 0,
    direction: 'DESC'
  });
  const page = (id) => ({
    content: [{ id, name: `Meter ${id}` }],
    last: true,
    totalElements: 1,
    numberOfElements: 1,
    empty: false
  });

  const olderRequest = dispatch(getMeters(criteria('pump')));
  const newerRequest = dispatch(getMeters(criteria('pump 2')));
  assert.equal(state.listLoading, true);
  assert.equal(state.loadingGet, false);

  pending[1](page(2));
  await newerRequest;
  pending[0](page(1));
  await olderRequest;

  assert.deepEqual(
    state.meters.content.map((meter) => meter.id),
    [2]
  );
  assert.equal(state.listLoading, false);
});
test('asset search and pagination ignore responses from an older filter', async () => {
  const pending = [];
  const runtime = mobileRuntime({
    apiMock: {
      post: () => new Promise((resolve) => pending.push(resolve))
    }
  });
  const module = runtime.load('slices/asset.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = module.reducer(state, action)), action);
  const criteria = (value) => ({
    filterFields: [{ field: 'name', operation: 'cn', value }],
    pageSize: 10,
    pageNum: 0,
    direction: 'DESC'
  });
  const page = (id, last = true) => ({
    content: [{ id, name: `Asset ${id}` }],
    last,
    totalElements: 2,
    numberOfElements: 1,
    empty: false
  });

  const staleSearch = dispatch(module.getAssets(criteria('pump')));
  const latestSearch = dispatch(module.getAssets(criteria('pump 2')));
  pending[1](page(2, false));
  await latestSearch;
  pending[0](page(1, false));
  await staleSearch;
  assert.deepEqual(
    state.assets.content.map((asset) => asset.id),
    [2]
  );

  const stalePage = dispatch(module.getMoreAssets(criteria('pump 2'), 1));
  const refreshedSearch = dispatch(module.getAssets(criteria('pump 3')));
  pending[3](page(3));
  await refreshedSearch;
  pending[2](page(99));
  await stalePage;
  assert.deepEqual(
    state.assets.content.map((asset) => asset.id),
    [3]
  );
  assert.equal(state.currentPageNum, 0);
  assert.equal(state.listLoading, false);
  assert.equal(state.loadingGet, false);
});
test('location search and pagination ignore responses from an older filter', async () => {
  const pending = [];
  const runtime = mobileRuntime({
    apiMock: {
      post: () =>
        new Promise((resolve, reject) => pending.push({ resolve, reject }))
    }
  });
  const module = runtime.load('slices/location.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = module.reducer(state, action)), action);
  const criteria = (value) => ({
    filterFields: [{ field: 'name', operation: 'cn', value }],
    pageSize: 10,
    pageNum: 0,
    direction: 'DESC'
  });
  const page = (id, last = true) => ({
    content: [{ id, name: `Location ${id}` }],
    last,
    totalElements: 2,
    numberOfElements: 1,
    empty: false
  });

  const staleSearch = dispatch(module.getLocations(criteria('line')));
  const latestSearch = dispatch(module.getLocations(criteria('line 2')));
  pending[1].resolve(page(2, false));
  await latestSearch;
  pending[0].resolve(page(1, false));
  await staleSearch;
  assert.deepEqual(
    state.locations.content.map((location) => location.id),
    [2]
  );

  const stalePage = dispatch(module.getMoreLocations(criteria('line 2'), 1));
  const refreshedSearch = dispatch(module.getLocations(criteria('line 3')));
  pending[3].resolve(page(3));
  await refreshedSearch;
  pending[2].resolve(page(99));
  await stalePage;
  assert.deepEqual(
    state.locations.content.map((location) => location.id),
    [3]
  );
  assert.equal(state.currentPageNum, 0);
  assert.equal(state.listLoading, false);
  assert.equal(state.loadingGet, false);
});
test('location list releases its loading state after an API error', async () => {
  const module = mobileRuntime({
    apiMock: {
      post: async () => {
        throw new Error('Server unavailable');
      }
    }
  }).load('slices/location.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = module.reducer(state, action)), action);

  await assert.rejects(
    dispatch(
      module.getLocations({
        filterFields: [],
        pageSize: 10,
        pageNum: 0,
        direction: 'DESC'
      })
    ),
    /Server unavailable/
  );
  assert.equal(state.listLoading, false);
  assert.equal(state.loadingGet, false);
});
for (const directory of [
  {
    name: 'people',
    sliceName: 'slices/user.ts',
    stateKey: 'users',
    firstPageThunk: 'getUsers',
    nextPageThunk: 'getMoreUsers'
  },
  {
    name: 'teams',
    sliceName: 'slices/team.ts',
    stateKey: 'teams',
    firstPageThunk: 'getTeams',
    nextPageThunk: 'getMoreTeams'
  }
]) {
  test(`${directory.name} search and pagination ignore stale responses`, async () => {
    const pending = [];
    const runtime = mobileRuntime({
      apiMock: {
        post: () => new Promise((resolve) => pending.push(resolve))
      }
    });
    const module = runtime.load(directory.sliceName);
    let state = module.reducer(undefined, { type: '@@init' });
    const dispatch = (action) =>
      typeof action === 'function'
        ? action(dispatch, () => state, null)
        : ((state = module.reducer(state, action)), action);
    const criteria = (value) => ({
      filterFields: [{ field: 'name', operation: 'cn', value }],
      pageSize: 10,
      pageNum: 0,
      direction: 'DESC'
    });
    const page = (id, last = true) => ({
      content: [{ id, name: `${directory.name} ${id}` }],
      last,
      totalElements: 2,
      numberOfElements: 1,
      empty: false
    });

    const staleSearch = dispatch(
      module[directory.firstPageThunk](criteria('old'))
    );
    const latestSearch = dispatch(
      module[directory.firstPageThunk](criteria('current'))
    );
    pending[1](page(2, false));
    await latestSearch;
    pending[0](page(1, false));
    await staleSearch;
    assert.deepEqual(
      state[directory.stateKey].content.map((entry) => entry.id),
      [2]
    );

    const stalePage = dispatch(
      module[directory.nextPageThunk](criteria('current'), 1)
    );
    const refreshedSearch = dispatch(
      module[directory.firstPageThunk](criteria('refreshed'))
    );
    pending[3](page(3));
    await refreshedSearch;
    pending[2](page(99));
    await stalePage;
    assert.deepEqual(
      state[directory.stateKey].content.map((entry) => entry.id),
      [3]
    );
    assert.equal(state.currentPageNum, 0);
    assert.equal(state.listLoading, false);
    assert.equal(state.loadingGet, false);
  });
}
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

test('dashboard work-order analytics follow the existing role view scope', () => {
  const {
    canNavigateDashboardWorkOrders,
    getDashboardWorkOrderScope,
    withDashboardWorkOrderScope
  } = mobileRuntime().load('utils/analytics.ts');

  assert.equal(getDashboardWorkOrderScope(false, false), null);
  assert.equal(getDashboardWorkOrderScope(true, false, false), true);
  assert.equal(getDashboardWorkOrderScope(true, true), null);
  assert.equal(getDashboardWorkOrderScope(true, true, false), false);
  assert.equal(getDashboardWorkOrderScope(true, true, true), true);
  assert.equal(canNavigateDashboardWorkOrders(null, 23), false);
  assert.equal(canNavigateDashboardWorkOrders(true, null), false);
  assert.equal(canNavigateDashboardWorkOrders(true, 23), true);
  assert.equal(canNavigateDashboardWorkOrders(false, null), true);

  const existingFilters = [
    { field: 'status', operation: 'in', values: ['OPEN'] }
  ];
  assert.equal(
    withDashboardWorkOrderScope(existingFilters, false, 23),
    existingFilters
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(withDashboardWorkOrderScope(existingFilters, true, 23))
    ),
    [
      { field: 'status', operation: 'in', values: ['OPEN'] },
      { field: 'assignedToUser', operation: 'eq', value: 23 }
    ]
  );
  assert.deepEqual(existingFilters, [
    { field: 'status', operation: 'in', values: ['OPEN'] }
  ]);
});

test('dashboard analytics and navigation respect permission and resolved work-order scope', () => {
  const home = fs.readFileSync(
    path.join(__dirname, '..', 'screens/HomeScreen.tsx'),
    'utf8'
  );
  const stats = fs.readFileSync(
    path.join(__dirname, '..', 'screens/WorkOrderStatsScreen.tsx'),
    'utf8'
  );

  assert.match(home, /hasViewPermission\(PermissionEntity\.WORK_ORDERS\)/);
  assert.match(home, /disabled=\{!canOpenWorkOrderList\}/);
  assert.match(
    home,
    /accessibilityState=\{\{ disabled: !canOpenWorkOrderList \}\}/
  );
  assert.doesNotMatch(
    home,
    /if \(userSettings\) \{\s*navigation\.navigate\('WorkOrders'/
  );
  assert.match(
    home,
    /onPress=\{\(\) => \{\s*if \(!canOpenWorkOrderList\) return;\s*navigation\.navigate\('WorkOrders'/
  );
  assert.match(home, /if \(isFocused && workOrderScope !== null\)/);
  assert.match(home, /withDashboardWorkOrderScope\(/);
  assert.match(stats, /getMobileOverviewStats\(workOrderScope\)/);
  assert.match(stats, /getDashboardWorkOrderScope\(/);
  assert.match(stats, /withDashboardWorkOrderScope\(/);
  assert.match(
    stats,
    /if \(!canViewWorkOrders\)[\s\S]*?mode="permissionDenied"/
  );
});

test('home dashboard handles notification load failures and offers retry', () => {
  const home = fs.readFileSync(
    path.join(__dirname, '..', 'screens/HomeScreen.tsx'),
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

  assert.match(home, /dispatch\(getUnreadNotificationCount\(\)\)/);
  assert.match(home, /unreadCountError: notificationsLoadError/);
  assert.doesNotMatch(home, /notifications\.content\.filter/);
  assert.match(
    home,
    /notificationsLoadError && \([\s\S]*?notifications_load_error/
  );
  assert.match(
    home,
    /onRetry=\{\(\) => void loadUnreadNotificationCount\(\)\}/
  );
  assert.match(home, /notificationsLoading/);
  assert.match(english, /notifications_load_error:/);
  assert.match(french, /notifications_load_error:/);
});

test('home notification bell announces its count once and keeps the badge decorative', () => {
  const home = fs.readFileSync(
    path.join(__dirname, '..', 'screens/HomeScreen.tsx'),
    'utf8'
  );
  const notificationAction = home.match(
    /<View style=\{\{ \.\.\.iconButtonStyle, position: 'relative' \}\}>[\s\S]*?<\/View>/
  );

  assert.ok(notificationAction, 'expected the home notification control');
  assert.match(notificationAction[0], /unreadNotificationCount/);
  assert.match(notificationAction[0], /<Badge\s+accessible=\{false\}/);
  assert.match(notificationAction[0], /pointerEvents="none"/);
});
test('asset scan stays available while NetInfo is unknown and blocks confirmed offline states', () => {
  const { canAttemptOnlineAction } = mobileRuntime().load(
    'utils/networkAvailability.ts'
  );

  assert.equal(
    canAttemptOnlineAction({ isConnected: null, isInternetReachable: null }),
    true
  );
  assert.equal(
    canAttemptOnlineAction({ isConnected: true, isInternetReachable: null }),
    true
  );
  assert.equal(
    canAttemptOnlineAction({ isConnected: true, isInternetReachable: true }),
    true
  );
  assert.equal(
    canAttemptOnlineAction({ isConnected: false, isInternetReachable: null }),
    false
  );
  assert.equal(
    canAttemptOnlineAction({ isConnected: true, isInternetReachable: false }),
    false
  );

  const home = fs.readFileSync(
    path.join(__dirname, '..', 'screens/HomeScreen.tsx'),
    'utf8'
  );
  assert.match(home, /canAttemptOnlineAction\(netInfo\)/);
  assert.match(home, /showSnackBar\(t\('no_internet_connection'\), 'error'\)/);
});

test('shared form gives multiline text fields a four-line editing area', () => {
  const form = fs.readFileSync(
    path.join(__dirname, '..', 'components/form/index.tsx'),
    'utf8'
  );

  assert.match(form, /field\.multiple && styles\.multilineTextInput/);
  assert.match(form, /multiline=\{field\.multiple\}/);
  assert.match(form, /numberOfLines=\{field\.multiple \? 4 : undefined\}/);
  assert.match(form, /multilineTextInput: \{ minHeight: 112 \}/);
});

test('equipment, location, part and WO association hints use localized labels', () => {
  const { getAssetFields, getLocationFields, getPartFields } =
    mobileRuntime().load('utils/fields.ts');
  const { getWOBaseFields } = mobileRuntime().load('utils/woBase.ts');
  const t = (key) => `translated:${key}`;
  const placeholder = (fields, name) =>
    fields.find((field) => field.name === name && field.placeholder)
      ?.placeholder;

  assert.equal(
    placeholder(getAssetFields(t), 'assignedTo'),
    'translated:additional_workers_description'
  );
  assert.equal(
    placeholder(getAssetFields(t), 'teams'),
    'translated:select_teams'
  );
  assert.equal(
    placeholder(getAssetFields(t), 'customers'),
    'translated:customers_description'
  );
  assert.equal(
    placeholder(getLocationFields(t), 'vendors'),
    'translated:select_vendors'
  );
  assert.equal(
    placeholder(getLocationFields(t), 'customers'),
    'translated:select_customers'
  );
  assert.equal(
    placeholder(getPartFields(t), 'assignedTo'),
    'translated:select_workers'
  );
  assert.equal(
    placeholder(getPartFields(t), 'teams'),
    'translated:select_teams'
  );
  assert.equal(
    placeholder(getWOBaseFields(t), 'location'),
    'translated:select_location'
  );
  assert.equal(
    placeholder(getWOBaseFields(t), 'asset'),
    'translated:select_asset'
  );
  assert.equal(
    placeholder(getWOBaseFields(t), 'team'),
    'translated:select_team'
  );
});

test('existing tab deep-link paths resolve to QPM Home and Work Orders tabs', () => {
  const linking = mobileRuntime().load(
    'navigation/LinkingConfiguration.ts'
  ).default;
  const tabScreens = linking.config.screens.Root.screens;

  assert.equal(tabScreens.Home, 'one');
  assert.equal(tabScreens.WorkOrders, 'two');
  assert.equal(tabScreens.TabOneScreen, undefined);
  assert.equal(tabScreens.TabTwoScreen, undefined);
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

  assert.deepEqual(getEnumFilterStatuses([], 'status', options), [
    false,
    false,
    false,
    false
  ]);
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
test('reopen affordance requires a completed work order and the dedicated client permission', () => {
  const { canReopenCompletedWorkOrder } = mobileRuntime().load(
    'utils/workOrderLifecycle.ts'
  );
  const access = {
    status: 'COMPLETE',
    roleType: 'ROLE_CLIENT',
    superAccountRelationCount: 0,
    editOtherPermissions: ['REOPEN_WORK_ORDERS']
  };

  assert.equal(canReopenCompletedWorkOrder(access), true);
  assert.equal(
    canReopenCompletedWorkOrder({ ...access, status: 'IN_PROGRESS' }),
    false
  );
  assert.equal(
    canReopenCompletedWorkOrder({ ...access, roleType: 'ROLE_SUPER_ADMIN' }),
    false
  );
  assert.equal(
    canReopenCompletedWorkOrder({ ...access, superAccountRelationCount: 1 }),
    false
  );
  assert.equal(
    canReopenCompletedWorkOrder({
      ...access,
      editOtherPermissions: ['WORK_ORDERS']
    }),
    false
  );
  assert.equal(
    canReopenCompletedWorkOrder({ ...access, editOtherPermissions: undefined }),
    false
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
test('French login and column-matching validation messages are translated', () => {
  const french = mobileRuntime().load('i18n/translations/fr.ts').default;
  assert.equal(french.id_required, 'L’identifiant est obligatoire.');
  assert.equal(
    french.match_at_least_column,
    'Correspondre à au moins une colonne'
  );
});
test('French locale defines every English interface translation key', () => {
  const english = mobileRuntime().load('i18n/translations/en.ts').default;
  const french = mobileRuntime().load('i18n/translations/fr.ts').default;
  const missingFrenchKeys = Object.keys(english).filter(
    (key) => typeof french[key] !== 'string' || !french[key].trim()
  );

  assert.deepEqual(missingFrenchKeys, []);
});
test('French feedback form labels do not fall back to the English label', () => {
  const french = mobileRuntime().load('i18n/translations/fr.ts').default;
  assert.equal(french.feedback, 'Commentaire');
  assert.notEqual(french.feedback, 'Feedback');
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
test('stale notification pagination cannot append after a refresh', async () => {
  const pending = [];
  const runtime = mobileRuntime({
    apiMock: { post: () => new Promise((resolve) => pending.push(resolve)) }
  });
  const module = runtime.load('slices/notification.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = module.reducer(state, action)), action);
  const criteria = { filterFields: [], pageSize: 15, pageNum: 0 };
  const page = (content, last = false) => ({
    ...state.notifications,
    content,
    last,
    totalElements: content.length,
    numberOfElements: content.length,
    empty: content.length === 0
  });

  const first = dispatch(module.getNotifications(criteria));
  pending[0](page([{ id: 1 }]));
  await first;

  const staleNextPage = dispatch(module.getMoreNotifications(criteria, 1));
  const refresh = dispatch(module.getNotifications(criteria));
  pending[2](page([{ id: 3 }], true));
  await refresh;
  pending[1](page([{ id: 2 }]));
  await staleNextPage;

  assert.deepEqual(
    state.notifications.content.map((notification) => notification.id),
    [3]
  );
  assert.equal(state.currentPageNum, 0);
  assert.equal(state.loadingGet, false);
});
test('unread notification count uses the aggregate API and exposes failures', async () => {
  const requests = [];
  let resolveRefresh;
  const runtime = mobileRuntime({
    apiMock: {
      post: (url, body) => {
        requests.push({ url, body });
        if (requests.length === 1)
          return Promise.resolve({ totalElements: 42 });
        return new Promise((resolve) => {
          resolveRefresh = resolve;
        });
      }
    }
  });
  const module = runtime.load('slices/notification.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = module.reducer(state, action)), action);

  await dispatch(module.getUnreadNotificationCount());

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'notifications/search');
  assert.deepEqual(JSON.parse(JSON.stringify(requests[0].body)), {
    filterFields: [{ field: 'seen', operation: 'eq', value: false }],
    pageSize: 1,
    pageNum: 0,
    direction: 'DESC'
  });
  assert.equal(state.unreadCount, 42);
  assert.equal(state.unreadCountLoading, false);
  assert.equal(state.unreadCountError, false);

  const refresh = dispatch(module.getUnreadNotificationCount());
  assert.equal(state.unreadCount, 42, 'keep the known total while refreshing');
  assert.equal(state.unreadCountLoading, true);
  resolveRefresh({ totalElements: 43 });
  await refresh;
  assert.equal(state.unreadCount, 43);
  assert.equal(state.unreadCountLoading, false);

  const failingRuntime = mobileRuntime({
    apiMock: {
      post: async () => {
        throw new Error('offline');
      }
    }
  });
  const failingModule = failingRuntime.load('slices/notification.ts');
  let failingState = failingModule.reducer(undefined, { type: '@@init' });
  const failingDispatch = (action) =>
    typeof action === 'function'
      ? action(failingDispatch, () => failingState, null)
      : ((failingState = failingModule.reducer(failingState, action)), action);

  await failingDispatch(failingModule.getUnreadNotificationCount());
  assert.equal(failingState.unreadCount, null);
  assert.equal(failingState.unreadCountLoading, false);
  assert.equal(failingState.unreadCountError, true);
});
test('notification refresh and pagination request sequences reject stale finishes', () => {
  const { beginRequest, isCurrentRequest } = mobileRuntime().load(
    'utils/requestSequence.ts'
  );
  const refreshSequence = { current: 0 };
  const paginationSequence = { current: 0 };
  const firstRefresh = beginRequest(refreshSequence);
  const nextPage = beginRequest(paginationSequence);
  const secondRefresh = beginRequest(refreshSequence);
  const refreshInvalidatesPage = beginRequest(paginationSequence);

  assert.equal(isCurrentRequest(firstRefresh, refreshSequence), false);
  assert.equal(isCurrentRequest(secondRefresh, refreshSequence), true);
  assert.equal(isCurrentRequest(nextPage, paginationSequence), false);
  assert.equal(
    isCurrentRequest(refreshInvalidatesPage, paginationSequence),
    true
  );
});
test('preventive maintenance refresh supersedes an in-flight page response', async () => {
  const { beginRequest, isCurrentRequest } = mobileRuntime().load(
    'utils/requestSequence.ts'
  );
  const sequence = { current: 0 };
  let visibleIds = [10];
  const pending = [];
  const loadPage = (append) => {
    const requestId = beginRequest(sequence);
    return new Promise((resolve) => pending.push(resolve)).then((page) => {
      if (!isCurrentRequest(requestId, sequence)) return;
      visibleIds = append ? [...visibleIds, ...page] : page;
    });
  };

  const oldPage = loadPage(true);
  const refresh = loadPage(false);
  pending[1]([30]);
  await refresh;
  pending[0]([20]);
  await oldPage;

  assert.deepEqual(visibleIds, [30]);
  assert.equal(isCurrentRequest(1, sequence), false);
});
test('work order refresh invalidates pagination and older refresh indicators', () => {
  const { beginRequest, isCurrentRequest } = mobileRuntime().load(
    'utils/requestSequence.ts'
  );
  const firstPageSequence = { current: 0 };
  const paginationSequence = { current: 0 };
  const refreshSequence = { current: 0 };
  const activePage = beginRequest(paginationSequence);
  const firstRefresh = beginRequest(refreshSequence);
  beginRequest(firstPageSequence);
  beginRequest(paginationSequence);
  const secondRefresh = beginRequest(refreshSequence);

  assert.equal(isCurrentRequest(activePage, paginationSequence), false);
  assert.equal(isCurrentRequest(firstRefresh, refreshSequence), false);
  assert.equal(isCurrentRequest(secondRefresh, refreshSequence), true);
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
test('request list refresh invalidates pagination locks and stale refresh finishes', () => {
  const { beginRequest, isCurrentRequest } = mobileRuntime().load(
    'utils/requestSequence.ts'
  );
  const firstPageSequence = { current: 0 };
  const paginationSequence = { current: 0 };
  const refreshSequence = { current: 0 };
  let paginationLocked = true;
  let refreshing = true;

  const staleFirstPage = firstPageSequence.current;
  const stalePage = beginRequest(paginationSequence);
  beginRequest(firstPageSequence);
  beginRequest(paginationSequence);
  paginationLocked = false;

  const currentRefresh = beginRequest(refreshSequence);
  const nextPage = beginRequest(paginationSequence);
  paginationLocked = true;
  if (
    isCurrentRequest(staleFirstPage, firstPageSequence) &&
    isCurrentRequest(stalePage, paginationSequence)
  ) {
    paginationLocked = false;
  }
  assert.equal(paginationLocked, true);

  const olderRefresh = beginRequest(refreshSequence);
  const newerRefresh = beginRequest(refreshSequence);
  if (isCurrentRequest(olderRefresh, refreshSequence)) refreshing = false;
  assert.equal(refreshing, true);
  if (isCurrentRequest(newerRefresh, refreshSequence)) refreshing = false;
  assert.equal(refreshing, false);
  assert.equal(isCurrentRequest(nextPage, paginationSequence), true);
});
test('parts list ignores stale search and pagination responses', async () => {
  const pending = [];
  const runtime = mobileRuntime({
    apiMock: { post: () => new Promise((resolve) => pending.push(resolve)) }
  });
  const module = runtime.load('slices/part.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = module.reducer(state, action)), action);
  const criteria = { filterFields: [], pageSize: 10, pageNum: 0 };
  const page = (content, last = false) => ({
    ...state.parts,
    content,
    last,
    totalElements: content.length,
    numberOfElements: content.length,
    empty: content.length === 0
  });

  const staleSearch = dispatch(module.getParts(criteria));
  const currentSearch = dispatch(
    module.getParts({
      ...criteria,
      filterFields: [{ field: 'name', operation: 'contains', value: 'Valve' }]
    })
  );
  assert.equal(state.listLoading, true);
  assert.equal(state.loadingGet, false);
  pending[1](page([{ id: 22, name: 'Current valve' }]));
  await currentSearch;
  pending[0](page([{ id: 11, name: 'Old pump' }]));
  await staleSearch;

  const stalePage = dispatch(module.getMoreParts(criteria, 1));
  const refresh = dispatch(
    module.getParts({
      ...criteria,
      filterFields: [{ field: 'name', operation: 'contains', value: 'Pump' }]
    })
  );
  pending[3](page([{ id: 33, name: 'Refreshed pump' }], true));
  await refresh;
  pending[2](page([{ id: 99, name: 'Stale page' }], true));
  await stalePage;

  assert.deepEqual(
    state.parts.content.map((part) => part.id),
    [33]
  );
  assert.equal(state.currentPageNum, 0);
  assert.equal(state.listLoading, false);
  assert.equal(state.loadingGet, false);
});
test('parts mini catalog ends its dedicated loading state after failure', async () => {
  const runtime = mobileRuntime({
    apiMock: {
      get: async () => Promise.reject(new Error('Network unavailable'))
    }
  });
  const module = runtime.load('slices/part.ts');
  let state = module.reducer(undefined, { type: '@@init' });
  const dispatch = (action) =>
    typeof action === 'function'
      ? action(dispatch, () => state, null)
      : ((state = module.reducer(state, action)), action);

  await assert.rejects(dispatch(module.getPartsMini()), /Network unavailable/);
  assert.equal(state.partsMiniLoading, false);
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
test('detail overflow actions use one accessible control and require visible actions', () => {
  const screens = [
    [
      'vendorsCustomers/details/VendorDetailsScreen.tsx',
      'canOpenVendorActions'
    ],
    [
      'vendorsCustomers/details/CustomerDetailsScreen.tsx',
      'canOpenCustomerActions'
    ],
    ['locations/details/index.tsx', 'canOpenLocationActions'],
    ['assets/details/index.tsx', 'assetActionVisibility.hasAnyAction'],
    ['meters/MeterDetails.tsx', 'canOpenMeterActions'],
    ['parts/details/index.tsx', 'canOpenPartActions']
  ];

  for (const [relativePath, visibilityCheck] of screens) {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'screens', relativePath),
      'utf8'
    );
    assert.match(
      source,
      /<IconButton[\s\S]*?accessibilityLabel=\{t\('more_options'\)\}/
    );
    assert.match(
      source,
      new RegExp(visibilityCheck.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );
    assert.doesNotMatch(source, /<Pressable[\s\S]*?<IconButton/);
  }
});
test('compound mobile controls do not nest separately interactive icons', () => {
  const read = (relativePath) =>
    fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const fileUpload = read('components/FileUpload.tsx');
  const uploadStart = fileUpload.indexOf('<TouchableOpacity');
  const uploadControl = fileUpload.slice(
    uploadStart,
    fileUpload.indexOf('</TouchableOpacity>', uploadStart)
  );
  assert.ok(uploadStart >= 0, 'expected file upload action');
  assert.doesNotMatch(uploadControl, /<IconButton/);

  const comment = read('components/CommentItem.tsx');
  const otherFilesStart = comment.indexOf('otherFiles.map((file) => (');
  const otherFilesRow = comment.slice(
    otherFilesStart,
    comment.indexOf('</TouchableOpacity>', otherFilesStart)
  );
  assert.ok(otherFilesStart >= 0, 'expected comment attachment list');
  assert.doesNotMatch(otherFilesRow, /<IconButton/);

  const enumFilter = read('screens/workOrders/components/EnumFilter.tsx');
  assert.doesNotMatch(enumFilter, /<Checkbox/);

  const assets = read('screens/modals/SelectAssetsModal.tsx');
  const backStart = assets.indexOf('<Pressable onPress={navigateHierarchyUp}');
  const backControl = assets.slice(
    backStart,
    assets.indexOf('</Pressable>', backStart)
  );
  assert.ok(backStart >= 0, 'expected hierarchy back control');
  assert.doesNotMatch(backControl, /<IconButton/);
});

test('preventive maintenance history actions meet touch and screen reader targets', () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'screens/preventiveMaintenance/PreventiveMaintenanceDetailsScreen.tsx'
    ),
    'utf8'
  );

  assert.match(
    source,
    /<Button\s+compact\s+style=\{styles\.relatedWorkOrderButton\}/
  );
  assert.match(
    source,
    /relatedWorkOrderButton:\s*\{\s*minHeight:\s*qpmLayoutTokens\.touchTarget\.minimum/
  );
  assert.equal(
    (source.match(/style=\{styles\.loadMoreButton\}/g) || []).length,
    2,
    'both paginated history sections should use the touch-target style'
  );
  assert.match(
    source,
    /accessibilityLabel=\{`\$\{t\('load_more'\)\}\s+\$\{t\(\s*'pm_call_register'\s*\)\}`\}/
  );
  assert.match(
    source,
    /accessibilityLabel=\{`\$\{t\('load_more'\)\}\s+\$\{t\(\s*'recent_work_orders'\s*\)\}`\}/
  );
  assert.match(
    source,
    /loadMoreButton:\s*\{\s*minHeight:\s*qpmLayoutTokens\.touchTarget\.minimum/
  );
});

test('primary mobile workflow section titles are announced as screen reader headers', () => {
  const read = (relativePath) =>
    fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const assertHeader = (source, contentPattern, context) => {
    assert.match(
      source,
      new RegExp(
        `<Text\\b(?=[^>]*accessibilityRole="header")[^>]*>[\\s\\S]{0,220}${contentPattern}`
      ),
      context
    );
  };

  assertHeader(
    read('screens/HomeScreen.tsx'),
    "\\{t\\('work_orders'\\)\\}",
    'dashboard work-order section'
  );
  const workOrderDetails = read('screens/workOrders/WODetailsScreen.tsx');
  assertHeader(
    workOrderDetails,
    "\\{t\\('work_order_lifecycle_history'\\)\\}",
    'work-order lifecycle section'
  );
  assertHeader(
    workOrderDetails,
    "\\{t\\('audio_description'\\)\\}",
    'work-order audio section'
  );
  const requestDetails = read('screens/requests/RequestDetails.tsx');
  assertHeader(
    requestDetails,
    "\\{t\\('request_details'\\)\\}",
    'request details section'
  );
  assertHeader(
    requestDetails,
    "\\{t\\('audio_description'\\)\\}",
    'request audio section'
  );
  assertHeader(
    read('screens/assets/details/AssetDetails.tsx'),
    "\\{t\\('child_assets'\\)\\}",
    'asset hierarchy section'
  );
  const pmDetails = read(
    'screens/preventiveMaintenance/PreventiveMaintenanceDetailsScreen.tsx'
  );
  assertHeader(pmDetails, '\\{pm.name\\}', 'preventive plan identity');
  assert.match(
    pmDetails,
    /renderSectionHeader=\{\(\{ section \}\) => \(\s*<Text\s+variant="titleLarge"\s+style=\{styles\.sectionTitle\}\s+accessibilityRole="header"/
  );
});
