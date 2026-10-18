import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { View } from '../components/Themed';
import { RootTabScreenProps } from '../types';
import {
  ActivityIndicator,
  Badge,
  Button,
  Icon,
  IconButton,
  Switch,
  Text
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import {
  ExtendedWorkOrderStatus,
  getStatusColor,
  getStatusContainerColor
} from '../utils/overall';
import { FilterField, SearchCriteria } from '../models/page';
import useAuth from '../hooks/useAuth';
import * as React from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { getMobileOverviewStats } from '../slices/analytics/workOrder';
import { useDispatch, useSelector } from '../store';
import { getUnreadNotificationCount } from '../slices/notification';
import { useNetInfo } from '@react-native-community/netinfo';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';
import { PermissionEntity } from '../models/role';
import { qpmLayoutTokens, useAppTheme } from '../custom-theme';
import { useIsFocused } from '@react-navigation/native';
import { formatDashboardDate, getUtcDayRange } from '../utils/dashboardDates';
import { createAsyncActionLock } from '../utils/asyncActionLock';
import {
  canNavigateDashboardWorkOrders,
  getDashboardWorkOrderScope,
  withDashboardWorkOrderScope
} from '../utils/analytics';
import AsyncStateFeedback from '../components/AsyncStateFeedback';
import { canAttemptOnlineAction } from '../utils/networkAvailability';

export default function HomeScreen({ navigation }: RootTabScreenProps<'Home'>) {
  const theme = useAppTheme();
  const isFocused = useIsFocused();
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const netInfo = useNetInfo();
  const {
    userSettings,
    fetchUserSettings,
    hasViewPermission,
    hasViewOtherPermission,
    patchUserSettings,
    user
  } = useAuth();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const canViewWorkOrders = hasViewPermission(PermissionEntity.WORK_ORDERS);
  const canViewOtherWorkOrders = hasViewOtherPermission(
    PermissionEntity.WORK_ORDERS
  );
  const {
    unreadCount: unreadNotificationCount,
    unreadCountLoading: notificationsLoading,
    unreadCountError: notificationsLoadError
  } = useSelector((state) => state.notifications);
  const { mobileOverview, mobileOverviewLoaded, loading, errors } = useSelector(
    (state) => state.woAnalytics
  );
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(false);
  const iconButtonStyle = {
    ...styles.iconButton,
    backgroundColor: theme.colors.background
  };
  const scanAsset = () => {
    if (canAttemptOnlineAction(netInfo)) {
      navigation.navigate('ScanAsset');
    } else {
      showSnackBar(t('no_internet_connection'), 'error');
    }
  };
  const [assignedToMe, setAssignedToMe] = useState<boolean>(
    Boolean(userSettings?.statsForAssignedWorkOrders)
  );
  const [savingAssignmentPreference, setSavingAssignmentPreference] =
    useState(false);
  const saveAssignmentPreference = React.useRef(
    createAsyncActionLock()
  ).current;
  const workOrderScope = getDashboardWorkOrderScope(
    canViewWorkOrders,
    canViewOtherWorkOrders,
    userSettings?.statsForAssignedWorkOrders
  );
  const canOpenWorkOrderList = canNavigateDashboardWorkOrders(
    workOrderScope,
    user?.id
  );
  const [todayStart, tomorrowStart] = getUtcDayRange();

  const loadUnreadNotificationCount = React.useCallback(() => {
    return dispatch(getUnreadNotificationCount());
  }, [dispatch]);

  const loadDashboardSettings = async () => {
    setSettingsLoading(true);
    setSettingsError(false);
    try {
      await fetchUserSettings();
    } catch (_error) {
      setSettingsError(true);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardSettings();
  }, []);

  useEffect(() => {
    if (isFocused && workOrderScope !== null) {
      dispatch(getMobileOverviewStats(workOrderScope));
      setAssignedToMe(workOrderScope);
    }
  }, [dispatch, isFocused, workOrderScope]);

  useEffect(() => {
    if (isFocused) void loadUnreadNotificationCount();
  }, [isFocused, loadUnreadNotificationCount]);

  const onRefresh = () => {
    void loadUnreadNotificationCount();
    if (settingsError || !userSettings) {
      void loadDashboardSettings();
    } else if (workOrderScope !== null) {
      dispatch(getMobileOverviewStats(workOrderScope));
    }
  };

  const updateAssignmentPreference = (value: boolean) => {
    if (!canViewOtherWorkOrders || !userSettings) return;
    void saveAssignmentPreference(async () => {
      setSavingAssignmentPreference(true);
      try {
        const updatedSettings = await patchUserSettings({
          ...userSettings,
          statsForAssignedWorkOrders: value
        });
        setAssignedToMe(Boolean(updatedSettings.statsForAssignedWorkOrders));
      } catch (_error) {
        showSnackBar(t('an_error_occured'), 'error');
      } finally {
        setSavingAssignmentPreference(false);
      }
    });
  };

  const stats: {
    label: ExtendedWorkOrderStatus;
    value: number;
    filterFields: FilterField[];
  }[] = [
    {
      label: 'OPEN',
      value: mobileOverview.open,
      filterFields: [
        {
          field: 'status',
          operation: 'in',
          value: '',
          values: ['OPEN'],
          enumName: 'STATUS'
        }
      ]
    },
    {
      label: 'ON_HOLD',
      value: mobileOverview.onHold,
      filterFields: [
        {
          field: 'status',
          operation: 'in',
          value: '',
          values: ['ON_HOLD'],
          enumName: 'STATUS'
        }
      ]
    },
    {
      label: 'IN_PROGRESS',
      value: mobileOverview.inProgress,
      filterFields: [
        {
          field: 'status',
          operation: 'in',
          value: '',
          values: ['IN_PROGRESS'],
          enumName: 'STATUS'
        }
      ]
    },
    {
      label: 'COMPLETE',
      value: mobileOverview.complete,
      filterFields: [
        {
          field: 'status',
          operation: 'in',
          value: '',
          values: ['COMPLETE'],
          enumName: 'STATUS'
        }
      ]
    },
    // {
    //   label: 'LATE_WO', value: 3,
    //   filterField: {
    //     field: 'dueDate',
    //     operation: 'ge',
    //     value: 'ON_HOLD'
    //   }
    // },
    {
      label: 'TODAY_WO',
      value: mobileOverview.today,
      filterFields: [
        {
          field: 'dueDate',
          operation: 'gt',
          value: todayStart,
          enumName: 'JS_DATE'
        },
        {
          field: 'dueDate',
          operation: 'lt',
          value: tomorrowStart,
          enumName: 'JS_DATE'
        }
      ]
    },
    {
      label: 'HIGH_WO',
      value: mobileOverview.high,
      filterFields: [
        {
          field: 'priority',
          operation: 'in',
          value: '',
          values: ['HIGH'],
          enumName: 'PRIORITY'
        }
      ]
    }
  ];
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 100 }}
      style={{ ...styles.container, backgroundColor: theme.colors.background }}
      refreshControl={
        <RefreshControl
          refreshing={
            settingsLoading || loading.mobileOverview || notificationsLoading
          }
          colors={[theme.colors.primary]}
          onRefresh={onRefresh}
        />
      }
    >
      {settingsError && (
        <AsyncStateFeedback
          mode="banner"
          message={t('dashboard_settings_load_error')}
          onRetry={onRefresh}
        />
      )}
      {canViewWorkOrders && errors.mobileOverview && (
        <AsyncStateFeedback
          mode="banner"
          message={t('work_orders_load_error')}
          onRetry={onRefresh}
        />
      )}
      {notificationsLoadError && (
        <AsyncStateFeedback
          mode="banner"
          message={t('notifications_load_error')}
          onRetry={() => void loadUnreadNotificationCount()}
        />
      )}
      <View
        style={[
          styles.dashboardHero,
          { backgroundColor: theme.colors.brandHeader }
        ]}
      >
        <View style={[styles.heroTopline, { backgroundColor: 'transparent' }]}>
          <Text
            variant="labelLarge"
            style={[
              styles.heroEyebrow,
              { color: theme.colors.onBrandHeader, opacity: 1 }
            ]}
          >
            QPM · {t('home')}
          </Text>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onBrandHeader, opacity: 1 }}
          >
            {formatDashboardDate(
              new Date(),
              i18n.resolvedLanguage || i18n.language
            )}
          </Text>
        </View>
        <Text
          variant="headlineSmall"
          style={[styles.heroGreeting, { color: theme.colors.onBrandHeader }]}
        >
          {user?.firstName
            ? `${t('good_day')}, ${user.firstName}`
            : t('good_day')}
        </Text>
        {canViewWorkOrders && (
          <>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onBrandHeader }}
            >
              {mobileOverviewLoaded
                ? `${mobileOverview.open + mobileOverview.inProgress} ${t(
                    'work_orders'
                  ).toLowerCase()}`
                : settingsLoading || loading.mobileOverview
                ? t('loading')
                : '—'}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('work_orders')}
              accessibilityState={{ disabled: !canOpenWorkOrderList }}
              style={[
                styles.heroAction,
                { backgroundColor: theme.colors.surface }
              ]}
              disabled={!canOpenWorkOrderList}
              onPress={() => {
                if (!canOpenWorkOrderList) return;
                navigation.navigate('WorkOrders', {
                  filterFields: withDashboardWorkOrderScope(
                    [],
                    workOrderScope === true,
                    user?.id
                  ),
                  fromHome: true
                });
              }}
            >
              <Text
                variant="labelLarge"
                style={[styles.heroActionText, { color: theme.colors.primary }]}
              >
                {t('work_orders')}
              </Text>
              <Text
                style={[
                  styles.heroActionArrow,
                  { color: theme.colors.primary }
                ]}
              >
                →
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <View style={styles.quickActions}>
        {hasViewPermission(PermissionEntity.ASSETS) && (
          <Button
            mode="contained"
            icon="magnify-scan"
            accessibilityLabel={t('to_scan')}
            style={styles.scanButton}
            onPress={scanAsset}
          >
            {t('to_scan')}
          </Button>
        )}
        {canViewWorkOrders && (
          <IconButton
            style={iconButtonStyle}
            icon={'poll'}
            accessibilityLabel={t('stats')}
            onPress={() => navigation.navigate('WorkOrderStats')}
          />
        )}
        <View style={{ ...iconButtonStyle, position: 'relative' }}>
          <IconButton
            icon={'bell-outline'}
            accessibilityLabel={
              unreadNotificationCount === null
                ? t('notifications')
                : `${t('notifications')}: ${unreadNotificationCount}`
            }
            onPress={() => navigation.navigate('Notifications')}
          />
          <Badge
            accessible={false}
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: theme.colors.error
            }}
            visible={(unreadNotificationCount ?? 0) > 0}
          >
            {unreadNotificationCount ?? 0}
          </Badge>
        </View>
        {hasViewPermission(PermissionEntity.ASSETS) && (
          <IconButton
            style={iconButtonStyle}
            icon={'package-variant-closed'}
            accessibilityLabel={t('assets')}
            onPress={() => navigation.navigate('Assets')}
          />
        )}
      </View>
      {canViewWorkOrders && canViewOtherWorkOrders && (
        <View
          style={[
            styles.assignedCard,
            { backgroundColor: theme.colors.surface }
          ]}
        >
          <View style={styles.assignedCopy}>
            <Text variant="titleSmall" style={styles.assignedTitle}>
              {t('only_assigned_to_me')}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t('work_orders')}
            </Text>
          </View>
          <View style={styles.assignedControls}>
            {savingAssignmentPreference && (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                accessibilityLabel={t('loading')}
              />
            )}
            <Switch
              value={assignedToMe}
              disabled={!userSettings || savingAssignmentPreference}
              onValueChange={updateAssignmentPreference}
              accessibilityLabel={t('only_assigned_to_me')}
              accessibilityState={{
                disabled: !userSettings || savingAssignmentPreference,
                busy: savingAssignmentPreference
              }}
            />
          </View>
        </View>
      )}
      {canViewWorkOrders && (
        <>
          <View style={styles.statsHeading}>
            <Text
              variant="titleLarge"
              style={styles.sectionTitle}
              accessibilityRole="header"
            >
              {t('work_orders')}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {loading.mobileOverview ? t('loading') : ''}
            </Text>
          </View>
          <View style={styles.statsGrid}>
            {stats.map((stat) => {
              const statusIcons: Record<ExtendedWorkOrderStatus, string> = {
                OPEN: 'wrench-outline',
                ON_HOLD: 'pause-circle-outline',
                IN_PROGRESS: 'progress-clock',
                COMPLETE: 'check-circle-outline',
                LATE_WO: 'alert-circle-outline',
                TODAY_WO: 'calendar-today',
                HIGH_WO: 'alert-circle-outline'
              };
              const iconContainerColor = getStatusContainerColor(
                stat.label,
                theme
              );

              return (
                <TouchableOpacity
                  key={stat.label}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(stat.label)}: ${
                    mobileOverviewLoaded
                      ? stat.value
                      : settingsError || errors.mobileOverview
                      ? t('an_error_occured')
                      : settingsLoading || loading.mobileOverview
                      ? t('loading')
                      : '—'
                  }`}
                  accessibilityState={{
                    disabled: !canOpenWorkOrderList,
                    busy: settingsLoading || loading.mobileOverview
                  }}
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                      borderTopColor: getStatusColor(stat.label, theme)
                    }
                  ]}
                  onPress={() => {
                    if (!canOpenWorkOrderList) return;
                    navigation.navigate('WorkOrders', {
                      filterFields: withDashboardWorkOrderScope(
                        stat.filterFields,
                        workOrderScope === true,
                        user?.id
                      ),
                      fromHome: true
                    });
                  }}
                  disabled={!canOpenWorkOrderList}
                >
                  <View style={styles.statCardTop}>
                    <View
                      accessible={false}
                      style={[
                        styles.statIconContainer,
                        { backgroundColor: iconContainerColor }
                      ]}
                    >
                      <Icon
                        source={statusIcons[stat.label]}
                        size={18}
                        color={getStatusColor(stat.label, theme)}
                      />
                    </View>
                    <Icon
                      source="arrow-top-right"
                      size={18}
                      color={getStatusColor(stat.label, theme)}
                    />
                  </View>
                  <Text variant="headlineMedium" style={styles.statValue}>
                    {mobileOverviewLoaded ? stat.value : '—'}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.statLabel,
                      { color: theme.colors.onSurfaceVariant }
                    ]}
                  >
                    {t(stat.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  iconButton: { width: 50, height: 50, borderRadius: 25 },
  dashboardHero: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 20,
    minHeight: 190,
    borderRadius: qpmLayoutTokens.radius.sheet,
    overflow: 'hidden'
  },
  heroTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  heroEyebrow: { fontWeight: '700', letterSpacing: 0.5 },
  heroGreeting: { fontWeight: '800', marginTop: 18 },
  heroAction: {
    marginTop: 16,
    alignSelf: 'flex-start',
    minHeight: qpmLayoutTokens.touchTarget.minimum,
    paddingHorizontal: 14,
    borderRadius: qpmLayoutTokens.radius.control,
    flexDirection: 'row',
    alignItems: 'center'
  },
  heroActionText: { fontWeight: '700' },
  heroActionArrow: { fontSize: 18, marginLeft: 10 },
  quickActions: {
    marginHorizontal: 16,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 8
  },
  scanButton: {
    minHeight: qpmLayoutTokens.touchTarget.prominent,
    justifyContent: 'center',
    borderRadius: qpmLayoutTokens.radius.control
  },
  assignedCard: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 68,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  assignedCopy: { flex: 1, paddingVertical: 10 },
  assignedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  assignedTitle: { fontWeight: '700' },
  statsHeading: {
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionTitle: { fontWeight: '700' },
  statsGrid: {
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    paddingBottom: 12
  },
  statCard: {
    width: '48%',
    minHeight: 124,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 11,
    borderWidth: 1,
    borderTopWidth: 3,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    justifyContent: 'space-between'
  },
  statCardTop: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  statIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statLabel: { fontWeight: '600' },
  statArrow: { margin: 0, width: 34, height: 34 },
  statValue: { fontWeight: '700' }
});
