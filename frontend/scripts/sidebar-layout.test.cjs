const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sidebar = fs.readFileSync(
  'src/layouts/ExtendedSidebarLayout/Sidebar/index.tsx',
  'utf8'
);
const footer = fs.readFileSync(
  'src/layouts/ExtendedSidebarLayout/Sidebar/SidebarFooter/index.tsx',
  'utf8'
);

test('desktop sidebar keeps a flex column so the menu scrolls above its footer', () => {
  assert.match(sidebar, /display:\s*flex;\s*flex-direction:\s*column;/);
  assert.match(sidebar, /display:\s*\{\s*xs:\s*'none',\s*lg:\s*'flex'\s*\}/);
  assert.match(sidebar, /<Scrollbar style=\{\{ flex: 1, minHeight: 0 \}\}>/);
  assert.match(
    sidebar,
    /<SidebarFooter forceExpanded=\{!desktopSidebarCollapsed\} \/>/
  );
});

test('compact desktop footer stacks all actions while the mobile drawer stays expanded', () => {
  assert.match(
    footer,
    /const collapsed = desktopSidebarCollapsed && !forceExpanded/
  );
  assert.match(footer, /minHeight: collapsed \? 160 : 60/);
  assert.match(footer, /flexShrink: 0/);
  assert.match(footer, /flexDirection: collapsed \? 'column' : 'row'/);
  assert.match(sidebar, /<SidebarFooter forceExpanded \/>/);
});
