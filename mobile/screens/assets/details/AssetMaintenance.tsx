import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme, qpmLayoutTokens } from '../../../custom-theme';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/role';
import { PlanFeature } from '../../../models/subscriptionPlan';
import Meter from '../../../models/meter';
import PreventiveMaintenance from '../../../models/preventiveMaintenance';
import AssetDowntime from '../../../models/assetDowntime';
import { AssetDTO } from '../../../models/asset';
import { RootStackScreenProps } from '../../../types';
import api from '../../../utils/api';
import AsyncStateFeedback from '../../../components/AsyncStateFeedback';
import Tag from '../../../components/Tag';

type Props = {
  asset: AssetDTO;
  navigation: RootStackScreenProps<'AssetDetails'>['navigation'];
};

export default function AssetMaintenance({ asset, navigation }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { hasViewPermission, hasFeature } = useAuth();
  const canViewMeters = hasViewPermission(PermissionEntity.METERS);
  const canViewPM = hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES);
  const canViewPMFeature = hasFeature(PlanFeature.PREVENTIVE_MAINTENANCE);
  const canViewDowntime = hasViewPermission(PermissionEntity.ASSETS);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [plans, setPlans] = useState<PreventiveMaintenance[]>([]);
  const [downtimes, setDowntimes] = useState<AssetDowntime[]>([]);
  const [loading, setLoading] = useState({
    meters: false,
    plans: false,
    downtime: false
  });
  const [errors, setErrors] = useState({
    meters: false,
    plans: false,
    downtime: false
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const requestSequence = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const requestId = ++requestSequence.current;
    const isCurrent = () => requestSequence.current === requestId;
    setErrors({ meters: false, plans: false, downtime: false });
    setLoading({
      meters: canViewMeters,
      plans: canViewPM && canViewPMFeature,
      downtime: canViewDowntime
    });

    const tasks = [
      canViewMeters
        ? api
            .get<Meter[]>(`meters/asset/${asset.id}`, {
              signal: controller.signal
            })
            .then((result) => isCurrent() && setMeters(result))
            .catch(
              () =>
                isCurrent() &&
                setErrors((current) => ({ ...current, meters: true }))
            )
            .finally(
              () =>
                isCurrent() &&
                setLoading((current) => ({ ...current, meters: false }))
            )
        : Promise.resolve(),
      canViewPM && canViewPMFeature
        ? (async () => {
            const allPlans: PreventiveMaintenance[] = [];
            let pageNum = 0;
            let last = false;
            do {
              const result = await api.post<{
                content: PreventiveMaintenance[];
                last: boolean;
              }>(
                'preventive-maintenances/search',
                {
                  filterFields: [
                    { field: 'asset.id', operation: 'eq', value: asset.id },
                    {
                      field: 'schedule.disabled',
                      operation: 'eq',
                      value: false
                    }
                  ],
                  sortField: 'id',
                  direction: 'ASC',
                  pageNum,
                  pageSize: 100
                },
                { signal: controller.signal }
              );
              allPlans.push(...result.content);
              last = result.last;
              pageNum += 1;
            } while (!last && !controller.signal.aborted && isCurrent());

            if (isCurrent() && !controller.signal.aborted) {
              setPlans(
                allPlans.sort((a, b) => {
                  const aDate = a.nextWorkOrderDate
                    ? new Date(a.nextWorkOrderDate).getTime()
                    : Number.POSITIVE_INFINITY;
                  const bDate = b.nextWorkOrderDate
                    ? new Date(b.nextWorkOrderDate).getTime()
                    : Number.POSITIVE_INFINITY;
                  return aDate - bDate;
                })
              );
            }
          })()
            .catch(
              () =>
                isCurrent() &&
                !controller.signal.aborted &&
                setErrors((current) => ({ ...current, plans: true }))
            )
            .finally(
              () =>
                isCurrent() &&
                !controller.signal.aborted &&
                setLoading((current) => ({ ...current, plans: false }))
            )
        : Promise.resolve(),
      canViewDowntime
        ? api
            .get<AssetDowntime[]>(`asset-downtimes/asset/${asset.id}`, {
              signal: controller.signal
            })
            .then((result) => isCurrent() && setDowntimes(result))
            .catch(
              () =>
                isCurrent() &&
                setErrors((current) => ({ ...current, downtime: true }))
            )
            .finally(
              () =>
                isCurrent() &&
                setLoading((current) => ({ ...current, downtime: false }))
            )
        : Promise.resolve()
    ];

    await Promise.all(tasks);
  }, [asset.id, canViewDowntime, canViewMeters, canViewPM, canViewPMFeature]);

  useEffect(() => {
    void load();
    return () => {
      requestSequence.current += 1;
      activeController.current?.abort();
    };
  }, [load, refreshKey]);

  const retry = () => setRefreshKey((value) => value + 1);
  const formatDuration = (seconds: number) => {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
  };
  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant
    }
  ];

  const renderSectionState = (
    key: 'meters' | 'plans' | 'downtime',
    allowed: boolean,
    errorMessage: string,
    isEmpty: boolean,
    deniedMessage = 'no_access_assets'
  ) => {
    if (!allowed) {
      return (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          {t(deniedMessage)}
        </Text>
      );
    }
    if (loading[key]) return <ActivityIndicator color={theme.colors.primary} />;
    if (errors[key]) {
      return (
        <AsyncStateFeedback
          mode="error"
          message={errorMessage}
          onRetry={retry}
        />
      );
    }
    if (isEmpty) {
      return (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          {t('no_content')}
        </Text>
      );
    }
    return null;
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={Object.values(loading).some(Boolean)}
          onRefresh={retry}
          colors={[theme.colors.primary]}
        />
      }
    >
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('meters')}
        </Text>
        {renderSectionState(
          'meters',
          canViewMeters,
          t('meter_list_load_error'),
          meters.length === 0
        )}
        {canViewMeters &&
          !loading.meters &&
          !errors.meters &&
          meters.map((meter) => {
            const accessibilityLabel = [
              meter.name,
              meter.unit,
              meter.lastReading
                ? `${t('last_reading')}: ${getFormattedDate(
                    meter.lastReading,
                    true
                  )}`
                : null,
              meter.nextReading
                ? `${t('next_reading_due')}: ${getFormattedDate(
                    meter.nextReading,
                    true
                  )}`
                : null
            ]
              .filter((part): part is string => Boolean(part))
              .join('. ');

            return (
              <Card
                key={meter.id}
                mode="outlined"
                style={cardStyle}
                onPress={() =>
                  navigation.push('MeterDetails', {
                    id: meter.id,
                    meterProp: meter
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.cardHeading}>
                    <Text variant="titleSmall" style={styles.cardTitle}>
                      {meter.name}
                    </Text>
                    <Chip compact>{meter.unit}</Chip>
                  </View>
                  {meter.lastReading ? (
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {t('last_reading')}:{' '}
                      {getFormattedDate(meter.lastReading, true)}
                    </Text>
                  ) : null}
                  {meter.nextReading ? (
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {t('next_reading_due')}:{' '}
                      {getFormattedDate(meter.nextReading, true)}
                    </Text>
                  ) : null}
                </Card.Content>
              </Card>
            );
          })}
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('preventive_maintenance')}
        </Text>
        {!canViewPM &&
          renderSectionState(
            'plans',
            false,
            t('an_error_occured'),
            true,
            'no_access_preventive_maintenance'
          )}
        {canViewPM && !canViewPMFeature ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {t('upgrade_preventive_maintenance')}
          </Text>
        ) : canViewPM ? (
          renderSectionState(
            'plans',
            true,
            t('an_error_occured'),
            plans.length === 0
          )
        ) : null}
        {canViewPM &&
          canViewPMFeature &&
          !loading.plans &&
          !errors.plans &&
          plans.map((plan) => {
            const meterBased = plan.schedule?.triggerType === 'METER';
            const nextSchedule = meterBased
              ? plan.schedule?.nextMeterValue != null
                ? `${plan.schedule.nextMeterValue} ${
                    plan.schedule.meterUnit ?? ''
                  }`.trim()
                : t('pm_no_next_meter_threshold')
              : plan.nextWorkOrderDate
              ? getFormattedDate(plan.nextWorkOrderDate, true)
              : t('pm_no_next_occurrence');
            return (
              <Card
                key={plan.id}
                mode="outlined"
                style={cardStyle}
                onPress={() =>
                  navigation.push('PreventiveMaintenanceDetails', {
                    id: plan.id,
                    pmProp: plan
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`${plan.name}, ${plan.title}, ${nextSchedule}`}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.cardHeading}>
                    <Text variant="titleSmall" style={styles.cardTitle}>
                      {plan.name}
                    </Text>
                    <Chip
                      compact
                      icon={meterBased ? 'speedometer' : 'calendar-month'}
                    >
                      {t(meterBased ? 'pm_meter_based' : 'pm_calendar_based')}
                    </Chip>
                  </View>
                  <Text variant="bodyMedium" numberOfLines={2}>
                    {plan.title}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {t(meterBased ? 'pm_next_threshold' : 'pm_next_occurrence')}
                    : {nextSchedule}
                  </Text>
                </Card.Content>
              </Card>
            );
          })}
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('downtimes')}
        </Text>
        {renderSectionState(
          'downtime',
          canViewDowntime,
          t('an_error_occured'),
          downtimes.length === 0
        )}
        {canViewDowntime &&
          !loading.downtime &&
          !errors.downtime &&
          [...downtimes]
            .sort(
              (a, b) =>
                new Date(b.startsOn).getTime() - new Date(a.startsOn).getTime()
            )
            .slice(0, 10)
            .map((record) => {
              const ongoing = record.duration === 0;
              const startDate = getFormattedDate(record.startsOn, true);
              const accessibleDuration = ongoing
                ? t('downtime_ongoing')
                : `${t('duration')}, ${formatDuration(record.duration)}`;
              return (
                <Card
                  key={record.id}
                  mode="outlined"
                  style={cardStyle}
                  accessible
                  accessibilityLabel={`${t(
                    'downtimes'
                  )}, ${startDate}, ${accessibleDuration}`}
                >
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.cardHeading}>
                      <Text variant="titleSmall" style={styles.cardTitle}>
                        {startDate}
                      </Text>
                      {ongoing ? (
                        <Tag
                          text={t('downtime_ongoing')}
                          color={theme.colors.onError}
                          backgroundColor={theme.colors.error}
                        />
                      ) : null}
                    </View>
                    {record.duration > 0 ? (
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {formatDuration(record.duration)}
                      </Text>
                    ) : null}
                  </Card.Content>
                </Card>
              );
            })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: qpmLayoutTokens.space.lg,
    paddingBottom: qpmLayoutTokens.space.xl
  },
  section: {
    gap: qpmLayoutTokens.space.sm,
    marginBottom: qpmLayoutTokens.space.xl
  },
  sectionTitle: { fontWeight: '700' },
  card: {
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    borderWidth: 1,
    marginBottom: qpmLayoutTokens.space.xs
  },
  cardContent: { gap: qpmLayoutTokens.space.xs },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: qpmLayoutTokens.space.sm
  },
  cardTitle: { fontWeight: '700', flex: 1 }
});
