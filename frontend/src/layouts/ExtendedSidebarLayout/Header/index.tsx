import { useContext } from 'react';

import {
  Box,
  Divider,
  IconButton,
  Stack,
  styled,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { SidebarContext } from 'src/contexts/SidebarContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import HeaderButtons from './Buttons';
import HeaderUserbox from './Userbox';
import { useTranslation } from 'react-i18next';
import { TitleContext } from '../../../contexts/TitleContext';
import { useNavigate, useLocation } from 'react-router-dom';

const HeaderWrapper = styled(Box)(
  ({ theme }) => `
        height: ${theme.header.height};
        color: ${theme.header.textColor};
        padding: ${theme.spacing(0, 2)};
        right: 0;
        z-index: 6;
        background-color: ${theme.header.background};
        border-bottom: 1px solid ${theme.palette.divider};
        position: fixed;
        justify-content: space-between;
        width: 100%;
        @media (min-width: ${theme.breakpoints.values.lg}px) {
            width: auto;
        }
`
);

function Header() {
  const {
    sidebarToggle,
    toggleSidebar,
    desktopSidebarCollapsed,
    toggleDesktopSidebar
  } = useContext(SidebarContext);
  const { title } = useContext(TitleContext);
  const theme = useTheme();
  const { t }: { t: any } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <HeaderWrapper
      display="flex"
      alignItems="center"
      sx={{
        boxShadow: 'none',
        left: { lg: desktopSidebarCollapsed ? '72px' : theme.sidebar.width },
        width: {
          xs: '100%',
          lg: desktopSidebarCollapsed
            ? 'calc(100% - 72px)'
            : `calc(100% - ${theme.sidebar.width})`
        },
        transition: theme.transitions.create(['left', 'width'], {
          duration: theme.transitions.duration.shortest
        })
      }}
    >
      <Box sx={{ display: { xs: 'none', lg: 'inline-flex' }, mr: 1 }}>
        <Tooltip
          arrow
          title={
            desktopSidebarCollapsed
              ? t('expand_sidebar')
              : t('collapse_sidebar')
          }
        >
          <IconButton
            color="primary"
            onClick={toggleDesktopSidebar}
            aria-label={
              desktopSidebarCollapsed
                ? t('expand_sidebar')
                : t('collapse_sidebar')
            }
            aria-expanded={!desktopSidebarCollapsed}
            aria-controls="qpm-primary-sidebar"
          >
            {desktopSidebarCollapsed ? (
              theme.direction === 'rtl' ? (
                <ChevronLeftIcon />
              ) : (
                <ChevronRightIcon />
              )
            ) : theme.direction === 'rtl' ? (
              <ChevronRightIcon />
            ) : (
              <ChevronLeftIcon />
            )}
          </IconButton>
        </Tooltip>
      </Box>
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem />}
        alignItems="center"
        spacing={2}
        sx={{ minWidth: 0, flex: 1, mr: 2 }}
      >
        <IconButton
          aria-label={t('go_back')}
          onClick={() => navigate(-1)}
          disabled={location.key === 'default'}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h3"
          component="h1"
          noWrap
          title={title}
          sx={{
            minWidth: 0,
            color: 'text.primary',
            fontSize: { xs: '1.125rem', sm: '1.5rem' },
            lineHeight: 1.25
          }}
        >
          {title}
        </Typography>
      </Stack>
      <Box display="flex" alignItems="center" sx={{ flexShrink: 0 }}>
        <HeaderButtons />
        <HeaderUserbox />
        <Box
          component="span"
          sx={{
            ml: 2,
            display: { lg: 'none', xs: 'inline-block' }
          }}
        >
          <Tooltip arrow title={t('toggle_menu')}>
            <IconButton color="primary" onClick={toggleSidebar}>
              {!sidebarToggle ? (
                <MenuIcon fontSize="small" />
              ) : (
                <CloseIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </HeaderWrapper>
  );
}

export default Header;
