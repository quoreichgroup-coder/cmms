const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sourceRoot = path.join(__dirname, '..', 'src');

function collectTsxFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(entryPath);
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

test('Web application uses the shared outlined icon family', () => {
  const files = collectTsxFiles(sourceRoot);
  const regressions = files.filter((file) =>
    /\b[A-Z][A-Za-z0-9]*TwoTone[A-Za-z0-9]*\b/.test(
      fs.readFileSync(file, 'utf8')
    )
  );

  assert.deepEqual(
    regressions,
    [],
    'Replace TwoTone icons with the matching MUI Outlined icon.'
  );
});

test('all MUI glyphs with outlined equivalents use the outlined variants', () => {
  const iconRoot = path.join(
    __dirname,
    '..',
    'node_modules',
    '@mui',
    'icons-material'
  );
  const brandIcons = new Set(['Facebook', 'Instagram', 'Twitter']);
  const regressions = [];

  for (const file of collectTsxFiles(sourceRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const [, icon] of source.matchAll(
      /from ['"]@mui\/icons-material\/([A-Za-z0-9]+)['"]/g
    )) {
      if (
        icon.endsWith('Outlined') ||
        icon.endsWith('Outline') ||
        brandIcons.has(icon)
      ) {
        continue;
      }

      if (fs.existsSync(path.join(iconRoot, `${icon}Outlined.js`))) {
        regressions.push(`${path.relative(sourceRoot, file)}: ${icon}`);
      }
    }
  }

  assert.deepEqual(
    regressions,
    [],
    'Use an Outlined variant wherever MUI provides one; preserve brand marks and existing outline glyphs.'
  );
});

test('asset, location and inventory navigation actions use outlined icons', () => {
  const auditedFiles = [
    'content/own/Assets/index.tsx',
    'content/own/Assets/Show/AssetDetails.tsx',
    'content/own/Locations/index.tsx',
    'content/own/Locations/LocationDetails.tsx',
    'content/own/Inventory/PartDetails.tsx'
  ];

  for (const relativePath of auditedFiles) {
    const source = fs.readFileSync(path.join(sourceRoot, relativePath), 'utf8');
    assert.doesNotMatch(
      source,
      /@mui\/icons-material\/(?:ContentCopy|MoreHoriz|ChevronRight|ExpandMore)(?:['"])/
    );
    assert.doesNotMatch(
      source,
      /<(?:ContentCopy|MoreHoriz|ChevronRight|ExpandMore)Icon\b/
    );
  }
});

test('shared Web navigation, tables and dialogs use the outlined icon family', () => {
  const auditedImports = [
    [
      'layouts/ExtendedSidebarLayout/Header/index.tsx',
      ['Menu', 'ArrowBack', 'Close', 'ChevronLeft', 'ChevronRight']
    ],
    [
      'layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/item.tsx',
      ['ExpandLess', 'ExpandMore']
    ],
    [
      'content/own/components/CustomDatagrid2/index.tsx',
      [
        'ArrowDownward',
        'FirstPage',
        'LastPage',
        'KeyboardArrowLeft',
        'KeyboardArrowRight',
        'DragIndicator',
        'MoreVert',
        'PushPin',
        'VisibilityOff',
        'ViewColumn'
      ]
    ],
    ['content/own/components/ConfirmDialog.tsx', ['Close']],
    ['content/own/components/SplitButton.tsx', ['ArrowDropDown']]
  ];

  for (const [relativePath, icons] of auditedImports) {
    const source = fs.readFileSync(path.join(sourceRoot, relativePath), 'utf8');
    for (const icon of icons) {
      assert.match(
        source,
        new RegExp(`@mui/icons-material/${icon}Outlined['"]`),
        `${relativePath} must use ${icon}Outlined`
      );
      assert.doesNotMatch(
        source,
        new RegExp(`@mui/icons-material/${icon}['"]`),
        `${relativePath} must not use the filled ${icon} glyph`
      );
    }
  }
});
