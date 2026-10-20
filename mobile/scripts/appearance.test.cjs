const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { mobileRuntime } = require('./mobile-test-runtime.cjs');

const {
  createAsyncWriteQueue,
  parseAppearancePreference,
  resolveAppearanceScheme
} = mobileRuntime().load('utils/appearance.ts');
const { qpmDesignTokens, qpmLayoutTokens } =
  mobileRuntime().load('theme/tokens.ts');
const { createQpmPaperColors } = mobileRuntime().load('theme/paperColors.ts');
const { createQpmActionSheetContainerStyle } = mobileRuntime().load(
  'theme/actionSheet.ts'
);
const {
  getPriorityColor,
  getPriorityForegroundColor,
  getStatusContainerColor,
  getStatusColor,
  getStatusForegroundColor
} = mobileRuntime().load('utils/overall.ts');
const { getWorkOrderTimerColors, getWorkOrderTimerLabel } =
  mobileRuntime().load('utils/workOrderTimer.ts');

function luminance(hex) {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('appearance preference safely defaults invalid stored values to system', () => {
  assert.equal(parseAppearancePreference(null), 'system');
  assert.equal(parseAppearancePreference('auto'), 'system');
  assert.equal(parseAppearancePreference('system'), 'system');
});

test('all appearance choices meet the QPM minimum touch target', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/SettingsScreen.tsx'),
    'utf8'
  );
  const appearanceOptions = [
    ...source.matchAll(
      /value: '(system|light|dark)'[\s\S]*?style: styles\.appearanceOption/g
    )
  ];

  assert.deepEqual(
    appearanceOptions.map((match) => match[1]),
    ['system', 'light', 'dark']
  );
  assert.match(
    source,
    /appearanceOption:\s*\{\s*minHeight:\s*qpmLayoutTokens\.touchTarget\.minimum/
  );
});

test('QPM layout radius scale distinguishes controls, cards and dashboard cards', () => {
  assert.equal(qpmLayoutTokens.radius.control, 10);
  assert.equal(qpmLayoutTokens.radius.card, 16);
  assert.equal(qpmLayoutTokens.radius.cardLarge, 18);
  assert.equal(qpmLayoutTokens.radius.sheet, 24);
});

test('QPM touch target tokens meet the field minimum and primary action size', () => {
  assert.equal(qpmLayoutTokens.touchTarget.minimum, 48);
  assert.equal(qpmLayoutTokens.touchTarget.prominent, 56);
});

test('QPM themes expose the semantic shadow color through Paper', () => {
  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    assert.match(colors.shadow, /^#[0-9A-F]{6}$/i);
    assert.equal(
      createQpmPaperColors({}, colors).shadow,
      colors.shadow,
      `${mode}.shadow`
    );
  }
});

test('system appearance follows device changes while explicit choices remain fixed', () => {
  assert.equal(resolveAppearanceScheme('system', 'dark'), 'dark');
  assert.equal(resolveAppearanceScheme('system', 'light'), 'light');
  assert.equal(resolveAppearanceScheme('light', 'dark'), 'light');
  assert.equal(resolveAppearanceScheme('dark', 'light'), 'dark');
});

test('appearance preference writes are serialized in selection order', async () => {
  const enqueueWrite = createAsyncWriteQueue();
  const completed = [];
  let releaseFirstWrite;
  const firstWrite = new Promise((resolve) => {
    releaseFirstWrite = resolve;
  });

  const first = enqueueWrite(async () => {
    await firstWrite;
    completed.push('light');
  });
  const second = enqueueWrite(async () => {
    completed.push('dark');
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(completed, []);
  releaseFirstWrite();
  await Promise.all([first, second]);
  assert.deepEqual(completed, ['light', 'dark']);
});

test('Paper interactive outlines use the accessible control token, not card borders', () => {
  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    const paperColors = createQpmPaperColors(
      { outline: '#000000', outlineVariant: '#000000' },
      colors
    );

    assert.equal(paperColors.outline, colors.controlOutline, `${mode}.outline`);
    assert.equal(
      paperColors.controlOutline,
      colors.controlOutline,
      `${mode}.controlOutline`
    );
    assert.equal(
      paperColors.outlineVariant,
      colors.borderSubtle,
      `${mode}.outlineVariant`
    );
  }
});

test('Paper tertiary roles stay paired with QPM information colors', () => {
  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    const paperColors = createQpmPaperColors({}, colors);

    assert.equal(paperColors.tertiary, colors.info, `${mode}.tertiary`);
    assert.equal(paperColors.onTertiary, colors.onInfo, `${mode}.onTertiary`);
    assert.equal(
      paperColors.tertiaryContainer,
      colors.tertiaryContainer,
      `${mode}.tertiaryContainer`
    );
    assert.equal(
      paperColors.onTertiaryContainer,
      colors.textPrimary,
      `${mode}.onTertiaryContainer`
    );
    assert.ok(
      contrastRatio(paperColors.onTertiary, paperColors.tertiary) >= 4.5,
      `${mode}.onTertiary`
    );
    assert.ok(
      contrastRatio(
        paperColors.onTertiaryContainer,
        paperColors.tertiaryContainer
      ) >= 4.5,
      `${mode}.onTertiaryContainer`
    );
  }
});

test('mobile navigation colors derive from QPM theme surfaces and brand accent', () => {
  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    const paperColors = createQpmPaperColors({}, colors);

    assert.equal(
      paperColors.navigationSurface,
      colors.surface,
      `${mode}.surface`
    );
    assert.equal(
      paperColors.onNavigationSurface,
      colors.textPrimary,
      `${mode}.onNavigationSurface`
    );
    assert.equal(
      paperColors.navigationActive,
      colors.brandPrimary,
      `${mode}.navigationActive`
    );
    assert.equal(
      paperColors.onNavigationActive,
      colors.onPrimary,
      `${mode}.onNavigationActive`
    );
  }
});

test('action sheet containers use the active QPM theme surface', () => {
  for (const mode of ['light', 'dark']) {
    assert.equal(
      createQpmActionSheetContainerStyle(qpmDesignTokens[mode].surface)
        .backgroundColor,
      qpmDesignTokens[mode].surface,
      `${mode}.actionSheet.background`
    );
  }
});

test('primary and secondary text tokens meet AA contrast on their base surfaces', () => {
  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    assert.ok(
      contrastRatio(colors.brandPrimary, colors.surface) >= 4.5,
      `${mode}.brandPrimary`
    );
    assert.ok(contrastRatio(colors.textPrimary, colors.surface) >= 4.5, mode);
    assert.ok(contrastRatio(colors.textSecondary, colors.surface) >= 4.5, mode);
    assert.ok(
      contrastRatio(colors.onPrimary, colors.brandPrimary) >= 4.5,
      `${mode}.onPrimary`
    );
    assert.ok(
      contrastRatio(colors.textPrimary, colors.surfaceBrandSubtle) >= 4.5,
      `${mode}.secondaryContainer`
    );
    assert.ok(
      contrastRatio(colors.secondary, colors.surface) >= 4.5,
      `${mode}.secondary`
    );
    assert.ok(
      contrastRatio(colors.onSecondary, colors.secondary) >= 4.5,
      `${mode}.onSecondary`
    );
    assert.ok(
      contrastRatio(colors.primaryAlt, colors.surface) >= 4.5,
      `${mode}.primaryAlt`
    );
    assert.ok(
      contrastRatio(colors.textPrimary, colors.tertiaryContainer) >= 4.5,
      `${mode}.tertiaryContainer`
    );
    assert.ok(
      contrastRatio(colors.neutral, colors.surface) >= 4.5,
      `${mode}.neutral`
    );
    assert.ok(
      contrastRatio(colors.onNeutral, colors.neutral) >= 4.5,
      `${mode}.onNeutral`
    );
    assert.ok(
      contrastRatio(colors.onBrandHeader, colors.brandHeader) >= 4.5,
      `${mode}.onBrandHeader`
    );
    assert.ok(
      contrastRatio(colors.mutedOnBrandHeader, colors.brandHeader) >= 4.5,
      `${mode}.mutedOnBrandHeader`
    );
  }
});

test('work order timer controls use readable start and stop color pairs', () => {
  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    const timerColors = {
      primary: colors.brandPrimary,
      onPrimary: colors.onPrimary,
      error: colors.error,
      onError: colors.onError,
      surfaceDisabled: createQpmPaperColors({}, colors).surfaceDisabled,
      onSurfaceDisabled: createQpmPaperColors({}, colors).onSurfaceDisabled
    };
    const startColors = getWorkOrderTimerColors(timerColors, false);
    const stopColors = getWorkOrderTimerColors(timerColors, true);
    assert.ok(
      contrastRatio(startColors.foreground, startColors.background) >= 4.5,
      `${mode}.timerStart`
    );
    assert.ok(
      contrastRatio(stopColors.foreground, stopColors.background) >= 4.5,
      `${mode}.timerStop`
    );
    assert.equal(startColors.background, colors.brandPrimary, mode);
    assert.equal(stopColors.background, colors.error, mode);

    const disabledColors = getWorkOrderTimerColors(timerColors, false, true);
    assert.equal(
      disabledColors.background,
      timerColors.surfaceDisabled,
      `${mode}.timerDisabledBackground`
    );
    assert.equal(
      disabledColors.foreground,
      timerColors.onSurfaceDisabled,
      `${mode}.timerDisabledForeground`
    );
  }
});

test('expanded work order timer explains the first start action', () => {
  assert.equal(
    getWorkOrderTimerLabel(true, false, undefined, 'Run Timer'),
    'Run Timer'
  );
  assert.equal(
    getWorkOrderTimerLabel(true, false, '0:12', 'Run Timer'),
    '0:12'
  );
  assert.equal(getWorkOrderTimerLabel(true, true, '0:12', 'Run Timer'), '0:12');
  assert.equal(
    getWorkOrderTimerLabel(false, false, undefined, 'Run Timer'),
    undefined
  );
});

test('running work order timer keeps elapsed time visible after scrolling', () => {
  assert.equal(
    getWorkOrderTimerLabel(false, true, '12:34', 'Run Timer'),
    '12:34'
  );
  assert.equal(
    getWorkOrderTimerLabel(false, true, undefined, 'Run Timer'),
    undefined
  );
  assert.equal(
    getWorkOrderTimerLabel(false, false, '12:34', 'Run Timer'),
    undefined
  );
});

test('semantic text remains readable on every QPM content surface', () => {
  const textSurfaces = [
    'canvas',
    'surface',
    'surfaceRaised',
    'surfaceBrandSubtle',
    'tertiaryContainer'
  ];

  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    for (const surface of textSurfaces) {
      for (const token of ['textPrimary', 'textSecondary']) {
        assert.ok(
          contrastRatio(colors[token], colors[surface]) >= 4.5,
          `${mode}.${token} on ${surface}`
        );
      }

      // Disabled text is exempt from WCAG's normal-text AA threshold, but it
      // still needs enough contrast to remain legible in the field.
      assert.ok(
        contrastRatio(colors.textDisabled, colors[surface]) >= 3,
        `${mode}.textDisabled on ${surface}`
      );
    }
  }
});

test('interactive control outlines remain distinguishable on QPM surfaces', () => {
  const controlSurfaces = [
    'canvas',
    'surface',
    'surfaceRaised',
    'surfaceBrandSubtle',
    'tertiaryContainer'
  ];

  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    for (const surface of controlSurfaces) {
      assert.ok(
        contrastRatio(colors.controlOutline, colors[surface]) >= 3,
        `${mode}.controlOutline on ${surface}`
      );
    }
  }
});

test('semantic status foreground tokens remain readable in both modes', () => {
  const statusTokens = [
    'success',
    'inProgress',
    'warning',
    'error',
    'info',
    'complete'
  ];
  for (const mode of ['light', 'dark']) {
    for (const token of statusTokens) {
      assert.ok(
        contrastRatio(
          qpmDesignTokens[mode][token],
          qpmDesignTokens[mode].surface
        ) >= 4.5,
        `${mode}.${token}`
      );
    }
  }
});

test('status message foreground tokens meet AA contrast on their status fills', () => {
  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    for (const status of [
      'success',
      'warning',
      'error',
      'info',
      'complete',
      'inProgress',
      'assetModernization',
      'assetCommissioning'
    ]) {
      assert.ok(
        contrastRatio(
          colors[`on${status[0].toUpperCase()}${status.slice(1)}`],
          colors[status]
        ) >= 4.5,
        `${mode}.on${status}`
      );
    }
  }
});

test('semantic status containers use QPM palettes and meet AA text contrast', () => {
  const statuses = ['success', 'inProgress', 'warning', 'error', 'info'];
  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    for (const status of statuses) {
      const container = `${status}Container`;
      const foreground = `on${status[0].toUpperCase()}${status.slice(
        1
      )}Container`;
      assert.ok(colors[container], `${mode}.${container}`);
      assert.ok(colors[foreground], `${mode}.${foreground}`);
      assert.ok(
        contrastRatio(colors[foreground], colors[container]) >= 4.5,
        `${mode}.${foreground} on ${container}`
      );
    }
  }
});

test('priority foreground tokens meet AA contrast on their matching fills', () => {
  const priorities = [
    ['neutral', 'onNeutral'],
    ['info', 'onInfo'],
    ['warning', 'onWarning']
  ];
  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    for (const [fill, foreground] of priorities) {
      assert.ok(
        contrastRatio(colors[foreground], colors[fill]) >= 4.5,
        `${mode}.${foreground} on ${fill}`
      );
    }
  }
});

test('maintenance status and priority helpers keep their semantic token mapping', () => {
  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    const theme = {
      colors: {
        ...colors,
        primary: colors.brandPrimary,
        tertiary: colors.info
      }
    };

    assert.equal(getStatusColor('OPEN', theme), colors.neutral);
    assert.equal(getStatusForegroundColor('OPEN', theme), colors.onNeutral);
    assert.equal(getStatusColor('IN_PROGRESS', theme), colors.inProgress);
    assert.equal(
      getStatusForegroundColor('IN_PROGRESS', theme),
      colors.onInProgress
    );
    assert.equal(getStatusColor('ON_HOLD', theme), colors.warning);
    assert.equal(getStatusColor('LATE_WO', theme), colors.error);
    assert.equal(getStatusColor('TODAY_WO', theme), colors.brandPrimary);
    assert.equal(getStatusColor('HIGH_WO', theme), colors.warning);
    assert.equal(getStatusColor('COMPLETE', theme), colors.success);
    assert.equal(getStatusForegroundColor('COMPLETE', theme), colors.onSuccess);
    assert.equal(
      getStatusContainerColor('IN_PROGRESS', theme),
      colors.inProgressContainer
    );
    assert.equal(
      getStatusContainerColor('HIGH_WO', theme),
      colors.warningContainer
    );
    assert.equal(
      getStatusContainerColor('COMPLETE', theme),
      colors.successContainer
    );

    const priorities = [
      ['NONE', 'neutral', 'onNeutral'],
      ['LOW', 'info', 'onInfo'],
      ['MEDIUM', 'warning', 'onWarning'],
      ['HIGH', 'warning', 'onWarning']
    ];
    for (const [priority, fill, foreground] of priorities) {
      assert.equal(getPriorityColor(priority, theme), colors[fill]);
      assert.equal(
        getPriorityForegroundColor(priority, theme),
        colors[foreground]
      );
    }
  }
});

test('unselected interactive control indicators meet 3:1 contrast on QPM surfaces', () => {
  const surfaces = [
    'canvas',
    'surface',
    'surfaceRaised',
    'surfaceBrandSubtle',
    'tertiaryContainer'
  ];
  for (const mode of ['light', 'dark']) {
    const colors = qpmDesignTokens[mode];
    for (const surface of surfaces) {
      assert.ok(
        contrastRatio(colors.controlOutline, colors[surface]) >= 3,
        `${mode}.controlOutline on ${surface}`
      );
    }
  }
});

test('settings row icons are decorative instead of nested interactive buttons', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'screens/SettingsScreen.tsx'),
    'utf8'
  );

  assert.doesNotMatch(source, /IconButton/);
  const leftIcons = source.match(/<List\.Icon\b/g);
  assert.equal(leftIcons?.length, 6);
  assert.match(
    source,
    /left=\{\(props\) => <List\.Icon \{\.\.\.props\} icon="swap-horizontal"/
  );
  assert.match(source, /color=\{theme\.colors\.error\} icon="logout"/);
  assert.match(
    source,
    /left=\{\(props\) => <List\.Icon \{\.\.\.props\} icon="license"/
  );
  assert.match(
    source,
    /left=\{\(props\) => <List\.Icon \{\.\.\.props\} icon="domain"/
  );
  assert.match(
    source,
    /left=\{\(props\) => \([\s\S]*?icon="information-outline"/
  );
});
