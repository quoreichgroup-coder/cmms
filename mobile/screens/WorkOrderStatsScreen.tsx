import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions
} from 'react-native';
import { View } from '../components/Themed';
import { useDispatch, useSelector } from '../store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMobileOverviewStats } from '../slices/analytics/workOrder';
import { RootStackScreenProps } from '../types';
import { useTranslation } from 'react-i18next';
import { Icon, Text } from 'react-native-paper';
import AsyncStateFeedback from '../components/AsyncStateFeedback';
import { qpmLayoutTokens, useAppTheme } from '../custom-theme';
import useAuth from '../hooks/useAuth';
import { PermissionEntity } from '../models/role';
import { FilterField } from '../models/page';
import {
  ExtendedWorkOrderStatus,
  getStatusColor,
  getStatusContainerColor
} from '../utils/overall';
import {
  canNavigateDashboardWorkOrders,
  getDashboardWorkOrderScope,
  withDashboardWorkOrderScope
} from '../utils/analytics';
import { getCompanyDayRange } from '../utils/dashboardDates';

type DashboardMetric = {
  label: ExtendedWorkOrderStatus;
  value: number;
  icon: string;
  filterFields: FilterField[];
};

export default function WorkOrderStatsScreen({
  navigation
}: RootStackScreenProps<'WorkOrderStats'>) {
  const dispatch = useDispatch();
  const { width: screenWidth } = useWindowDimensions();
  const metricWidth = screenWidth >= 700 ? '31%' : '47%';
  const { t } = useTranslation();
  const theme = useAppTheme();
  const {
    userSettings,
    fetchUserSettings,
    hasViewPermission,
    hasViewOtherPermission,
    user,
    companySettings
  } = useAuth();
  const canViewWorkOrders = hasViewPermission(PermissionEntity.WORK_ORDERS);
  const canViewOtherWorkOrders = hasViewOtherPermission(
    PermissionEntity.WORK_ORDERS
  );
  const { mobileOverview, mobileOverviewLoaded, loading, errors } = useSelector(
    (state) => state.woAnalytics
  );
  const [settingsLoading, setSettingsLoading] = useState(
    canViewOtherWorkOrders && !userSettings
  );
  const [settingsError, setSettingsError] = useState(false);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError(false);
    try {
      await fetchUserSettings();
    } catch (_error) {
      setSettingsError(true);
    } finally {
      setSettingsLoading(false);
    }
  }, [fetchUserSettings]);

  useEffect(() => {
    if (canViewOtherWorkOrders && !userSettings) void loadSettings();
    else setSettingsLoading(false);
  }, [canViewOtherWorkOrders, loadSettings, userSettings]);

  const workOrderScope = getDashboardWorkOrderScope(
    canViewWorkOrders,
    canViewOtherWorkOrders,
    canViewOtherWorkOrders ? userSettings?.statsForAssignedWorkOrders : true
  );
  const canOpenWorkOrderList = canNavigateDashboardWorkOrders(
    workOrderScope,
    user?.id
  );
  const [todayStart, tomorrowStart] = getCompanyDayRange(
    new Date(),
    companySettings?.generalPreferences?.timeZone ?? 'UTC'
  );

  useEffect(() => {
    if (workOrderScope !== null)
      dispatch(getMobileOverviewStats(workOrderScope));
  }, [dispatch, workOrderScope]);

  const retry = () => {
    if (settingsError || (canViewOtherWorkOrders && !userSettings)) {
      void loadSettings();
    } else if (workOrderScope !== null) {
      dispatch(getMobileOverviewStats(workOrderScope));
    }
  };

  const metrics = useMemo<DashboardMetric[]>(
    () => [
      {
        label: 'OPEN',
        value: mobileOverview.open,
        icon: 'wrench-outline',
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
        icon: 'pause-circle-outline',
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
        icon: 'progress-clock',
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
        icon: 'check-circle-outline',
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
      {
        label: 'TODAY_WO',
        value: mobileOverview.today,
        icon: 'calendar-today',
        filterFields: [
          {
            field: 'dueDate',
            operation: 'ge',
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
        icon: 'alert-circle-outline',
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
    ],
    [mobileOverview, todayStart, tomorrowStart]
  );

  const distribution = metrics.slice(0, 4);
  const distributionMax = Math.max(
    ...distribution.map((metric) => metric.value)
  );

  if (!canViewWorkOrders) {
    return (
      <AsyncStateFeedback
        mode="permissionDenied"
        message={t('permission_denied_message', {
          permission: t('work_orders')
        })}
      />
    );
  }

  if (settingsError) {
    return (
      <AsyncStateFeedback
        mode="error"
        message={t('an_error_occured')}
        onRetry={retry}
      />
    );
  }

  if (
    settingsLoading ||
    workOrderScope === null ||
    (!mobileOverviewLoaded && errors.mobileOverview)
  ) {
    if (errors.mobileOverview && !settingsLoading) {
      return (
        <AsyncStateFeedback
          mode="error"
          message={errors.mobileOverview}
          onRetry={retry}
        />
      );
    }
    return <AsyncStateFeedback mode="loading" message={t('please_wait')} />;
  }

  if (!mobileOverviewLoaded) {
    return <AsyncStateFeedback mode="loading" message={t('please_wait')} />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => dispatch(getMobileOverviewStats(workOrderScope))}
          refreshing={loading.mobileOverview}
          colors={[theme.colors.primary]}
        />
      }
    >
      {errors.mobileOverview && (
        <AsyncStateFeedback
          mode="banner"
          message={errors.mobileOverview}
          onRetry={retry}
        />
      )}

      <View style={styles.intro}>
        <Text
          variant="titleLarge"
          style={{ color: theme.colors.onSurface, fontWeight: '700' }}
          accessibilityRole="header"
        >
          {t('maintenance_dashboard')}
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {t('maintenance_dashboard_subtitle')}
        </Text>
        {canViewOtherWorkOrders && (
          <View
            style={[
              styles.scopeBadge,
              { backgroundColor: theme.colors.secondaryContainer }
            ]}
          >
            <Icon
              source={workOrderScope ? 'account-outline' : 'domain'}
              size={16}
              color={theme.colors.onSecondaryContainer}
            />
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onSecondaryContainer }}
            >
              {workOrderScope ? t('only_assigned_to_me') : t('all_work_orders')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.metricGrid}>
        {metrics.map((metric) => {
          const accent = getStatusColor(metric.label, theme);
          return (
            <TouchableOpacity
              key={metric.label}
              accessibilityRole="button"
              accessibilityLabel={`${t(metric.label)}: ${metric.value}`}
              accessibilityHint={t('open_filtered_work_orders')}
              accessibilityState={{ disabled: !canOpenWorkOrderList }}
              disabled={!canOpenWorkOrderList}
              onPress={() => {
                if (!canOpenWorkOrderList) return;
                navigation.navigate('Root', {
                  screen: 'WorkOrders',
                  params: {
                    filterFields: withDashboardWorkOrderScope(
                      metric.filterFields,
                      workOrderScope,
                      user?.id
                    ),
                    fromHome: true
                  }
                });
              }}
              style={[
                styles.metricCard,
                { width: metricWidth },
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant
                }
              ]}
            >
              <View style={styles.metricTop}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: getStatusContainerColor(
                        metric.label,
                        theme
                      )
                    }
                  ]}
                >
                  <Icon source={metric.icon} size={20} color={accent} />
                </View>
                <Icon
                  source="arrow-top-right"
                  size={17}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
              <Text
                variant="headlineMedium"
                style={{ color: theme.colors.onSurface, fontWeight: '700' }}
              >
                {metric.value}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t(metric.label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={[
          styles.distributionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant
          }
        ]}
      >
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurface, fontWeight: '700' }}
          accessibilityRole="header"
        >
          {t('work_order_distribution')}
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {t('work_order_distribution_hint')}
        </Text>
        {distribution.map((metric) => {
          const relativeWidth =
            distributionMax > 0 ? (metric.value / distributionMax) * 100 : 0;
          const accent = getStatusColor(metric.label, theme);
          return (
            <View key={metric.label} style={styles.distributionRow}>
              <View style={styles.distributionLabel}>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurface, flex: 1 }}
                >
                  {t(metric.label)}
                </Text>
                <Text
                  variant="labelLarge"
                  style={{ color: theme.colors.onSurface, fontWeight: '700' }}
                >
                  {metric.value}
                </Text>
              </View>
              <View
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${t(metric.label)}: ${metric.value}`}
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.colors.surfaceVariant }
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${relativeWidth}%`, backgroundColor: accent }
                  ]}
                />
              </View>
            </View>
          );
        })}
        {distributionMax === 0 && (
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {t('no_work_orders_available')}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: qpmLayoutTokens.space.lg,
    paddingBottom: qpmLayoutTokens.space.xxxl,
    gap: qpmLayoutTokens.space.lg
  },
  intro: { gap: qpmLayoutTokens.space.xs },
  scopeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: qpmLayoutTokens.radius.pill,
    paddingHorizontal: 12,
    minHeight: 32,
    marginTop: 4
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: qpmLayoutTokens.space.md
  },
  metricCard: {
    minHeight: 132,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    padding: qpmLayoutTokens.space.md,
    gap: 5,
    justifyContent: 'space-between'
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12
  },
  distributionCard: {
    padding: qpmLayoutTokens.space.lg,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    gap: qpmLayoutTokens.space.md
  },
  distributionRow: { gap: qpmLayoutTokens.space.xs },
  distributionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: qpmLayoutTokens.space.sm
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: qpmLayoutTokens.radius.pill
  },
  progressFill: { height: '100%', borderRadius: qpmLayoutTokens.radius.pill }
});
