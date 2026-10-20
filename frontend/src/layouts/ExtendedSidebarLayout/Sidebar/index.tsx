import { useContext } from 'react';
import Scrollbar from 'src/components/Scrollbar';
import { SidebarContext } from 'src/contexts/SidebarContext';

import { Box, Drawer, styled, useTheme } from '@mui/material';
import SidebarMenu from './SidebarMenu';
import SidebarFooter from './SidebarFooter';
import Logo from 'src/components/LogoSign';

const COLLAPSED_SIDEBAR_WIDTH = '72px';

const SidebarWrapper = styled(Box)(
  ({ theme }) => `
        width: ${theme.sidebar.width};
        min-width: ${theme.sidebar.width};
        color: ${theme.sidebar.textColor};
        position: relative;
        z-index: 7;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background-color: ${theme.sidebar.background};
`
);

function Sidebar() {
  const { sidebarToggle, closeSidebar, desktopSidebarCollapsed } =
    useContext(SidebarContext);
  const theme = useTheme();

  return (
    <>
      <SidebarWrapper
        id="qpm-primary-sidebar"
        sx={{
          width: desktopSidebarCollapsed
            ? COLLAPSED_SIDEBAR_WIDTH
            : theme.sidebar.width,
          minWidth: desktopSidebarCollapsed
            ? COLLAPSED_SIDEBAR_WIDTH
            : theme.sidebar.width,
          display: {
            xs: 'none',
            lg: 'flex'
          },
          position: 'fixed',
          left: 0,
          top: 0,
          borderRight: `1px solid ${theme.sidebar.dividerBg}`,
          boxShadow: 'none',
          transition: theme.transitions.create(['width', 'min-width'], {
            duration: theme.transitions.duration.shortest
          })
        }}
      >
        <Scrollbar style={{ flex: 1, minHeight: 0 }}>
          <Box mt={2.5}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                flexDirection: 'row'
              }}
            >
              <Box>
                <Logo />
              </Box>
            </Box>
          </Box>
          <SidebarMenu />
        </Scrollbar>
        <SidebarFooter forceExpanded={!desktopSidebarCollapsed} />
      </SidebarWrapper>
      <Drawer
        sx={{
          boxShadow: `${theme.sidebar.boxShadow}`
        }}
        anchor={theme.direction === 'rtl' ? 'right' : 'left'}
        open={sidebarToggle}
        onClose={closeSidebar}
        variant="temporary"
        elevation={9}
      >
        <SidebarWrapper>
          <Scrollbar style={{ flex: 1, minHeight: 0 }}>
            <Box mt={2.5}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  flexDirection: 'row'
                }}
              >
                <Box>
                  <Logo />
                </Box>
              </Box>
            </Box>
            <SidebarMenu forceExpanded />
          </Scrollbar>
          <SidebarFooter forceExpanded />
        </SidebarWrapper>
      </Drawer>
    </>
  );
}

export default Sidebar;
