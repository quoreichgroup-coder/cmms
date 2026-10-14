import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  Text
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { Page } from '../../models/page';
import PreventiveMaintenance from '../../models/preventiveMaintenance';
import PreventiveMaintenanceCall from '../../models/preventiveMaintenanceCall';
import { WorkOrderMini } from '../../models/workOrder';
import { RootStackScreenProps } from '../../types';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';

const PAGE_SIZE = 10;

export default function PreventiveMaintenanceDetailsScreen({
  navigation,
  route
}: RootStackScreenProps<'PreventiveMaintenanceDetails'>) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { hasViewPermission } = useAuth();
  const canView = hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES);
  const { id } = route.params;
  const [pm, setPm] = useState<PreventiveMaintenance | null>(
    route.params.pmProp ?? null
  );
  const [pmLoading, setPmLoading] = useState(!route.params.pmProp);
  const [pmError, setPmError] = useState(false);
  const [calls, setCalls] = useState<PreventiveMaintenanceCall[]>([]);
  const [callPage, setCallPage] = useState(0);
  const [lastCallPage, setLastCallPage] = useState(true);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callsError, setCallsError] = useState(false);
  const [failedCallRequest, setFailedCallRequest] = useState<{
    pageNum: number;
    append: boolean;
  } | null>(null);
  const callsRequestInProgress = useRef(false);
  const [workOrders, setWorkOrders] = useState<WorkOrderMini[]>([]);
  const [workOrderPage, setWorkOrderPage] = useState(0);
  const [lastWorkOrderPage, setLastWorkOrderPage] = useState(true);
  const [workOrdersLoading, setWorkOrdersLoading] = useState(false);
  const [workOrdersError, setWorkOrdersError] = useState(false);
  const [failedWorkOrderRequest, setFailedWorkOrderRequest] = useState<{
    pageNum: number;
    append: boolean;
  } | null>(null);
  const workOrdersRequestInProgress = useRef(false);

  const loadPM = useCallback(async () => {
    if (!canView) return;
    setPmError(false);
    setPmLoading(true);
    try {
      setPm(
        await api.get<PreventiveMaintenance>(`preventive-maintenances/${id}`)
      );
    } catch (error) {
      console.warn('Could not load preventive maintenance details:', error);
      setPmError(true);
    } finally {
      setPmLoading(false);
    }
  }, [canView, id]);

  const loadCalls = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!canView || callsRequestInProgress.current) return;
      callsRequestInProgress.current = true;
      setCallsError(false);
      setFailedCallRequest(null);
      setCallsLoading(true);
      try {
        const result = await api.get<Page<PreventiveMaintenanceCall>>(
          `preventive-maintenances/${id}/call-history?page=${pageNum}&size=${PAGE_SIZE}`
        );
        setCalls((current) =>
          append
            ? [
                ...current,
                ...result.content.filter(
                  (call) => !current.some((item) => item.id === call.id)
                )
              ]
            : result.content
        );
        setCallPage(result.number);
        setLastCallPage(result.last);
      } catch (error) {
        console.warn('Could not load preventive maintenance calls:', error);
        setCallsError(true);
        setFailedCallRequest({ pageNum, append });
      } finally {
        callsRequestInProgress.current = false;
        setCallsLoading(false);
      }
    },
    [canView, id]
  );

  const loadWorkOrders = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!canView || workOrdersRequestInProgress.current) return;
      workOrdersRequestInProgress.current = true;
      setWorkOrdersError(false);
      setFailedWorkOrderRequest(null);
      setWorkOrdersLoading(true);
      try {
        const result = await api.get<Page<WorkOrderMini>>(
          `preventive-maintenances/${id}/work-order-history?page=${pageNum}&size=${PAGE_SIZE}`
        );
        setWorkOrders((current) =>
          append
            ? [
                ...current,
                ...result.content.filter(
                  (workOrder) =>
                    !current.some((item) => item.id === workOrder.id)
                )
              ]
            : result.content
        );
        setWorkOrderPage(result.number);
        setLastWorkOrderPage(result.last);
      } catch (error) {
        console.warn(
          'Could not load preventive maintenance work orders:',
          error
        );
        setWorkOrdersError(true);
        setFailedWorkOrderRequest({ pageNum, append });
      } finally {
        workOrdersRequestInProgress.current = false;
        setWorkOrdersLoading(false);
      }
    },
    [canView, id]
  );

  useEffect(() => {
    loadPM();
    loadCalls(0, false);
    loadWorkOrders(0, false);
  }, [loadPM, loadCalls, loadWorkOrders]);

  const onRefresh = () => {
    loadPM();
    loadCalls(0, false);
    loadWorkOrders(0, false);
  };

  const retryCalls = () => {
    const request = failedCallRequest ?? { pageNum: 0, append: false };
    void loadCalls(request.pageNum, request.append);
  };

  const retryWorkOrders = () => {
    const request = failedWorkOrderRequest ?? { pageNum: 0, append: false };
    void loadWorkOrders(request.pageNum, request.append);
  };

  if (!canView)
    return (
      <View style={styles.message}>
        <Text>{t('no_access_preventive_maintenance')}</Text>
      </View>
    );

  const meterBased = pm?.schedule?.triggerType === 'METER';
  const scheduleLabel = meterBased
    ? `${pm.schedule.meterCycleInterval ?? '—'} ${
        pm.schedule.meterUnit ?? ''
      } · ${t('pm_reference')}: ${
        pm.schedule.meterReferenceValue ?? '—'
      }`.trim()
    : `${t(pm?.schedule?.recurrenceType ?? '')} · ${
        pm?.schedule?.frequency ?? '—'
      }`;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={pmLoading || callsLoading || workOrdersLoading}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
        />
      }
    >
      {pmLoading && !pm && (
        <AsyncStateFeedback mode="loading" message={t('please_wait')} />
      )}
      {pmError && !pm && (
        <AsyncStateFeedback
          mode="error"
          message={t('pm_load_error')}
          onRetry={loadPM}
        />
      )}
      {pmError && pm && (
        <AsyncStateFeedback
          mode="banner"
          message={t('pm_load_error')}
          onRetry={loadPM}
        />
      )}
      {pm && (
        <>
          <Card
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
          >
            <Card.Content>
              <Text variant="headlineSmall" style={styles.pmName}>
                {pm.name}
              </Text>
              <Text variant="titleMedium" style={styles.title}>
                {pm.title}
              </Text>
              {pm.customId ? (
                <Text
                  variant="bodySmall"
                  style={[
                    styles.identifier,
                    { color: theme.colors.onSurfaceVariant }
                  ]}
                >
                  {pm.customId}
                </Text>
              ) : null}
              <Chip
                compact
                icon={meterBased ? 'speedometer' : 'calendar-month'}
                style={[
                  styles.triggerChip,
                  { backgroundColor: theme.colors.primaryContainer }
                ]}
                textStyle={{ color: theme.colors.onPrimaryContainer }}
              >
                {t(meterBased ? 'pm_meter_based' : 'pm_calendar_based')}
              </Chip>
              <Divider style={styles.divider} />
              <Info label={t('priority')} value={t(pm.priority)} />
              <Info label={t('asset_name')} value={pm.asset?.name || '—'} />
              <Info
                label={t('location_name')}
                value={pm.location?.name || '—'}
              />
              <Info
                label={t('pm_trigger_type')}
                value={t(meterBased ? 'pm_meter_based' : 'pm_calendar_based')}
              />
              <Info label={t('pm_schedule')} value={scheduleLabel} />
              {meterBased ? (
                <>
                  <Info
                    label={t('pm_next_threshold')}
                    value={
                      pm.schedule.nextMeterValue == null
                        ? '—'
                        : `${pm.schedule.nextMeterValue} ${
                            pm.schedule.meterUnit ?? ''
                          }`.trim()
                    }
                  />
                  {pm.schedule.meterEndValue != null && (
                    <Info
                      label={t('pm_end_reading')}
                      value={`${pm.schedule.meterEndValue} ${
                        pm.schedule.meterUnit ?? ''
                      }`.trim()}
                    />
                  )}
                </>
              ) : (
                <>
                  <Info
                    label={t('starts_on')}
                    value={
                      pm.schedule?.startsOn
                        ? getFormattedDate(pm.schedule.startsOn, true)
                        : '—'
                    }
                  />
                  {pm.schedule?.endsOn && (
                    <Info
                      label={t('ends_on')}
                      value={getFormattedDate(pm.schedule.endsOn, true)}
                    />
                  )}
                  <Info
                    label={t('pm_next_occurrence')}
                    value={
                      pm.nextWorkOrderDate
                        ? getFormattedDate(pm.nextWorkOrderDate, true)
                        : t('pm_no_next_occurrence')
                    }
                  />
                </>
              )}
              {pm.schedule?.planConfiguration?.mode === 'STRATEGY' &&
                pm.schedule.planConfiguration.packages?.map((item) => (
                  <Info
                    key={item.code}
                    label={item.name || item.code}
                    value={t('pm_every_base_cycles_mobile', {
                      count: item.everyBaseCycles
                    })}
                  />
                ))}
              {pm.schedule?.planConfiguration?.mode === 'MULTI_COUNTER' && (
                <>
                  <Info
                    label={t('pm_multi_counter_rule_label')}
                    value={
                      pm.schedule.planConfiguration.combination
                        ? t(
                            pm.schedule.planConfiguration.combination === 'AND'
                              ? 'pm_all_meter_cycles_due'
                              : 'pm_any_meter_cycle_due'
                          )
                        : '—'
                    }
                  />
                  {pm.schedule.planConfiguration.cycles?.map((cycle) => (
                    <Info
                      key={cycle.code}
                      label={cycle.name || cycle.code}
                      value={`${cycle.interval} · ${t('pm_meter')} #${
                        cycle.meterId ?? '—'
                      }`}
                    />
                  ))}
                </>
              )}
              {pm.description ? (
                <Text variant="bodyMedium" style={styles.description}>
                  {pm.description}
                </Text>
              ) : null}
            </Card.Content>
          </Card>

          <Text variant="titleLarge" style={styles.sectionTitle}>
            {t('pm_call_register')}
          </Text>
          {callsError && (
            <AsyncStateFeedback
              mode="banner"
              message={t('pm_call_history_load_error')}
              onRetry={retryCalls}
            />
          )}
          {calls.map((call) => (
            <Card
              key={call.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant
                }
              ]}
            >
              <Card.Content>
                <Text variant="titleSmall">
                  {call.dueDate
                    ? `${t('pm_call_due_date')}: ${getFormattedDate(
                        call.rescheduledFor || call.dueDate
                      )}`
                    : `${t('pm_next_threshold')}: ${call.dueValue ?? '—'} ${
                        call.unit ?? ''
                      }`.trim()}
                </Text>
                <Chip
                  compact
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor:
                        call.status === 'DUE'
                          ? theme.colors.errorContainer
                          : call.status === 'GENERATED' ||
                            call.status === 'COMPLETED'
                          ? theme.colors.success
                          : theme.colors.surfaceVariant
                    }
                  ]}
                  textStyle={{
                    color:
                      call.status === 'DUE'
                        ? theme.colors.onErrorContainer
                        : call.status === 'GENERATED' ||
                          call.status === 'COMPLETED'
                        ? theme.colors.onSuccess
                        : theme.colors.onSurfaceVariant
                  }}
                >
                  {t(`pm_call_status_${call.status.toLowerCase()}`)}
                </Chip>
                {call.readingValue != null && (
                  <Text variant="bodySmall">
                    {t('reading')}: {call.readingValue} {call.unit ?? ''}
                  </Text>
                )}
                {!!call.triggeredCycleCodes?.length && (
                  <Text variant="bodySmall">
                    {t('pm_triggered_cycles')}:{' '}
                    {call.triggeredCycleCodes.join(', ')}
                  </Text>
                )}
                {call.rescheduleHistory?.map((event) => (
                  <Text
                    key={`${call.id}-${event.createdAt}`}
                    variant="bodySmall"
                    style={[
                      styles.muted,
                      { color: theme.colors.onSurfaceVariant }
                    ]}
                  >
                    {t('pm_call_reschedule_audit', {
                      from: getFormattedDate(event.previousDueDate),
                      to: getFormattedDate(event.rescheduledFor),
                      actor: event.actorName,
                      reason: event.reason
                    })}
                  </Text>
                ))}
                {call.workOrder && (
                  <Button
                    compact
                    accessibilityHint={t('pm_open_related_work_order_hint')}
                    onPress={() =>
                      navigation.push('WODetails', { id: call.workOrder.id })
                    }
                  >
                    {`${
                      call.workOrder.customId
                        ? `${call.workOrder.customId} · `
                        : ''
                    }${call.workOrder.title}`}
                  </Button>
                )}
              </Card.Content>
            </Card>
          ))}
          {!callsLoading && !callsError && calls.length === 0 && (
            <Text
              style={[styles.muted, { color: theme.colors.onSurfaceVariant }]}
            >
              {t('pm_empty_calls')}
            </Text>
          )}
          {callsLoading && (
            <View
              style={styles.loadingState}
              accessibilityRole="progressbar"
              accessibilityLabel={t('pm_calls_loading')}
            >
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {t('pm_calls_loading')}
              </Text>
            </View>
          )}
          {!lastCallPage && !callsLoading && !callsError && (
            <Button onPress={() => loadCalls(callPage + 1, true)}>
              {t('load_more')}
            </Button>
          )}

          <Text variant="titleLarge" style={styles.sectionTitle}>
            {t('recent_work_orders')}
          </Text>
          {workOrdersError && (
            <AsyncStateFeedback
              mode="banner"
              message={t('pm_work_order_history_load_error')}
              onRetry={retryWorkOrders}
            />
          )}
          {workOrders.map((workOrder) => (
            <Card
              key={workOrder.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant
                }
              ]}
              onPress={() => navigation.push('WODetails', { id: workOrder.id })}
              accessibilityRole="button"
              accessibilityLabel={[
                workOrder.customId,
                workOrder.title,
                t(workOrder.status),
                workOrder.dueDate
                  ? getFormattedDate(workOrder.dueDate)
                  : undefined
              ]
                .filter(Boolean)
                .join(', ')}
              accessibilityHint={t('pm_open_related_work_order_hint')}
            >
              <Card.Content>
                <Text variant="titleSmall">{`${
                  workOrder.customId ? `${workOrder.customId} · ` : ''
                }${workOrder.title}`}</Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.muted,
                    { color: theme.colors.onSurfaceVariant }
                  ]}
                >
                  {t(workOrder.status)}
                  {workOrder.dueDate
                    ? ` · ${getFormattedDate(workOrder.dueDate)}`
                    : ''}
                </Text>
              </Card.Content>
            </Card>
          ))}
          {!workOrdersLoading &&
            !workOrdersError &&
            workOrders.length === 0 && (
              <Text
                style={[styles.muted, { color: theme.colors.onSurfaceVariant }]}
              >
                {t('no_recent_work_orders')}
              </Text>
            )}
          {workOrdersLoading && (
            <View
              style={styles.loadingState}
              accessibilityRole="progressbar"
              accessibilityLabel={t('pm_work_orders_loading')}
            >
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {t('pm_work_orders_loading')}
              </Text>
            </View>
          )}
          {!lastWorkOrderPage && !workOrdersLoading && !workOrdersError && (
            <Button onPress={() => loadWorkOrders(workOrderPage + 1, true)}>
              {t('load_more')}
            </Button>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.infoRow,
        { borderBottomColor: theme.colors.outlineVariant }
      ]}
    >
      <Text
        variant="bodySmall"
        style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}
      >
        {label}
      </Text>
      <Text variant="bodyMedium" style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120 },
  card: {
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    elevation: 1
  },
  muted: {},
  pmName: { fontWeight: '700' },
  title: { marginTop: 4 },
  identifier: { marginTop: 4 },
  triggerChip: { alignSelf: 'flex-start', marginTop: 12 },
  statusChip: { alignSelf: 'flex-start', marginTop: 8, marginBottom: 4 },
  description: { marginTop: 12 },
  divider: { marginVertical: 10 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  infoLabel: { flex: 0.9 },
  infoValue: { flex: 1.1, textAlign: 'right', fontWeight: '500' },
  sectionTitle: { marginTop: 18, marginBottom: 10, fontWeight: '700' },
  message: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 12 },
  loadingState: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  }
});
