import {
  Box,
  Button,
  Link,
  List,
  ListSubheader,
  Stack,
  styled,
  Typography,
  Popover,
  useTheme
} from '@mui/material';
import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import SidebarMenuItem from './item';
import menuItems, { MenuItem } from './items';
import {
  isSidebarItemPathActive,
  isSidebarPathActive,
  isSidebarPathExact
} from 'src/utils/sidebarNavigation';
import { useTranslation } from 'react-i18next';
import useAuth from '../../../../hooks/useAuth';
import { useEffect } from 'react';
import { getUrgentWorkOrdersCount } from '../../../../slices/workOrder';
import { useDispatch, useSelector } from '../../../../store';
import { getPendingRequestsCount } from '../../../../slices/request';
import dayjs from 'dayjs';
import { isCloudVersion } from 'src/config';
import { SidebarContext } from 'src/contexts/SidebarContext';

const MenuWrapper = styled(Box)(
  ({ theme }) => `
  .MuiList-root {
    padding: ${theme.spacing(1)};

    & > .MuiList-root {
      padding: 0 ${theme.spacing(0)} ${theme.spacing(1)};
    }
  }

    .MuiListSubheader-root {
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.06em;
      font-size: ${theme.typography.pxToRem(11)};
      color: ${theme.sidebar.menuItemHeadingColor};
      padding: ${theme.spacing(1.5, 2.5, 0.5)};
      line-height: 1.5;
    }
`
);

const SubMenuWrapper = styled(Box)(
  ({ theme }) => `
    .MuiList-root {

      .MuiListItem-root {
        padding: 1px 0;

        .MuiBadge-root {
          position: absolute;
          right: ${theme.spacing(3.2)};

          .MuiBadge-standard {
            background: ${theme.colors.primary.main};
            font-size: ${theme.typography.pxToRem(10)};
            font-weight: bold;
            text-transform: uppercase;
            color: ${theme.palette.primary.contrastText};
          }
        }
    
        .MuiButton-root {
          display: flex;
          color: ${theme.sidebar.menuItemColor};
          background-color: transparent;
          width: 100%;
          min-height: 44px;
          justify-content: flex-start;
          padding: ${theme.spacing(0.75, 1.5)};
          border-radius: ${theme.general.borderRadius};
          font-weight: 500;
          transition: ${theme.transitions.create([
            'background-color',
            'color'
          ])};

          .MuiButton-startIcon,
          .MuiButton-endIcon {
            transition: ${theme.transitions.create(['color'])};

            .MuiSvgIcon-root {
              font-size: inherit;
              transition: none;
            }
          }

          .MuiButton-startIcon {
            color: ${theme.sidebar.menuItemIconColor};
            font-size: ${theme.typography.pxToRem(20)};
            margin-right: ${theme.spacing(1)};
          }
          
          .MuiButton-endIcon {
            color: ${theme.sidebar.menuItemIconColor};
            margin-left: auto;
            opacity: .8;
            font-size: ${theme.typography.pxToRem(20)};
          }

          &&:hover:not(.active) {
            background-color: ${theme.sidebar.menuItemBg};
            color: ${theme.sidebar.menuItemColor};

            .MuiButton-startIcon,
            .MuiButton-endIcon {
              color: ${theme.colors.primary.main};
            }
          }

          &.expanded:not(.active) {
            background-color: ${theme.sidebar.menuItemBg};
            color: ${theme.sidebar.textColor};

            .MuiButton-startIcon,
            .MuiButton-endIcon {
              color: ${theme.sidebar.textColor};
            }
          }

          &.active {
            background-color: ${theme.sidebar.menuItemBgActive};
            box-shadow: none;
            color: ${theme.sidebar.menuItemColorActive};

            .MuiButton-startIcon,
            .MuiButton-endIcon {
              color: ${theme.sidebar.menuItemIconColorActive};
            }
          }

          &:focus-visible {
            outline: 2px solid ${theme.sidebar.menuItemColorActive};
            outline-offset: -2px;
          }

          &.active:focus-visible {
            outline-color: ${theme.sidebar.menuItemColorActive};
          }
        }

        &.Mui-children {
          flex-direction: column;

          .MuiBadge-root {
            position: absolute;
            right: ${theme.spacing(7)};
          }
        }

        .MuiCollapse-root {
          width: 100%;

          .MuiList-root {
            padding: ${theme.spacing(1, 0)};
          }

          .MuiListItem-root {
            padding: 1px 0;

            .MuiButton-root {
              min-height: 40px;
              padding: ${theme.spacing(0.5, 1.5)};
              border-radius: ${theme.general.borderRadius};
              transition: ${theme.transitions.create([
                'background-color',
                'color'
              ])};

              &&:hover:not(.active) {
                background-color: ${theme.sidebar.menuItemBg};
                color: ${theme.sidebar.menuItemColor};

                .MuiButton-startIcon,
                .MuiButton-endIcon {
                  color: ${theme.colors.primary.main};
                }
              }

              &.active {
                background-color: ${theme.sidebar.menuItemBg};
                color: ${theme.colors.primary.main};
                font-weight: 600;

                .MuiButton-startIcon,
                .MuiButton-endIcon {
                  color: ${theme.colors.primary.main};
                }
              }

              &:focus-visible {
                outline: 2px solid ${theme.colors.primary.main};
                outline-offset: -2px;
              }

              .MuiBadge-root {
                right: ${theme.spacing(3.2)};
              }

              &:before {
                content: ' ';
                background: currentColor;
                opacity: 0;
                transition: ${theme.transitions.create([
                  'transform',
                  'opacity'
                ])};
                width: 6px;
                height: 6px;
                transform: scale(0);
                transform-origin: center;
                border-radius: 20px;
                margin-right: ${theme.spacing(1.8)};
              }

              &.active,
              &:hover {

                &:before {
                  transform: scale(1);
                  opacity: 1;
                }
              }

              &.active:before {
                background: ${theme.colors.primary.main};
              }

              &:hover:before {
                background: ${theme.colors.primary.main};
              }
            }
          }
        }
      }
    }
`
);

const renderSidebarMenuItems = ({
  items,
  path,
  inPopover = false,
  collapsed = false
}: {
  items: MenuItem[];
  path: string;
  inPopover?: boolean;
  collapsed?: boolean;
}): JSX.Element => (
  <SubMenuWrapper>
    <List component="div">
      {items.reduce(
        (ev, item) =>
          reduceChildRoutes({ ev, item, path, inPopover, collapsed }),
        []
      )}
    </List>
  </SubMenuWrapper>
);

const reduceChildRoutes = ({
  ev,
  path,
  item,
  inPopover,
  collapsed
}: {
  ev: JSX.Element[];
  path: string;
  item: MenuItem;
  inPopover: boolean;
  collapsed: boolean;
}): Array<JSX.Element> => {
  const key = item.name;
  if (item.items) {
    const containsCurrentRoute = isSidebarItemPathActive(path, item);
    const routeActive = isSidebarPathExact(path, item.link);

    ev.push(
      <SidebarMenuItem
        key={key}
        active={routeActive}
        open={containsCurrentRoute}
        name={item.name}
        icon={item.icon}
        link={item.link}
        badge={item.badge}
        badgeTooltip={item.badgeTooltip}
        inPopover={inPopover}
      >
        {renderSidebarMenuItems({
          path,
          items: item.items,
          inPopover: inPopover || collapsed,
          collapsed
        })}
      </SidebarMenuItem>
    );
  } else {
    const routeActive = isSidebarPathActive(path, item.link);
    ev.push(
      <SidebarMenuItem
        key={key}
        active={routeActive}
        name={item.name}
        link={item.link}
        badge={item.badge}
        badgeTooltip={item.badgeTooltip}
        icon={item.icon}
        inPopover={inPopover}
      />
    );
  }

  return ev;
};

function SidebarMenu({ forceExpanded = false }: { forceExpanded?: boolean }) {
  const location = useLocation();
  const { t, i18n }: { t: any; i18n: any } = useTranslation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { hasViewPermission, hasCreatePermission, hasFeature, user, company } = useAuth();
  const { desktopSidebarCollapsed } = useContext(SidebarContext);
  const sidebarCollapsed = desktopSidebarCollapsed && !forceExpanded;
  const { urgentCount } = useSelector((state) => state.workOrders);
  const { pendingCount } = useSelector((state) => state.requests);
  const TRIAL_DAYS = 15;
  const daysPassed = dayjs().diff(dayjs(company.createdAt), 'day');
  const daysLeft = TRIAL_DAYS - daysPassed;
  const subscription = company?.subscription;

  useEffect(() => {
    if (user.id && user.role.roleType === 'ROLE_CLIENT') {
      dispatch(getUrgentWorkOrdersCount());
      if (user.role.code !== 'REQUESTER') dispatch(getPendingRequestsCount());
    }
  }, [user.id, user.role.roleType]);
  return (
    <>
      {isCloudVersion &&
        subscription &&
        !company.demo &&
        user.ownsCompany &&
        !subscription.activated &&
        user.superAccountRelations.length === 0 &&
        !sidebarCollapsed && (
          <Stack
            sx={{
              backgroundColor: theme.colors.primary.lighter,
              color: theme.palette.text.primary,
              p: 2,
              mx: 2,
              mt: 2,
              borderRadius: 2
            }}
            spacing={1}
          >
            <Typography color="text.primary" fontSize="16px" fontWeight="bold">
              {daysLeft > 0
                ? `Your trial ends in ${daysLeft} days`
                : `Your trial has ended`}
            </Typography>
            <Typography color="text.secondary" fontSize="14px">
              You are on the {subscription.subscriptionPlan?.name ?? 'current'}{' '}
              plan
            </Typography>
            <Button
              component={Link}
              href={
                isCloudVersion
                  ? '/app/subscription/plans'
                  : '/app/account/company-profile'
              }
              variant="contained"
              color="primary"
              sx={{ mt: 1 }}
            >
              {t('upgrade_now')}
            </Button>
          </Stack>
        )}
      <>
        {(user.superAccountRelations.length
          ? [
              {
                ...menuItems[0],
                items: menuItems[0].items.filter((item) =>
                  [
                    'work_orders',
                    'maintenance_dashboard',
                    'Statistics',
                    'requests',
                    'preventive_maintenance'
                  ].includes(item.name)
                )
              }
            ]
          : menuItems
        )
          .map((section, index) => {
            const sectionClone = { ...section };
            sectionClone.items = sectionClone.items.filter((item) => {
              const hasPermission = item.permission
                ? hasViewPermission(item.permission) ||
                  (item.createPermission
                    ? hasCreatePermission(item.createPermission)
                    : false) ||
                  (item.permissionFallback
                    ? hasViewPermission(item.permissionFallback)
                    : false)
                : true;
              const featured = item.planFeature
                ? hasFeature(item.planFeature)
                : true;

              const inUiConfig: boolean = user.uiConfiguration
                ? item.uiConfigKey
                  ? user.uiConfiguration[item.uiConfigKey]
                  : true
                : true;

              return hasPermission && featured && inUiConfig;
            });
            if (index === 0) {
              //ownItems
              sectionClone.items = sectionClone.items.map((item) => {
                if (item.name === 'work_orders') {
                  item.badge = urgentCount > 0 ? urgentCount.toString() : null;
                } else if (item.name === 'requests') {
                  item.badge =
                    pendingCount > 0 ? pendingCount.toString() : null;
                }
                return item;
              });
            }
            return sectionClone;
          })
          .map((section) => (
            <MenuWrapper key={section.heading}>
              <List
                component="div"
                subheader={
                  sidebarCollapsed ? undefined : (
                    <ListSubheader component="div" disableSticky>
                      {t(section.heading)}
                    </ListSubheader>
                  )
                }
              >
                {renderSidebarMenuItems({
                  items: section.items,
                  path: location.pathname,
                  collapsed: sidebarCollapsed,
                  inPopover: forceExpanded
                })}
              </List>
            </MenuWrapper>
          ))}
      </>
    </>
  );
}

export default SidebarMenu;
