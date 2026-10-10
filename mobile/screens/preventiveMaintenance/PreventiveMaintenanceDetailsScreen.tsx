import React, { useCallback, useContext, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { Page } from '../../models/page';
import PreventiveMaintenance from '../../models/preventiveMaintenance';
import PreventiveMaintenanceCall from '../../models/preventiveMaintenanceCall';
import { WorkOrderMini } from '../../models/workOrder';
import { RootStackScreenProps } from '../../types';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { useAppTheme } from '../../custom-theme';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';

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
  const [pm, setPm] = useState<PreventiveMaintenance | null>(route.params.pmProp ?? null);
  const [pmLoading, setPmLoading] = useState(!route.params.pmProp);
  const [pmError, setPmError] = useState(false);
  const [calls, setCalls] = useState<PreventiveMaintenanceCall[]>([]);
  const [callPage, setCallPage] = useState(0);
  const [lastCallPage, setLastCallPage] = useState(true);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callsError, setCallsError] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrderMini[]>([]);
  const [workOrderPage, setWorkOrderPage] = useState(0);
  const [lastWorkOrderPage, setLastWorkOrderPage] = useState(true);
  const [workOrdersLoading, setWorkOrdersLoading] = useState(false);
  const [workOrdersError, setWorkOrdersError] = useState(false);

  const loadPM = useCallback(async () => {
    if (!canView) return;
    setPmError(false);
    setPmLoading(true);
    try {
      setPm(await api.get<PreventiveMaintenance>(`preventive-maintenances/${id}`));
    } catch (error) {
      console.warn('Could not load preventive maintenance details:', error);
      setPmError(true);
    } finally {
      setPmLoading(false);
    }
  }, [canView, id]);

  const loadCalls = useCallback(async (pageNum: number, append: boolean) => {
    if (!canView) return;
    setCallsError(false);
    setCallsLoading(true);
    try {
      const result = await api.get<Page<PreventiveMaintenanceCall>>(
        `preventive-maintenances/${id}/call-history?page=${pageNum}&size=${PAGE_SIZE}`
      );
      setCalls((current) => append ? [...current, ...result.content] : result.content);
      setCallPage(result.number);
      setLastCallPage(result.last);
    } catch (error) {
      console.warn('Could not load preventive maintenance calls:', error);
      setCallsError(true);
    } finally {
      setCallsLoading(false);
    }
  }, [canView, id]);

  const loadWorkOrders = useCallback(async (pageNum: number, append: boolean) => {
    if (!canView) return;
    setWorkOrdersError(false);
    setWorkOrdersLoading(true);
    try {
      const result = await api.get<Page<WorkOrderMini>>(
        `preventive-maintenances/${id}/work-order-history?page=${pageNum}&size=${PAGE_SIZE}`
      );
      setWorkOrders((current) => append ? [...current, ...result.content] : result.content);
      setWorkOrderPage(result.number);
      setLastWorkOrderPage(result.last);
    } catch (error) {
      console.warn('Could not load preventive maintenance work orders:', error);
      setWorkOrdersError(true);
    } finally {
      setWorkOrdersLoading(false);
    }
  }, [canView, id]);

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

  if (!canView) return <View style={styles.message}><Text>{t('no_access_preventive_maintenance')}</Text></View>;

  const meterBased = pm?.schedule?.triggerType === 'METER';
  const scheduleLabel = meterBased
    ? `${pm.schedule.meterCycleInterval ?? '—'} ${pm.schedule.meterUnit ?? ''} · ${t('pm_reference')}: ${pm.schedule.meterReferenceValue ?? '—'}`.trim()
    : `${t(pm?.schedule?.recurrenceType ?? '')} · ${pm?.schedule?.frequency ?? '—'}`;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={pmLoading && !!pm} onRefresh={onRefresh} />}
    >
      {pmLoading && !pm && <ActivityIndicator style={styles.message} />}
      {pmError && !pm && <View style={styles.message}><Text>{t('pm_load_error')}</Text><Button onPress={loadPM}>{t('retry')}</Button></View>}
      {pm && (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="headlineSmall">{pm.name}</Text>
              <Text variant="titleMedium" style={styles.title}>{pm.title}</Text>
              {pm.customId ? <Text variant="bodySmall" style={styles.muted}>{pm.customId}</Text> : null}
              <Divider style={styles.divider} />
              <Info label={t('priority')} value={t(pm.priority)} />
              <Info label={t('asset_name')} value={pm.asset?.name || '—'} />
              <Info label={t('location_name')} value={pm.location?.name || '—'} />
              <Info label={t('pm_trigger_type')} value={t(meterBased ? 'pm_meter_based' : 'pm_calendar_based')} />
              <Info label={t('pm_schedule')} value={scheduleLabel} />
              {meterBased ? (
                <>
                  <Info label={t('pm_next_threshold')} value={pm.schedule.nextMeterValue == null ? '—' : `${pm.schedule.nextMeterValue} ${pm.schedule.meterUnit ?? ''}`.trim()} />
                  {pm.schedule.meterEndValue != null && <Info label={t('pm_end_reading')} value={`${pm.schedule.meterEndValue} ${pm.schedule.meterUnit ?? ''}`.trim()} />}
                </>
              ) : (
                <>
                  <Info label={t('starts_on')} value={pm.schedule?.startsOn ? getFormattedDate(pm.schedule.startsOn, true) : '—'} />
                  {pm.schedule?.endsOn && <Info label={t('ends_on')} value={getFormattedDate(pm.schedule.endsOn, true)} />}
                  <Info label={t('pm_next_occurrence')} value={pm.nextWorkOrderDate ? getFormattedDate(pm.nextWorkOrderDate, true) : t('pm_no_next_occurrence')} />
                </>
              )}
              {pm.schedule?.planConfiguration?.mode === 'STRATEGY' && pm.schedule.planConfiguration.packages?.map((item) => (
                <Info key={item.code} label={item.name || item.code} value={t('pm_every_base_cycles_mobile', { count: item.everyBaseCycles })} />
              ))}
              {pm.schedule?.planConfiguration?.mode === 'MULTI_COUNTER' && (
                <>
                  <Info label={t('pm_multi_counter_rule_label')} value={pm.schedule.planConfiguration.combination ?? '—'} />
                  {pm.schedule.planConfiguration.cycles?.map((cycle) => <Info key={cycle.code} label={cycle.name || cycle.code} value={`${cycle.interval} · ${t('pm_meter')} #${cycle.meterId ?? '—'}`} />)}
                </>
              )}
              {pm.description ? <Text variant="bodyMedium" style={styles.description}>{pm.description}</Text> : null}
            </Card.Content>
          </Card>

          <Text variant="titleLarge" style={styles.sectionTitle}>{t('pm_call_register')}</Text>
          {callsError && <InlineError message={t('pm_call_history_load_error')} onRetry={() => loadCalls(0, false)} />}
          {calls.map((call) => (
            <Card key={call.id} style={styles.card}>
              <Card.Content>
                <Text variant="titleSmall">
                  {call.dueDate
                    ? `${t('pm_call_due_date')}: ${getFormattedDate(call.rescheduledFor || call.dueDate)}`
                    : `${t('pm_next_threshold')}: ${call.dueValue ?? '—'} ${call.unit ?? ''}`.trim()}
                </Text>
                <Text variant="bodySmall" style={styles.muted}>{t(`pm_call_status_${call.status.toLowerCase()}`)}</Text>
                {call.readingValue != null && <Text variant="bodySmall">{t('reading')}: {call.readingValue} {call.unit ?? ''}</Text>}
                {!!call.triggeredCycleCodes?.length && <Text variant="bodySmall">{t('pm_triggered_cycles')}: {call.triggeredCycleCodes.join(', ')}</Text>}
                {call.rescheduleHistory?.map((event) => (
                  <Text key={`${call.id}-${event.createdAt}`} variant="bodySmall" style={styles.muted}>
                    {t('pm_call_reschedule_audit', { from: getFormattedDate(event.previousDueDate), to: getFormattedDate(event.rescheduledFor), actor: event.actorName, reason: event.reason })}
                  </Text>
                ))}
                {call.workOrder && (
                  <Button compact onPress={() => navigation.push('WODetails', { id: call.workOrder.id })}>
                    {`${call.workOrder.customId ? `${call.workOrder.customId} · ` : ''}${call.workOrder.title}`}
                  </Button>
                )}
              </Card.Content>
            </Card>
          ))}
          {!callsLoading && !callsError && calls.length === 0 && <Text style={styles.muted}>{t('pm_empty_calls')}</Text>}
          {callsLoading && <ActivityIndicator style={styles.footer} />}
          {!lastCallPage && !callsLoading && <Button onPress={() => loadCalls(callPage + 1, true)}>{t('load_more')}</Button>}

          <Text variant="titleLarge" style={styles.sectionTitle}>{t('recent_work_orders')}</Text>
          {workOrdersError && <InlineError message={t('pm_work_order_history_load_error')} onRetry={() => loadWorkOrders(0, false)} />}
          {workOrders.map((workOrder) => (
            <Card key={workOrder.id} style={styles.card} onPress={() => navigation.push('WODetails', { id: workOrder.id })}>
              <Card.Content>
                <Text variant="titleSmall">{`${workOrder.customId ? `${workOrder.customId} · ` : ''}${workOrder.title}`}</Text>
                <Text variant="bodySmall" style={styles.muted}>{t(workOrder.status)}{workOrder.dueDate ? ` · ${getFormattedDate(workOrder.dueDate)}` : ''}</Text>
              </Card.Content>
            </Card>
          ))}
          {!workOrdersLoading && !workOrdersError && workOrders.length === 0 && <Text style={styles.muted}>{t('no_recent_work_orders')}</Text>}
          {workOrdersLoading && <ActivityIndicator style={styles.footer} />}
          {!lastWorkOrderPage && !workOrdersLoading && <Button onPress={() => loadWorkOrders(workOrderPage + 1, true)}>{t('load_more')}</Button>}
        </>
      )}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <Text variant="bodyMedium" style={styles.info}>{label}: {value}</Text>;
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return <View style={styles.error}><Text>{message}</Text><Button compact onPress={onRetry}>{t('retry')}</Button></View>;
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 120 },
  card: { marginBottom: 10 },
  title: { marginTop: 4 },
  muted: { opacity: 0.7, marginTop: 4 },
  description: { marginTop: 12 },
  divider: { marginVertical: 10 },
  info: { marginVertical: 3 },
  sectionTitle: { marginTop: 14, marginBottom: 8 },
  message: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  error: { padding: 12, alignItems: 'center' },
  footer: { padding: 12 }
});
