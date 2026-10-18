const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/theme/tokens.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;
const moduleExports = {};
vm.runInNewContext(source, { exports: moduleExports, require });

const luminance = (color) => {
  const channels = color
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrastRatio = (foreground, background) => {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
};

test('brand and navigation text pairs meet WCAG AA for normal text', () => {
  const { qpmBrandTokens, qpmNavigationTokens } = moduleExports;
  const pairs = [
    ['brand button text', '#FFFFFF', qpmBrandTokens.primary],
    [
      'active navigation text',
      qpmNavigationTokens.activeText,
      qpmNavigationTokens.active
    ],
    [
      'navigation hover text',
      qpmNavigationTokens.text,
      qpmNavigationTokens.hover
    ],
    ['navigation text', qpmNavigationTokens.text, qpmNavigationTokens.sidebar],
    [
      'muted navigation text',
      qpmNavigationTokens.mutedText,
      qpmNavigationTokens.sidebar
    ]
  ];

  for (const [name, foreground, background] of pairs) {
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${name} contrast is below 4.5:1`
    );
  }
});

test('web sidebar keeps one subtle shell edge and accessible navigation targets', () => {
  const sidebar = fs.readFileSync(
    'src/layouts/ExtendedSidebarLayout/Sidebar/index.tsx',
    'utf8'
  );
  const menu = fs.readFileSync(
    'src/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/index.tsx',
    'utf8'
  );

  assert.match(
    sidebar,
    /borderRight: `1px solid \$\{theme\.sidebar\.dividerBg\}`/
  );
  assert.doesNotMatch(sidebar, /\bDivider\b/);
  assert.match(sidebar, /<Logo white\s*\/>/);
  assert.match(menu, /min-height: 44px/);
  assert.match(menu, /border-radius: \$\{theme\.general\.borderRadius\}/);
  assert.match(menu, /&:focus-visible/);
  assert.match(
    menu,
    /outline: 2px solid \$\{theme\.sidebar\.menuItemColorActive\}/
  );
  assert.match(menu, /&\.active:focus-visible/);
  assert.match(menu, /&\.active:before/);
  const item = fs.readFileSync(
    'src/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/item.tsx',
    'utf8'
  );
  assert.match(item, /className=\{clsx\(\{ active \}\)\}/);
  assert.match(item, /aria-current=\{active \? 'page' : undefined\}/);
  assert.match(item, /aria-expanded=\{menuToggle\}/);
  assert.match(item, /aria-controls=\{submenuId\}/);
});

test('sidebar surface is visually distinct from the application canvas', () => {
  const { qpmBrandTokens, qpmNavigationTokens } = moduleExports;
  assert.notEqual(qpmNavigationTokens.sidebar, qpmBrandTokens.canvas);
});

test('indigo sidebar text, muted labels, hover and active states meet WCAG AA', () => {
  const { qpmNavigationTokens } = moduleExports;
  const pairs = [
    ['navigation text', qpmNavigationTokens.text, qpmNavigationTokens.sidebar],
    [
      'muted navigation text',
      qpmNavigationTokens.mutedText,
      qpmNavigationTokens.sidebar
    ],
    ['hover text', qpmNavigationTokens.text, qpmNavigationTokens.hover],
    [
      'active navigation text',
      qpmNavigationTokens.activeText,
      qpmNavigationTokens.active
    ]
  ];
  for (const [name, foreground, background] of pairs) {
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${name} contrast is below 4.5:1`
    );
  }
});

test('light semantic status badge pairs meet WCAG AA for normal text', () => {
  const statusTokenSets = [
    moduleExports.qpmWorkOrderStatusTokens,
    moduleExports.qpmRequestStatusTokens
  ];

  for (const tokenSet of statusTokenSets) {
    for (const [status, token] of Object.entries(tokenSet)) {
      assert.ok(
        contrastRatio(token.foreground, token.background) >= 4.5,
        `${status} status contrast is below 4.5:1`
      );
    }
  }
});

test('priority badge colors use the actual semantic background and meet WCAG AA', () => {
  const { qpmPriorityTokens } = moduleExports;
  const priorityComponent = fs.readFileSync(
    'src/content/own/components/PriorityWrapper.tsx',
    'utf8'
  );

  for (const [priority, token] of Object.entries(qpmPriorityTokens)) {
    assert.ok(
      contrastRatio(token.foreground, token.background) >= 4.5,
      `${priority} priority contrast is below 4.5:1`
    );
  }
  assert.match(priorityComponent, /qpmPriorityTokens\[priority\]/);
  assert.match(priorityComponent, /backgroundColor: tokens\.background/);
  assert.match(priorityComponent, /color: tokens\.foreground/);
  assert.doesNotMatch(priorityComponent, /getContrastText/);
});

test('request priority chart uses the same semantic colors as priority badges', () => {
  const chart = fs.readFileSync(
    'src/content/own/Analytics/Request/Analysis/RequestStatsByPriority.tsx',
    'utf8'
  );

  assert.match(chart, /qpmPriorityTokens\.HIGH\.foreground/);
  assert.match(chart, /qpmPriorityTokens\.MEDIUM\.foreground/);
  assert.match(chart, /qpmPriorityTokens\.LOW\.foreground/);
  assert.match(chart, /qpmPriorityTokens\.DEFAULT\.foreground/);
  assert.doesNotMatch(chart, /theme\.colors\.(error|warning|success)\.main/);
});

test('work-order analytics keep priority labels, colors, and values aligned', () => {
  const incomplete = fs.readFileSync(
    'src/content/own/Analytics/WorkOrder/Status/IncompleteWO.tsx',
    'utf8'
  );
  const completed = fs.readFileSync(
    'src/content/own/Analytics/WorkOrder/Analysis/WOByPriority.tsx',
    'utf8'
  );

  assert.match(incomplete, /getPriorityLabel\('HIGH', t\)/);
  assert.match(incomplete, /getPriorityLabel\('MEDIUM', t\)/);
  assert.match(incomplete, /getPriorityLabel\('LOW', t\)/);
  assert.match(incomplete, /getPriorityLabel\('NONE', t\)/);
  assert.match(
    incomplete,
    /estimatedHours: incompleteByPriority\.none\.estimatedHours/
  );
  assert.match(incomplete, /qpmPriorityTokens\.HIGH\.foreground/);
  assert.match(completed, /qpmPriorityTokens\[priority\]\?\.foreground/);
  assert.doesNotMatch(completed, /getRandomColor/);
});

test('preventive maintenance and inventory detail labels use theme-aware text', () => {
  const files = [
    'src/content/own/PreventiveMaintenance/PMDetails.tsx',
    'src/content/own/Inventory/Sets.tsx',
    'src/content/own/Inventory/Parts.tsx',
    'src/content/own/Inventory/PartDetails.tsx',
    'src/content/own/WorkOrders/Details/TimeSection.tsx',
    'src/content/own/WorkOrders/Details/CostSection.tsx',
    'src/content/own/Locations/LocationDetails.tsx',
    'src/content/own/UserProfile/MyCards.tsx'
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /theme\.colors\.alpha\.black\[70\]/, file);
  }
  const profileCards = fs.readFileSync(
    'src/content/own/UserProfile/MyCards.tsx',
    'utf8'
  );
  assert.doesNotMatch(profileCards, /theme\.colors\.alpha\.black\[(5|30)\]/);
  assert.match(profileCards, /theme\.palette\.action\.hover/);
  assert.match(profileCards, /theme\.palette\.background\.paper/);
});

test('preventive work-order history uses the shared semantic status badge', () => {
  const source = fs.readFileSync(
    'src/content/own/PreventiveMaintenance/RecentWorkOrders.tsx',
    'utf8'
  );

  assert.match(
    source,
    /<WorkOrderStatusChip status=\{workOrder\.status\}\s*\/>/
  );
  assert.doesNotMatch(source, /theme\.colors\.success\.main/);
  assert.doesNotMatch(source, /theme\.colors\.warning\.main/);
});

test('request portal field icons use theme-aware colors', () => {
  const source = fs.readFileSync(
    'src/content/own/Settings/Features/RequestPortal/components/RequestPortalModal.tsx',
    'utf8'
  );

  assert.match(
    source,
    /const color = config\.enabled\s*\? theme\.palette\.primary\.main\s*:\s*theme\.palette\.text\.disabled/
  );
  assert.doesNotMatch(source, /config\.enabled\s*\?\s*['"]#000000['"]/);
});

test('work-order analytics charts use the centralized status colors', () => {
  const daily = fs.readFileSync(
    'src/content/own/Analytics/WorkOrder/Status/StatusByDate.tsx',
    'utf8'
  );
  const distribution = fs.readFileSync(
    'src/content/own/Analytics/WorkOrder/Status/WOStatusPie.tsx',
    'utf8'
  );

  for (const source of [daily, distribution]) {
    assert.match(source, /qpmWorkOrderStatusTokens\.OPEN\.foreground/);
    assert.match(source, /qpmWorkOrderStatusTokens\.IN_PROGRESS\.foreground/);
    assert.match(source, /qpmWorkOrderStatusTokens\.ON_HOLD\.foreground/);
    assert.doesNotMatch(source, /theme\.colors\.(success|warning)\.main/);
  }
  assert.match(daily, /qpmWorkOrderStatusTokens\.COMPLETE\.foreground/);
});

test('shared multi-tab layout uses theme-aware surfaces and text', () => {
  const source = fs.readFileSync(
    'src/content/own/components/MultipleTabsLayout.tsx',
    'utf8'
  );

  assert.doesNotMatch(source, /theme\.colors\.alpha\.(black|white)/);
  assert.match(source, /theme\.palette\.background\.paper/);
  assert.match(source, /theme\.palette\.divider/);
  assert.match(source, /theme\.palette\.text\.secondary/);
  assert.match(source, /theme\.palette\.text\.primary/);
});

test('shared dashboard gauge and header popovers use theme-aware text', () => {
  const files = [
    'src/components/Gauge/index.tsx',
    'src/layouts/ExtendedSidebarLayout/Header/Search/index.tsx',
    'src/layouts/ExtendedSidebarLayout/Header/Userbox/index.tsx'
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(
      source,
      /theme\.colors\.alpha\.black\[(50|100)\]/,
      file
    );
    assert.match(source, /theme\.palette\.text\.(primary|secondary)/, file);
  }

  const gauge = fs.readFileSync(files[0], 'utf8');
  assert.doesNotMatch(gauge, /theme\.colors\.alpha\.black\[10\]/);
  assert.match(gauge, /theme\.palette\.divider/);
});

test('shared overlays, work-order comments, and search controls follow the active theme', () => {
  const cases = [
    [
      'src/components/Scrollbar/index.tsx',
      /theme\.palette\.divider/,
      /theme\.palette\.action\.active/
    ],
    [
      'src/content/own/WorkOrders/Details/CommentItem.tsx',
      /theme\.palette\.background\.paper/,
      /theme\.palette\.divider/
    ],
    [
      'src/content/own/PeopleAndTeams/UserDetailsDrawer.tsx',
      /theme\.palette\.action\.hover/,
      /theme\.palette\.divider/
    ],
    [
      'src/layouts/ExtendedSidebarLayout/Header/Buttons/Chat/index.tsx',
      /theme\.palette\.background\.paper/,
      /theme\.palette\.action\.hover/
    ],
    [
      'src/content/pages/Status/ComingSoon/index.tsx',
      /theme\.palette\.background\.paper/,
      /theme\.palette\.text\.secondary/
    ],
    [
      'src/content/pages/Status/Status404/index.tsx',
      /theme\.palette\.background\.paper/,
      /text\.secondary/
    ]
  ];

  for (const [file, surfaceToken, secondaryToken] of cases) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, surfaceToken, file);
    assert.match(source, secondaryToken, file);
    assert.doesNotMatch(
      source,
      /theme\.colors\.alpha\.(black|white)\[(5|10|30|50|100)\]/,
      file
    );
  }
});

test('shared labels, data-grid headings, and task cards use theme surfaces', () => {
  const cases = [
    ['src/components/Label/index.tsx', /theme\.palette\.action\.hover/, 5],
    [
      'src/content/own/components/CustomDatagrid/index.tsx',
      /theme\.palette\.action\.hover/,
      10
    ],
    [
      'src/content/own/components/form/SelectTasks/SingleTask.tsx',
      /theme\.palette\.action\.hover/,
      5
    ]
  ];

  for (const [file, token, legacyAlpha] of cases) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, token, file);
    assert.doesNotMatch(
      source,
      new RegExp(`theme\\.colors\\.alpha\\.black\\[${legacyAlpha}\\]`),
      file
    );
    if (file.includes('SingleTask')) {
      assert.doesNotMatch(source, /backgroundColor:\s*'white'/, file);
    }
  }
});

test('registration and alternating settings fields use semantic surfaces', () => {
  const registration = fs.readFileSync(
    'src/content/pages/Auth/Register/Wizard/index.tsx',
    'utf8'
  );
  assert.match(registration, /theme\.palette\.action\.hover/);
  assert.doesNotMatch(registration, /theme\.colors\.alpha\.black\[5\]/);

  const settings = fs.readFileSync(
    'src/content/own/Settings/components/GrayWhiteSelector.tsx',
    'utf8'
  );
  assert.match(settings, /theme\.palette\.action\.hover/);
  assert.match(settings, /theme\.palette\.background\.paper/);
  assert.doesNotMatch(settings, /backgroundColor:\s*'white'/);
});
