import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { Page } from '../../models/page';
import PreventiveMaintenance from '../../models/preventiveMaintenance';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { RootStackScreenProps } from '../../types';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { useContext } from 'react';
import { beginRequest, isCurrentRequest } from '../../utils/requestSequence';

const PAGE_SIZE = 10;

export default function PreventiveMaintenancesScreen({
  navigation
}: RootStackScreenProps<'PreventiveMaintenances'>) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { hasViewPermission } = useAuth();
  const canView = hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES);
  const [items, setItems] = useState<PreventiveMaintenance[]>([]);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [failedRequest, setFailedRequest] = useState<{
    pageNum: number;
    append: boolean;
  } | null>(null);
  const pageRequestInProgress = useRef(false);
  const pageRequestSequence = useRef(0);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!canView || (append && pageRequestInProgress.current)) return;
      const requestId = beginRequest(pageRequestSequence);
      pageRequestInProgress.current = true;
      setError(false);
      setFailedRequest(null);
      if (append) {
        setLoading(true);
        setRefreshing(false);
      } else {
        setLoading(false);
        setRefreshing(true);
      }
      try {
        const result = await api.post<Page<PreventiveMaintenance>>(
          'preventive-maintenances/search',
          { filterFields: [], direction: 'DESC', pageNum, pageSize: PAGE_SIZE }
        );
        if (!isCurrentRequest(requestId, pageRequestSequence)) return;
        setItems((current) =>
          append
            ? [
                ...current,
                ...result.content.filter(
                  (pm) => !current.some((item) => item.id === pm.id)
                )
              ]
            : result.content
        );
        setPage(result.number);
        setLastPage(result.last);
      } catch (loadError) {
        logSafeError('Could not load preventive maintenances:', loadError);
        if (!isCurrentRequest(requestId, pageRequestSequence)) return;
        setError(true);
        setFailedRequest({ pageNum, append });
      } finally {
        if (isCurrentRequest(requestId, pageRequestSequence)) {
          pageRequestInProgress.current = false;
          setLoading(false);
          setRefreshing(false);
          setHasLoaded(true);
        }
      }
    },
    [canView]
  );

  const retryPage = () => {
    const request = failedRequest ?? { pageNum: 0, append: false };
    void loadPage(request.pageNum, request.append);
  };

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  const renderItem = ({ item }: { item: PreventiveMaintenance }) => {
    const meterBased = item.schedule?.triggerType === 'METER';
    const nextScheduleValue = meterBased
      ? item.schedule?.nextMeterValue != null
        ? `${item.schedule.nextMeterValue} ${
            item.schedule.meterUnit ?? ''
          }`.trim()
        : t('pm_no_next_meter_threshold')
      : item.nextWorkOrderDate
      ? getFormattedDate(item.nextWorkOrderDate, true)
      : t('pm_no_next_occurrence');
    const triggerLabel = t(meterBased ? 'pm_meter_based' : 'pm_calendar_based');
    const scheduleLabel = t(
      meterBased ? 'pm_next_threshold' : 'pm_next_occurrence'
    );

    return (
      <Card
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant
          }
        ]}
        onPress={() =>
          navigation.push('PreventiveMaintenanceDetails', {
            id: item.id,
            pmProp: item
          })
        }
        accessibilityRole="button"
        accessibilityLabel={[
          item.name,
          item.customId,
          item.title,
          triggerLabel,
          `${scheduleLabel}: ${nextScheduleValue}`,
          item.asset?.name
        ]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint={t('pm_open_details_hint')}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeading}>
            <View style={styles.nameBlock}>
              <Text variant="titleMedium" numberOfLines={2}>
                {item.name}
              </Text>
              {item.customId ? (
                <Text
                  variant="labelSmall"
                  style={[
                    styles.muted,
                    { color: theme.colors.onSurfaceVariant }
                  ]}
                >
                  {item.customId}
                </Text>
              ) : null}
            </View>
            <Chip
              compact
              icon={meterBased ? 'speedometer' : 'calendar-month'}
              style={[
                styles.triggerChip,
                { backgroundColor: theme.colors.primaryContainer }
              ]}
              textStyle={{ color: theme.colors.onPrimaryContainer }}
            >
              {triggerLabel}
            </Chip>
          </View>
          <Text variant="bodyMedium" style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <View
            style={[
              styles.nextBox,
              { backgroundColor: theme.colors.surfaceVariant }
            ]}
          >
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {scheduleLabel}
            </Text>
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onSurface }}
            >
              {nextScheduleValue}
            </Text>
          </View>
          {item.asset?.name ? (
            <Text
              variant="bodySmall"
              style={[styles.asset, { color: theme.colors.onSurfaceVariant }]}
            >
              {item.asset.name}
            </Text>
          ) : null}
        </Card.Content>
      </Card>
    );
  };

  if (!canView) {
    return (
      <View style={styles.message}>
        <Text>{t('no_access_preventive_maintenance')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={items.length ? styles.list : styles.emptyList}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      onEndReached={() => {
        if (!loading && !refreshing && !lastPage) void loadPage(page + 1, true);
      }}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadPage(0, false)}
        />
      }
      ListHeaderComponent={
        <>
          <Text
            variant="bodyMedium"
            style={[
              styles.description,
              { color: theme.colors.onSurfaceVariant }
            ]}
          >
            {t('pm_mobile_read_only_description')}
          </Text>
          {error && items.length > 0 && (
            <View style={styles.message}>
              <Text>{t('pm_load_error')}</Text>
              <Button onPress={retryPage}>{t('retry')}</Button>
            </View>
          )}
        </>
      }
      ListFooterComponent={
        loading ? (
          <View
            style={styles.footer}
            accessibilityRole="progressbar"
            accessibilityLabel={t('loading')}
          >
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        error ? (
          items.length ? null : (
            <View style={styles.message}>
              <Text>{t('pm_load_error')}</Text>
              <Button onPress={retryPage}>{t('retry')}</Button>
            </View>
          )
        ) : refreshing || !hasLoaded ? (
          <View
            style={styles.message}
            accessibilityRole="progressbar"
            accessibilityLabel={t('please_wait')}
          >
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {t('please_wait')}
            </Text>
          </View>
        ) : (
          <Text style={styles.message}>{t('pm_empty')}</Text>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 110 },
  emptyList: { flexGrow: 1, padding: 16, paddingBottom: 110 },
  card: {
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    elevation: 1
  },
  cardContent: { gap: 8 },
  cardHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8
  },
  nameBlock: { flex: 1, minWidth: 0, paddingTop: 3 },
  triggerChip: { height: 32, marginTop: 1 },
  title: { marginTop: 1 },
  muted: { marginTop: 4 },
  nextBox: {
    borderRadius: qpmLayoutTokens.radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 2
  },
  asset: {},
  description: { marginBottom: 12, lineHeight: 20 },
  message: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8
  },
  footer: { padding: 16 }
});
import { logSafeError } from '../../utils/safeErrorLog';
