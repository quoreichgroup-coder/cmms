import {
  Box,
  IconButton,
  styled,
  Tooltip,
  tooltipClasses,
  TooltipProps,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import useAuth from 'src/hooks/useAuth';
import UpgradeOutlinedIcon from '@mui/icons-material/UpgradeOutlined';
import { isCloudVersion } from '../../../../config';
import { useContext } from 'react';
import { SidebarContext } from 'src/contexts/SidebarContext';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import { logSafeError } from '../../../../utils/safeErrorLog';

const LightTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.colors.alpha.trueWhite[100],
    color: theme.palette.getContrastText(theme.colors.alpha.trueWhite[100]),
    boxShadow: theme.shadows[24],
    fontWeight: 'bold',
    fontSize: theme.typography.pxToRem(12)
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.colors.alpha.trueWhite[100]
  }
}));

function SidebarFooter({ forceExpanded = false }: { forceExpanded?: boolean }) {
  const { t, i18n }: { t: any; i18n: any } = useTranslation();
  const theme = useTheme();
  const { desktopSidebarCollapsed } = useContext(SidebarContext);
  const collapsed = desktopSidebarCollapsed && !forceExpanded;
  const { logout, user } = useAuth();
  const { requestSubscriptionChange } = useContext(CompanySettingsContext);
  const navigate = useNavigate();
  const footerButtonSx = {
    backgroundColor: 'transparent',
    color: theme.sidebar.menuItemIconColor,
    transition: theme.transitions.create(['background-color', 'color']),
    '&:hover': {
      backgroundColor: theme.sidebar.menuItemBgActive,
      color: theme.sidebar.menuItemColorActive
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      logSafeError('Logout failed', err);
    }
  };

  return (
    <Box
      sx={{
        // IconButton has a 48px minimum hit target. Three stacked actions need
        // 144px before the vertical padding and divider are accounted for.
        minHeight: collapsed ? 160 : 60,
        flexShrink: 0,
        borderTop: `1px solid ${theme.sidebar.dividerBg}`,
        backgroundColor: theme.sidebar.background,
        px: 1,
        py: collapsed ? 0.5 : 0,
        flexDirection: collapsed ? 'column' : 'row',
        gap: collapsed ? 0.25 : 0
      }}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {user.ownsCompany && user.superAccountRelations.length === 0 && (
        <LightTooltip placement="top" arrow title={t('upgrade_now')}>
          <IconButton
            aria-label={t('upgrade_now')}
            sx={footerButtonSx}
            component={RouterLink}
            to={
              isCloudVersion
                ? '/app/subscription/plans'
                : '/app/account/company-profile'
            }
          >
            <UpgradeOutlinedIcon fontSize="small" />
          </IconButton>
        </LightTooltip>
      )}
      {user.superAccountRelations.length === 0 && (
        <LightTooltip placement="top" arrow title={t('wo_calendar')}>
          <IconButton
            aria-label={t('wo_calendar')}
            sx={footerButtonSx}
            to="/app/work-orders?view=calendar"
            component={RouterLink}
          >
            <EventOutlinedIcon fontSize="small" />
          </IconButton>
        </LightTooltip>
      )}
      <LightTooltip placement="top" arrow title={t('Logout')}>
        <IconButton
          aria-label={t('Logout')}
          sx={footerButtonSx}
          onClick={handleLogout}
        >
          <PowerSettingsNewOutlinedIcon fontSize="small" />
        </IconButton>
      </LightTooltip>
    </Box>
  );
}

export default SidebarFooter;
