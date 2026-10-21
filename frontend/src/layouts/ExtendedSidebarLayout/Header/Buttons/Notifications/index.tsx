import {
  cloneElement,
  ReactElement,
  UIEvent,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  alpha,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  styled,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Scrollbar from 'src/components/Scrollbar';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import Text from 'src/components/Text';

import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from '../../../../../store';
import { CustomSnackBarContext } from '../../../../../contexts/CustomSnackBarContext';
import {
  editNotification,
  getMoreNotifications,
  getNotifications,
  newReceivedNotification,
  readAllNotifications
} from '../../../../../slices/notification';
import Notification, {
  NotificationType
} from '../../../../../models/owns/notification';
import {
  getAssetUrl,
  getLocationUrl,
  getMeterUrl,
  getPartUrl,
  getPurchaseOrderUrl,
  getRequestUrl,
  getTeamUrl,
  getWorkOrderUrl
} from '../../../../../utils/urlPaths';
import { CompanySettingsContext } from '../../../../../contexts/CompanySettingsContext';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import { SearchCriteria } from '../../../../../models/owns/page';
import useAuth from 'src/hooks/useAuth';
import { createAuthenticatedStompClient } from 'src/utils/authenticatedStompClient';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { getErrorMessage } from '../../../../../utils/api';

const BoxComposed = styled(Box)(
  () => `
  position: relative;
`
);

const BoxComposedContent = styled(Box)(
  ({ theme }) => `
  position: relative;
  z-index: 7;

  .MuiTypography-root {
      color: ${theme.palette.primary.contrastText};

      & + .MuiTypography-root {
          color: ${alpha(theme.palette.primary.contrastText, 0.7)};
      }
  }
  
`
);

const BoxComposedImage = styled(Box)(
  () => `
  position: absolute;
  left: 0;
  top: 0;
  z-index: 5;
  filter: grayscale(80%);
  background-size: cover;
  height: 100%;
  width: 100%;
  border-radius: inherit;
`
);

const BoxComposedBg = styled(Box)(
  () => `
  position: absolute;
  left: 0;
  top: 0;
  z-index: 6;
  height: 100%;
  width: 100%;
  border-radius: inherit;
`
);

const IconButtonWrapper = styled(IconButton)(
  ({ theme }) => `
  width: ${theme.spacing(4)};
  height: ${theme.spacing(4)};
  border-radius: ${theme.general.borderRadiusLg};
`
);

const initialCriteria: SearchCriteria = {
  filterFields: [],
  pageSize: 25,
  pageNum: 0,
  direction: 'DESC'
};

function HeaderNotifications() {
  const ref = useRef<any>(null);
  const [isOpen, setOpen] = useState<boolean>(false);
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notifications, currentPageNum, lastPage, loadingGet } = useSelector(
    (state) => state.notifications
  );
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const criteria = initialCriteria;
  const { user } = useAuth();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  useEffect(() => {
    if (user?.id) dispatch(getNotifications(criteria));
  }, [user?.id, dispatch]);
  useEffect(() => {
    if (!user?.id || !user.email) {
      return;
    }

    const client = createAuthenticatedStompClient();
    let isActive = true;
    client.onConnect = () => {
      if (!isActive) return;
      client.subscribe(`/user/${user.email}/notifications`, (message) => {
        if (!isActive) return;
        try {
          const notification: Notification = JSON.parse(message.body);
          dispatch(newReceivedNotification(notification));
        } catch {
          // Ignore malformed broker messages; do not break the live connection.
        }
      });
    };
    client.activate();

    return () => {
      isActive = false;
      void client.deactivate().catch(() => undefined);
    };
  }, [user?.id, user?.email, dispatch]);
  const handleOpen = (): void => {
    setOpen(true);
  };

  const handleClose = (): void => {
    setOpen(false);
  };
  const onReadNotification = async (notification: Notification) => {
    let url;
    const id = notification.resourceId;
    switch (notification.notificationType) {
      case 'INFO':
        break;
      case 'ASSET':
        url = getAssetUrl(id);
        break;
      case 'REQUEST':
        url = getRequestUrl(id);
        break;
      case 'WORK_ORDER':
        url = getWorkOrderUrl(id);
        break;
      case 'PART':
        url = getPartUrl(id);
        break;
      case 'METER':
        url = getMeterUrl(id);
        break;
      case 'LOCATION':
        url = getLocationUrl(id);
        break;
      case 'TEAM':
        url = getTeamUrl(id);
        break;
      case 'PURCHASE_ORDER':
        url = getPurchaseOrderUrl(id);
        break;
      default:
        break;
    }
    if (notification.seen) {
      if (url) {
        navigate(url);
      }
      handleClose();
      return;
    }

    try {
      await dispatch(editNotification(notification.id, { seen: true }));
      if (url) navigate(url);
      handleClose();
    } catch (error) {
      showSnackBar(getErrorMessage(error), 'error');
    }
  };

  const handleReadAll = async () => {
    try {
      await dispatch(readAllNotifications());
    } catch (error) {
      showSnackBar(getErrorMessage(error), 'error');
    }
  };
  const notificationIcons: Record<NotificationType, ReactElement> = {
    ASSET: <Inventory2OutlinedIcon />,
    LOCATION: <LocationOnOutlinedIcon />,
    METER: <SpeedOutlinedIcon />,
    PART: <HandymanOutlinedIcon />,
    REQUEST: <MoveToInboxOutlinedIcon />,
    TEAM: <PeopleOutlineIcon />,
    WORK_ORDER: <AssignmentOutlinedIcon />,
    INFO: <NotificationsNoneOutlinedIcon />,
    PURCHASE_ORDER: <ReceiptOutlinedIcon />
  };
  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    const atBottom = scrollHeight - scrollTop - clientHeight <= 2;
    if (atBottom && !loadingGet && !lastPage) {
      dispatch(getMoreNotifications(criteria, currentPageNum + 1));
    }
  };
  return (
    <>
      <Tooltip arrow title={t('Notifications')}>
        <Badge
          variant="dot"
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right'
          }}
          sx={
            notifications.content.filter((notification) => !notification.seen)
              .length
              ? {
                  '.MuiBadge-badge': {
                    background: theme.colors.success.main,
                    animation: 'pulse 1s infinite',
                    transition: `${theme.transitions.create(['all'])}`
                  }
                }
              : {}
          }
        >
          <IconButtonWrapper
            sx={{
              background: alpha(theme.colors.primary.main, 0.1),
              transition: `${theme.transitions.create(['background'])}`,
              color: theme.colors.primary.main,

              '&:hover': {
                background: alpha(theme.colors.primary.main, 0.2)
              }
            }}
            color="primary"
            ref={ref}
            onClick={handleOpen}
          >
            <NotificationsActiveOutlinedIcon fontSize="small" />
          </IconButtonWrapper>
        </Badge>
      </Tooltip>
      <Popover
        disableScrollLock
        anchorEl={ref.current}
        onClose={handleClose}
        open={isOpen}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <Box minWidth={440} maxWidth={440} p={1}>
          <BoxComposed
            mb={1}
            sx={{
              borderRadius: `${theme.general.borderRadius}`,
              background: `${theme.colors.gradients.black1}`
            }}
          >
            <BoxComposedBg
              sx={{
                opacity: 0.3,
                background: `${theme.colors.gradients.green2}`
              }}
            />
            <BoxComposedImage
              sx={{
                opacity: 0.2,
                backgroundImage:
                  'url("/static/images/placeholders/covers/1.jpg")'
              }}
            />
            <BoxComposedContent py={3}>
              <Typography
                textAlign="center"
                sx={{
                  pb: 0.5
                }}
                variant="h4"
              >
                {t('Notifications')}
              </Typography>
              <Typography textAlign="center" variant="subtitle2">
                {t('you_have')}{' '}
                <Text color="success">
                  <b>
                    {
                      notifications.content.filter(
                        (notification) => !notification.seen
                      ).length
                    }
                  </b>
                </Text>{' '}
                {t('new_messages')}
              </Typography>
            </BoxComposedContent>
          </BoxComposed>
          {!!notifications.content.filter((notification) => !notification.seen)
            .length && (
            <Button
              onClick={() => void handleReadAll()}
              startIcon={<CheckCircleOutlineIcon />}
            >
              {t('mark_all_as_seen')}
            </Button>
          )}
        </Box>
        <Divider />
        {!!notifications.content.length && (
          <Box
            sx={{
              height: 220
            }}
          >
            {loadingGet && (
              <CircularProgress
                sx={{
                  position: 'absolute',
                  zIndex: 10,
                  left: '45%',
                  top: '45%'
                }}
              />
            )}
            <Scrollbar onScroll={onScroll}>
              <List sx={{ position: 'relative' }}>
                {notifications.content.map((notification) => (
                  <ListItemButton
                    selected={!notification.seen}
                    key={notification.id}
                    onClick={() => onReadNotification(notification)}
                  >
                    <ListItemIcon>
                      {cloneElement(
                        notificationIcons[notification.notificationType],
                        { color: notification.seen ? undefined : 'primary' }
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={notification.message}
                      secondary={getFormattedDate(notification.createdAt)}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Scrollbar>
          </Box>
        )}
        <Divider />
      </Popover>
    </>
  );
}

export default HeaderNotifications;
