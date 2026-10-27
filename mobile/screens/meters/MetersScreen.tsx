import { logSafeError } from '../../utils/safeErrorLog';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View
} from 'react-native';
import { useDispatch, useSelector } from '../../store';
import * as React from 'react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { getMeters, getMoreMeters } from '../../slices/meter';
import { FilterField, SearchCriteria } from '../../models/page';
import {
  Button,
  Card,
  Searchbar,
  Text,
  Avatar,
  Chip
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Meter from '../../models/meter';
import { canAddReading, onSearchQueryChange } from '../../utils/overall';
import Tag from '../../components/Tag';
import { RootStackScreenProps } from '../../types';
import { useDebouncedEffect } from '../../hooks/useDebouncedEffect';
import { IconWithLabel } from '../../components/IconWithLabel';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import { PlanFeature } from '../../models/subscriptionPlan';

export default function MetersScreen({
  navigation
}: RootStackScreenProps<'Meters'>) {
  const { t } = useTranslation();
  const [startedSearch, setStartedSearch] = useState<boolean>(false);
  const { meters, listLoading, currentPageNum, lastPage } = useSelector(
    (state) => state.meters
  );
  const theme = useAppTheme();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [hasLoadedList, setHasLoadedList] = useState(false);
  const nextPageRequestInProgress = useRef(false);
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { hasViewPermission, hasFeature } = useAuth();
  const hasMeterFeature = hasFeature(PlanFeature.METER);
  const canView = hasViewPermission(PermissionEntity.METERS) && hasMeterFeature;
  const defaultFilterFields: FilterField[] = [];
  const getCriteriaFromFilterFields = (filterFields: FilterField[]) => {
    const initialCriteria: SearchCriteria = {
      filterFields: defaultFilterFields,
      pageSize: 10,
      pageNum: 0,
      direction: 'DESC'
    };
    let newFilterFields = [...initialCriteria.filterFields];
    filterFields.forEach(
      (filterField) =>
        (newFilterFields = newFilterFields.filter(
          (ff) => ff.field != filterField.field
        ))
    );
    return {
      ...initialCriteria,
      filterFields: [...newFilterFields, ...filterFields]
    };
  };
  const [criteria, setCriteria] = useState<SearchCriteria>(
    getCriteriaFromFilterFields([])
  );
  const loadMeters = useCallback(async () => {
    if (!canView) return;
    setLoadError(false);
    setLoadMoreError(false);
    try {
      await dispatch(
        getMeters({ ...criteria, pageSize: 10, pageNum: 0, direction: 'DESC' })
      );
    } catch (error) {
      logSafeError('Could not load meters:', error);
      setLoadError(true);
    } finally {
      setHasLoadedList(true);
    }
  }, [canView, criteria, dispatch]);

  useEffect(() => {
    loadMeters();
  }, [loadMeters]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMeters();
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async (retry = false) => {
    if (
      nextPageRequestInProgress.current ||
      listLoading ||
      lastPage ||
      (loadMoreError && !retry)
    )
      return;
    nextPageRequestInProgress.current = true;
    setLoadMoreError(false);
    try {
      await dispatch(getMoreMeters(criteria, currentPageNum + 1));
    } catch (error) {
      logSafeError('Could not load more meters:', error);
      setLoadMoreError(true);
    } finally {
      nextPageRequestInProgress.current = false;
    }
  };

  const onQueryChange = (query) => {
    onSearchQueryChange<Meter>(query, criteria, setCriteria, setSearchQuery, [
      'name',
      'unit',
      'meterCategory.name',
      'customFieldValues.value'
    ]);
  };
  useDebouncedEffect(
    () => {
      if (startedSearch) onQueryChange(searchQuery);
    },
    [searchQuery],
    1000
  );
  if (!hasMeterFeature) {
    return (
      <AsyncStateFeedback
        mode="permissionDenied"
        message={t('meter_feature_unavailable')}
      />
    );
  }
  return (
    <View
      style={{ ...styles.container, backgroundColor: theme.colors.background }}
    >
      <Searchbar
        placeholder={t('search')}
        accessibilityLabel={t('search')}
        onFocus={() => setStartedSearch(true)}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.search, { backgroundColor: theme.colors.surface }]}
      />
      <FlatList<Meter>
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={meters.content}
        ListHeaderComponent={
          loadError && meters.content.length > 0 ? (
            <AsyncStateFeedback
              mode="banner"
              message={t('meter_list_load_error')}
              onRetry={loadMeters}
            />
          ) : null
        }
        keyExtractor={(meter) => String(meter.id)}
        renderItem={({ item: meter }) => (
          <Card
            mode="outlined"
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
            onPress={() =>
              navigation.push('MeterDetails', {
                id: meter.id,
                meterProp: meter,
                onNewReading: () => {
                  dispatch(getMeters(criteria));
                }
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`${meter.name}, ${meter.asset?.name ?? ''}`}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardRow}>
                {meter.image ? (
                  <Avatar.Image size={50} source={{ uri: meter.image.url }} />
                ) : (
                  <Avatar.Icon
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                    color={theme.colors.onPrimaryContainer}
                    icon="gauge"
                    size={50}
                  />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.cardHeader}>
                    <Text
                      variant="titleMedium"
                      style={styles.cardTitle}
                      numberOfLines={2}
                    >
                      {meter.name}
                    </Text>
                    <Chip
                      compact
                      style={[
                        styles.unitChip,
                        { backgroundColor: theme.colors.surfaceVariant }
                      ]}
                      textStyle={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {meter.unit || t('unit_of_measurement')}
                    </Chip>
                  </View>
                  <View style={styles.assetLine}>
                    {meter.asset && (
                      <IconWithLabel
                        label={meter.asset.name}
                        icon="package-variant-closed"
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                    {meter.location && (
                      <IconWithLabel
                        label={meter.location.name}
                        icon="map-marker-outline"
                        color={theme.colors.onSurfaceVariant}
                      />
                    )}
                  </View>
                  <View style={styles.dueRow}>
                    <View style={styles.readingDates}>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {t('last_reading')}:{' '}
                        {meter.lastReading
                          ? getFormattedDate(meter.lastReading)
                          : '—'}
                      </Text>
                      {meter.nextReading ? (
                        <Text
                          variant="bodySmall"
                          style={{
                            color: canAddReading(meter)
                              ? theme.colors.error
                              : theme.colors.onSurfaceVariant
                          }}
                        >
                          {t('next_reading_due')}:{' '}
                          {getFormattedDate(meter.nextReading)}
                        </Text>
                      ) : null}
                    </View>
                    {!meter.lastReading ? (
                      <Tag
                        text={t('meter_no_readings')}
                        color={theme.colors.onSurfaceVariant}
                        backgroundColor={theme.colors.surfaceVariant}
                      />
                    ) : meter.nextReading && canAddReading(meter) ? (
                      <Tag
                        text={t('past_due')}
                        color={theme.colors.onError}
                        backgroundColor={theme.colors.error}
                      />
                    ) : null}
                  </View>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          loadError ? (
            <View style={styles.emptyCard} accessibilityRole="alert">
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface }}
              >
                {t('meter_list_load_error')}
              </Text>
              <Button onPress={loadMeters}>{t('retry')}</Button>
            </View>
          ) : listLoading || (canView && !hasLoadedList) ? (
            <View
              style={styles.loadingState}
              accessibilityRole="progressbar"
              accessibilityLabel={t('loading')}
            >
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {t('loading')}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant
                }
              ]}
            >
              <Text variant="titleLarge">{t('no_element_match_criteria')}</Text>
            </View>
          )
        }
        ListFooterComponent={
          listLoading && !refreshing && meters.content.length > 0 ? (
            <ActivityIndicator
              color={theme.colors.primary}
              style={styles.loadingFooter}
            />
          ) : loadMoreError ? (
            <AsyncStateFeedback
              mode="banner"
              message={t('meter_list_load_error')}
              onRetry={() => loadMore(true)}
            />
          ) : null
        }
        onEndReached={() => {
          loadMore();
        }}
        onEndReachedThreshold={0.35}
        initialNumToRender={8}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: qpmLayoutTokens.radius.control
  },
  list: {
    width: '100%',
    flex: 1
  },
  listContent: { paddingBottom: 100, flexGrow: 1 },
  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingFooter: { paddingVertical: 18 },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    elevation: 1
  },
  cardContent: { paddingVertical: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  cardTitle: {
    fontWeight: '700',
    flex: 1
  },
  unitChip: { height: 30 },
  assetLine: { gap: 4 },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 9
  },
  readingDates: { flex: 1, gap: 3 },
  emptyCard: {
    margin: 16,
    padding: 20,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  }
});
