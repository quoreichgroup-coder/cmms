import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { Page } from '../../models/page';
import PreventiveMaintenance from '../../models/preventiveMaintenance';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { RootStackScreenProps } from '../../types';
import { useAppTheme } from '../../custom-theme';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { useContext } from 'react';

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
  const [error, setError] = useState(false);

  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    if (!canView) return;
    setError(false);
    append ? setLoading(true) : setRefreshing(true);
    try {
      const result = await api.post<Page<PreventiveMaintenance>>(
        'preventive-maintenances/search',
        { filterFields: [], direction: 'DESC', pageNum, pageSize: PAGE_SIZE }
      );
      setItems((current) => append
        ? [...current, ...result.content.filter((pm) => !current.some((item) => item.id === pm.id))]
        : result.content);
      setPage(result.number);
      setLastPage(result.last);
    } catch (loadError) {
      console.warn('Could not load preventive maintenances:', loadError);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canView]);

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  const renderItem = ({ item }: { item: PreventiveMaintenance }) => {
    const meterBased = item.schedule?.triggerType === 'METER';
    const nextOccurrence = meterBased
      ? item.schedule?.nextMeterValue == null
        ? t('pm_no_next_meter_threshold')
        : `${t('pm_next_threshold')}: ${item.schedule.nextMeterValue} ${item.schedule.meterUnit ?? ''}`.trim()
      : item.nextWorkOrderDate
        ? `${t('pm_next_occurrence')}: ${getFormattedDate(item.nextWorkOrderDate, true)}`
        : t('pm_no_next_occurrence');

    return (
      <Card
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        onPress={() => navigation.push('PreventiveMaintenanceDetails', { id: item.id, pmProp: item })}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.title}`}
      >
        <Card.Content>
          <Text variant="titleMedium">{item.name}</Text>
          <Text variant="bodyMedium" style={styles.title}>{item.title}</Text>
          <Text variant="bodySmall" style={styles.muted}>{nextOccurrence}</Text>
          <Text variant="bodySmall" style={styles.muted}>
            {meterBased ? t('pm_meter_based') : t('pm_calendar_based')}
            {item.asset?.name ? ` · ${item.asset.name}` : ''}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  if (!canView) {
    return <View style={styles.message}><Text>{t('no_access_preventive_maintenance')}</Text></View>;
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={items.length ? styles.list : styles.emptyList}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      onEndReached={() => {
        if (!loading && !refreshing && !lastPage) loadPage(page + 1, true);
      }}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPage(0, false)} />}
      ListHeaderComponent={(
        <>
          <Text variant="bodyMedium" style={styles.description}>{t('pm_mobile_read_only_description')}</Text>
          {error && items.length > 0 && (
            <View style={styles.message}>
              <Text>{t('pm_load_error')}</Text>
              <Button onPress={() => loadPage(0, false)}>{t('retry')}</Button>
            </View>
          )}
        </>
      )}
      ListFooterComponent={loading ? <ActivityIndicator style={styles.footer} /> : null}
      ListEmptyComponent={
        error ? (items.length ? null : <View style={styles.message}>
          <Text>{t('pm_load_error')}</Text>
          <Button onPress={() => loadPage(0, false)}>{t('retry')}</Button>
        </View>) : refreshing ? <ActivityIndicator /> : <Text style={styles.message}>{t('pm_empty')}</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 110 },
  emptyList: { flexGrow: 1, padding: 12, paddingBottom: 110 },
  card: { marginBottom: 10 },
  title: { marginTop: 3 },
  muted: { marginTop: 5, opacity: 0.75 },
  description: { marginBottom: 12, opacity: 0.75 },
  message: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  footer: { padding: 16 }
});
