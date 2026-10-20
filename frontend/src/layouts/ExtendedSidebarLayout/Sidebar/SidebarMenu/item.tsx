import { FC, ReactNode, useState, useContext, useEffect } from 'react';
import { NavLink as RouterLink } from 'react-router-dom';
import clsx from 'clsx';
import { SidebarContext } from 'src/contexts/SidebarContext';

import PropTypes from 'prop-types';
import {
  Button,
  Tooltip,
  Badge,
  Collapse,
  ListItem,
  TooltipProps,
  tooltipClasses,
  styled,
  Popover
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface SidebarMenuItemProps {
  children?: ReactNode;
  link?: string;
  icon?: any;
  badge?: string;
  badgeTooltip?: string;
  open?: boolean;
  active?: boolean;
  name: string;
  inPopover?: boolean;
}

const TooltipWrapper = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.colors.alpha.trueWhite[100],
    color: theme.palette.getContrastText(theme.colors.alpha.trueWhite[100]),
    fontSize: theme.typography.pxToRem(12),
    fontWeight: 'bold',
    borderRadius: theme.general.borderRadiusSm,
    boxShadow:
      '0 .2rem .8rem rgba(7,9,25,.18), 0 .08rem .15rem rgba(7,9,25,.15)'
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.colors.alpha.trueWhite[100]
  }
}));

const SidebarMenuItem: FC<SidebarMenuItemProps> = ({
  children,
  link,
  icon: Icon,
  badge,
  badgeTooltip,
  open: openParent,
  active,
  name,
  inPopover = false,
  ...rest
}) => {
  const [menuToggle, setMenuToggle] = useState<boolean>(openParent);
  const submenuId = `sidebar-submenu-${name.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const { t }: { t: any } = useTranslation();
  const { closeSidebar, desktopSidebarCollapsed } = useContext(SidebarContext);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const collapsedRail = desktopSidebarCollapsed && !inPopover;

  useEffect(() => {
    if (openParent) setMenuToggle(true);
  }, [openParent]);

  const toggleMenu = (): void => {
    setMenuToggle((Open) => !Open);
  };

  if (children) {
    if (collapsedRail) {
      return (
        <ListItem component="div" key={name} {...rest}>
          <TooltipWrapper
            title={badgeTooltip ? `${t(name)}: ${badgeTooltip}` : t(name)}
            arrow
            placement="right"
          >
            <Button
              className={clsx({ active: active || openParent })}
              aria-label={
                badgeTooltip ? `${t(name)}: ${badgeTooltip}` : t(name)
              }
              aria-expanded={Boolean(anchorEl)}
              aria-controls={`${submenuId}-popover`}
              onClick={(event) => setAnchorEl(event.currentTarget)}
              startIcon={
                Icon &&
                (badge !== undefined && badge !== null ? (
                  <Badge
                    color="primary"
                    badgeContent={badge === '' ? undefined : badge}
                    variant={badge === '' ? 'dot' : 'standard'}
                  >
                    <Icon />
                  </Badge>
                ) : (
                  <Icon />
                ))
              }
              sx={{
                width: '100%',
                minWidth: 0,
                minHeight: 44,
                justifyContent: 'center',
                px: 0,
                '& .MuiButton-startIcon': { m: 0 },
                '& .MuiButton-endIcon': { display: 'none' }
              }}
            />
          </TooltipWrapper>
          <Popover
            id={`${submenuId}-popover`}
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{
              sx: { minWidth: 240, maxHeight: '75vh', overflowY: 'auto' }
            }}
          >
            <div
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('a')) {
                  setAnchorEl(null);
                }
              }}
            >
              {children}
            </div>
          </Popover>
        </ListItem>
      );
    }

    return (
      <ListItem component="div" className="Mui-children" key={name} {...rest}>
        <Button
          className={clsx({ active, expanded: menuToggle })}
          aria-label={t(name)}
          startIcon={
            Icon &&
            (badge !== undefined && badge !== null ? (
              <Badge
                color="primary"
                badgeContent={badge === '' ? undefined : badge}
                variant={badge === '' ? 'dot' : 'standard'}
              >
                <Icon />
              </Badge>
            ) : (
              <Icon />
            ))
          }
          endIcon={menuToggle ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={toggleMenu}
          aria-expanded={menuToggle}
          aria-controls={submenuId}
          sx={{ textAlign: 'start' }}
        >
          {badgeTooltip ? (
            <TooltipWrapper title={badgeTooltip} arrow placement="right">
              {badge === '' ? (
                <Badge color="primary" variant="dot" />
              ) : (
                <Badge badgeContent={badge} />
              )}
            </TooltipWrapper>
          ) : badge === '' ? (
            <Badge color="primary" variant="dot" />
          ) : (
            <Badge badgeContent={badge} />
          )}
          {t(name)}
        </Button>
        <Collapse id={submenuId} in={menuToggle}>
          {children}
        </Collapse>
      </ListItem>
    );
  }

  const button = (
    <Button
      disableRipple
      className={clsx({ active })}
      component={RouterLink}
      aria-current={active ? 'page' : undefined}
      aria-label={
        collapsedRail
          ? badgeTooltip
            ? `${t(name)}: ${badgeTooltip}`
            : t(name)
          : undefined
      }
      onClick={closeSidebar}
      to={link}
      startIcon={
        Icon &&
        (collapsedRail && badge !== undefined && badge !== null ? (
          <Badge
            color="primary"
            badgeContent={badge === '' ? undefined : badge}
            variant={badge === '' ? 'dot' : 'standard'}
          >
            <Icon />
          </Badge>
        ) : (
          <Icon />
        ))
      }
      sx={
        collapsedRail
          ? {
              width: '100%',
              minWidth: 0,
              minHeight: 44,
              justifyContent: 'center',
              px: 0,
              '& .MuiButton-startIcon': { m: 0 }
            }
          : undefined
      }
    >
      {!collapsedRail && t(name)}
      {!collapsedRail &&
        (badgeTooltip ? (
          <TooltipWrapper title={badgeTooltip} arrow placement="right">
            {badge === '' ? (
              <Badge color="primary" variant="dot" />
            ) : (
              <Badge badgeContent={badge} />
            )}
          </TooltipWrapper>
        ) : badge === '' ? (
          <Badge color="primary" variant="dot" />
        ) : (
          <Badge badgeContent={badge} />
        ))}
    </Button>
  );

  return (
    <ListItem component="div" key={name} {...rest}>
      {collapsedRail ? (
        <TooltipWrapper
          title={badgeTooltip ? `${t(name)}: ${badgeTooltip}` : t(name)}
          arrow
          placement="right"
        >
          {button}
        </TooltipWrapper>
      ) : (
        button
      )}
    </ListItem>
  );
};

SidebarMenuItem.propTypes = {
  children: PropTypes.node,
  active: PropTypes.bool,
  inPopover: PropTypes.bool,
  link: PropTypes.string,
  icon: PropTypes.elementType,
  badge: PropTypes.string,
  badgeTooltip: PropTypes.string,
  open: PropTypes.bool,
  name: PropTypes.string.isRequired
};

SidebarMenuItem.defaultProps = {
  open: false,
  active: false
};

export default SidebarMenuItem;
