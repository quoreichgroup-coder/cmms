import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch, useSelector } from '../../store';
import * as React from 'react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { getMoreWorkOrders, getWorkOrders } from '../../slices/workOrder';
import { FilterField, SearchCriteria } from '../../models/page';
import {
  Button,
  IconButton,
  Searchbar,
  Text,
  Avatar
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import WorkOrder from '../../models/workOrder';
import {
  getPriorityColor,
  getStatusColor,
  getStatusForegroundColor,
  onSearchQueryChange
} from '../../utils/overall';
import { RootTabScreenProps } from '../../types';
import Tag from '../../components/Tag';
import { useDebouncedEffect } from '../../hooks/useDebouncedEffect';
import _ from 'lodash';
import EnumFilter from './components/EnumFilter';
import { dayDiff } from '../../utils/dates';
import { IconWithLabel } from '../../components/IconWithLabel';
import QuickFilter from './components/QuickFilter';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import { getUserInitials } from '../../utils/displayers';
import { UserMiniDTO } from '../../models/user';

export default function WorkOrdersScreen({
  navigation,
  route
}: RootTabScreenProps<'WorkOrders'>) {
  const { t } = useTranslation();
  const [startedSearch, setStartedSearch] = useState<boolean>(false);
  const { workOrders, loadingGet, currentPageNum, lastPage } = useSelector(
    (state) => state.workOrders
  );
  const theme = useAppTheme();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedFirstPage, setHasLoadedFirstPage] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const nextPageRequestInProgress = useRef(false);
  const firstPageRequestSequence = useRef(0);
  const fromHomeInit = useRef<boolean>(false);
  const { getFormattedDate, getUserNameById } = useContext(
    CompanySettingsContext
  );
  const { user, hasViewOtherPermission } = useAuth();
  const defaultFilterFields: FilterField[] = [
    {
      field: 'priority',
      operation: 'in',
      values: ['NONE', 'LOW', 'MEDIUM', 'HIGH'],
      value: '',
      enumName: 'PRIORITY'
    },
    {
      field: 'status',
      operation: 'in',
      values: ['OPEN', 'IN_PROGRESS', 'ON_HOLD'],
      value: '',
      enumName: 'STATUS'
    },
    {
      field: 'archived',
      operation: 'eq',
      value: false
    }
  ];
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
  const fetchFirstPage = useCallback(async () => {
    const requestSequence = ++firstPageRequestSequence.current;
    setLoadError(false);
    setLoadMoreError(false);
    try {
      await dispatch(
        getWorkOrders({
          ...criteria,
          pageSize: 10,
          pageNum: 0,
          direction: 'DESC'
        })
      );
    } catch (_error) {
      if (requestSequence === firstPageRequestSequence.current) {
        setLoadError(true);
      }
    } finally {
      if (requestSequence === firstPageRequestSequence.current) {
        setHasLoadedFirstPage(true);
      }
    }
  }, [criteria, dispatch]);

  const fetchNextPage = useCallback(
    async (retry = false) => {
      const requestSequence = firstPageRequestSequence.current;
      if (
        nextPageRequestInProgress.current ||
        loadingGet ||
        lastPage ||
        (loadMoreError && !retry)
      )
        return;
      nextPageRequestInProgress.current = true;
      setLoadMoreError(false);
      try {
        await dispatch(getMoreWorkOrders(criteria, currentPageNum + 1));
      } catch (_error) {
        if (requestSequence === firstPageRequestSequence.current) {
          setLoadMoreError(true);
        }
      } finally {
        nextPageRequestInProgress.current = false;
      }
    },
    [criteria, currentPageNum, dispatch, lastPage, loadMoreError, loadingGet]
  );

  useEffect(() => {
    if (
      route.params?.fromHome &&
      !fromHomeInit.current &&
      route.params.filterFields?.length
    ) {
      fromHomeInit.current = true;
      return;
    }
    void fetchFirstPage();
    fromHomeInit.current = true;
  }, [criteria, fetchFirstPage]);

  useEffect(() => {
    const filterFields = route.params?.filterFields ?? [];
    if (filterFields.length)
      setCriteria(getCriteriaFromFilterFields(filterFields));
  }, [route]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchFirstPage();
    } catch (_error) {
      // The API error handler displays the failure message globally.
    } finally {
      setRefreshing(false);
    }
  };
  const onFilterChange = (newFilters: FilterField[]) => {
    const newCriteria = { ...criteria };
    newCriteria.filterFields = newFilters;
    setCriteria(newCriteria);
  };
  const onResetFilters = () => {
    setCriteria(getCriteriaFromFilterFields([]));
  };
  const hasActiveFilters = !_.isEqual(
    criteria.filterFields,
    defaultFilterFields
  );
  const hasActiveSearch = searchQuery.trim().length > 0;
  const clearSearchAndFilters = () => {
    setStartedSearch(false);
    setSearchQuery('');
    setCriteria(getCriteriaFromFilterFields([]));
  };

  const onQueryChange = (query) => {
    onSearchQueryChange<WorkOrder>(
      query,
      criteria,
      setCriteria,
      setSearchQuery,
      [
        'title',
        'description',
        'feedback',
        'customId',
        'customFieldValues.value'
      ]
    );
  };
  useDebouncedEffect(
    () => {
      if (startedSearch) onQueryChange(searchQuery);
    },
    [searchQuery],
    1000
  );
  return (
    <View
      style={{ ...styles.container, backgroundColor: theme.colors.background }}
    >
      <>
        <Searchbar
          placeholder={t('search')}
          onFocus={() => setStartedSearch(true)}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[
            styles.searchbar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant
            }
          ]}
        />
        <FlatList<WorkOrder>
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={workOrders.content}
          keyExtractor={(workOrder) => String(workOrder.id)}
          renderItem={({ item: workOrder }) => {
            // Combine primaryUser and assignedTo without duplicates
            const allUsers: UserMiniDTO[] = [];
            const userIds = new Set<number>();

            if (workOrder.primaryUser) {
              allUsers.push(workOrder.primaryUser);
              userIds.add(workOrder.primaryUser.id);
            }

            if (workOrder.assignedTo?.length) {
              workOrder.assignedTo.forEach((assignedUser) => {
                if (!userIds.has(assignedUser.id)) {
                  allUsers.push(assignedUser);
                  userIds.add(assignedUser.id);
                }
              });
            }

            const dueDate = workOrder.dueDate
              ? new Date(workOrder.dueDate)
              : undefined;
            const isPastDue = Boolean(dueDate && new Date() > dueDate);
            const hasHighlightedDueDate = Boolean(
              dueDate &&
                workOrder.status !== 'COMPLETE' &&
                (isPastDue || dayDiff(dueDate, new Date()) <= 2)
            );

            return (
              <TouchableOpacity
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={[
                  workOrder.customId || `#${workOrder.id}`,
                  workOrder.title,
                  t(workOrder.status),
                  workOrder.asset?.name,
                  workOrder.location?.name,
                  workOrder.priority && workOrder.priority !== 'NONE'
                    ? `${t('priority')}: ${t(workOrder.priority)}`
                    : undefined,
                  workOrder.dueDate
                    ? `${t('due_date')}: ${getFormattedDate(workOrder.dueDate)}`
                    : undefined,
                  hasHighlightedDueDate
                    ? t(isPastDue ? 'past_due' : 'due_soon')
                    : undefined,
                  allUsers
                    .map((assignedUser) => getUserNameById(assignedUser.id))
                    .join(', ')
                ]
                  .filter(Boolean)
                  .join(', ')}
                accessibilityHint={t('related_work_order_open_hint')}
                onPress={() =>
                  navigation.push('WODetails', {
                    id: workOrder.id,
                    workOrderProp: workOrder
                  })
                }
              >
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                      borderLeftColor: getStatusColor(workOrder.status, theme)
                    }
                  ]}
                >
                  <View style={styles.cardContent}>
                    {workOrder.image ? (
                      <Avatar.Image
                        size={50}
                        source={{ uri: workOrder.image.url }}
                      />
                    ) : (
                      <Avatar.Icon
                        style={{
                          backgroundColor: theme.colors.primaryContainer
                        }}
                        color={theme.colors.onPrimaryContainer}
                        icon="clipboard-text-outline"
                        size={50}
                      />
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                          <Text
                            variant="titleMedium"
                            style={styles.cardTitle}
                            numberOfLines={2}
                          >
                            {workOrder.title}
                          </Text>
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >{`#${workOrder.customId || workOrder.id}`}</Text>
                        </View>
                        <Tag
                          text={t(workOrder.status)}
                          color={getStatusForegroundColor(
                            workOrder.status,
                            theme
                          )}
                          backgroundColor={getStatusColor(
                            workOrder.status,
                            theme
                          )}
                        />
                      </View>
                      <View style={styles.cardBody}>
                        {workOrder.asset && (
                          <IconWithLabel
                            label={workOrder.asset.name}
                            icon="package-variant-closed"
                            color={theme.colors.onSurfaceVariant}
                          />
                        )}
                        {workOrder.location && (
                          <IconWithLabel
                            label={workOrder.location.name}
                            icon="map-marker-outline"
                            color={theme.colors.onSurfaceVariant}
                          />
                        )}
                        {workOrder.priority &&
                          workOrder.priority !== 'NONE' && (
                            <Tag
                              text={t(workOrder.priority)}
                              color={getPriorityColor(
                                workOrder.priority,
                                theme
                              )}
                              backgroundColor="transparent"
                            />
                          )}
                      </View>
                      <View style={styles.cardFooter}>
                        {workOrder.dueDate && (
                          <View style={styles.dueDateContainer}>
                            <IconWithLabel
                              color={
                                (dayDiff(
                                  new Date(workOrder.dueDate),
                                  new Date()
                                ) <= 2 ||
                                  new Date() > new Date(workOrder.dueDate)) &&
                                workOrder.status !== 'COMPLETE'
                                  ? theme.colors.error
                                  : theme.colors.onSurfaceVariant
                              }
                              label={getFormattedDate(workOrder.dueDate)}
                              icon="clock-alert-outline"
                            />
                          </View>
                        )}
                        {allUsers.length > 0 && (
                          <View style={styles.assigneeContainer}>
                            {allUsers.slice(0, 3).map((assignedUser, index) => (
                              <View
                                key={assignedUser.id}
                                style={{ marginLeft: index > 0 ? -8 : 0 }}
                              >
                                {assignedUser.image ? (
                                  <Avatar.Image
                                    source={{ uri: assignedUser.image.url }}
                                    size={24}
                                  />
                                ) : (
                                  <Avatar.Text
                                    size={24}
                                    label={getUserInitials(assignedUser)}
                                  />
                                )}
                              </View>
                            ))}
                            {allUsers.length > 3 && (
                              <Text
                                variant="bodySmall"
                                style={{ marginLeft: 8 }}
                              >
                                +{allUsers.length - 3}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListHeaderComponent={
            <View>
              {loadError && workOrders.content.length > 0 && (
                <View
                  style={[
                    styles.errorBanner,
                    {
                      backgroundColor: theme.colors.errorContainer,
                      borderColor: theme.colors.outlineVariant
                    }
                  ]}
                  accessibilityRole="alert"
                >
                  <Text
                    style={{ color: theme.colors.onErrorContainer, flex: 1 }}
                  >
                    {t('work_orders_load_error')}
                  </Text>
                  <Button compact onPress={() => void fetchFirstPage()}>
                    {t('retry')}
                  </Button>
                </View>
              )}
              <ScrollView
                horizontal
                style={styles.filters}
                showsHorizontalScrollIndicator={false}
              >
                <IconButton
                  icon={
                    _.isEqual(criteria.filterFields, defaultFilterFields)
                      ? 'filter-outline'
                      : 'filter-check'
                  }
                  iconColor={
                    _.isEqual(criteria.filterFields, defaultFilterFields)
                      ? undefined
                      : theme.colors.onPrimary
                  }
                  style={{
                    backgroundColor: _.isEqual(
                      criteria.filterFields,
                      defaultFilterFields
                    )
                      ? theme.colors.background
                      : theme.colors.primary
                  }}
                  accessibilityLabel={
                    hasActiveFilters
                      ? `${t('to_filter')}, ${t('filters_applied')}`
                      : t('to_filter')
                  }
                  onPress={() =>
                    navigation.navigate('WorkOrderFilters', {
                      filterFields: criteria.filterFields,
                      onFilterChange,
                      onReset: onResetFilters
                    })
                  }
                />
                {hasViewOtherPermission(PermissionEntity.WORK_ORDERS) && (
                  <QuickFilter
                    filterFields={criteria.filterFields}
                    activeFilterField={{
                      field: 'assignedToUser',
                      operation: 'eq',
                      value: user.id
                    }}
                    onChange={onFilterChange}
                  />
                )}
                <EnumFilter
                  filterFields={criteria.filterFields}
                  onChange={onFilterChange}
                  completeOptions={['NONE', 'LOW', 'MEDIUM', 'HIGH']}
                  initialOptions={['NONE', 'LOW', 'MEDIUM', 'HIGH']}
                  fieldName="priority"
                  icon="signal"
                />
                <EnumFilter
                  filterFields={criteria.filterFields}
                  onChange={onFilterChange}
                  completeOptions={[
                    'OPEN',
                    'IN_PROGRESS',
                    'ON_HOLD',
                    'COMPLETE'
                  ]}
                  initialOptions={['OPEN', 'IN_PROGRESS', 'ON_HOLD']}
                  fieldName="status"
                  icon="circle-double"
                />
                {!_.isEqual(criteria.filterFields, defaultFilterFields) && (
                  <IconButton
                    icon="close"
                    iconColor={theme.colors.error}
                    accessibilityLabel={t('reset_filters')}
                    style={{ backgroundColor: theme.colors.background }}
                    onPress={() => onFilterChange(defaultFilterFields)}
                  />
                )}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            loadingGet || !hasLoadedFirstPage ? (
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
            ) : loadError ? (
              <View
                style={[
                  styles.errorState,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant
                  }
                ]}
                accessibilityRole="alert"
              >
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.error }}
                >
                  {t('work_orders_load_error')}
                </Text>
                <Button mode="contained" onPress={() => void fetchFirstPage()}>
                  {t('retry')}
                </Button>
              </View>
            ) : (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant
                  }
                ]}
              >
                <Avatar.Icon
                  size={48}
                  icon="clipboard-text-search-outline"
                  style={{ backgroundColor: theme.colors.background }}
                  color={theme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  {hasActiveFilters || hasActiveSearch
                    ? t('no_element_match_criteria')
                    : t('no_work_orders_available')}
                </Text>
                {(hasActiveFilters || hasActiveSearch) && (
                  <Button
                    mode="outlined"
                    onPress={clearSearchAndFilters}
                    accessibilityRole="button"
                  >
                    {t('clear_search_and_filters')}
                  </Button>
                )}
              </View>
            )
          }
          ListFooterComponent={
            loadingGet && !refreshing && workOrders.content.length > 0 ? (
              <ActivityIndicator
                color={theme.colors.primary}
                style={styles.loadingFooter}
              />
            ) : loadMoreError ? (
              <View style={styles.loadMoreError} accessibilityRole="alert">
                <Text style={{ color: theme.colors.error }}>
                  {t('work_orders_load_error')}
                </Text>
                <Button compact onPress={() => void fetchNextPage(true)}>
                  {t('retry')}
                </Button>
              </View>
            ) : null
          }
          onEndReached={() => void fetchNextPage()}
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
      </>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  list: {
    width: '100%',
    flex: 1
  },
  listContent: { paddingBottom: 100, flexGrow: 1 },
  filters: {
    backgroundColor: 'transparent',
    marginBottom: 8,
    maxHeight: 54
  },
  cardContent: {
    flexDirection: 'row',
    gap: 6
  },
  loadingFooter: { paddingVertical: 18 },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  errorState: {
    minHeight: 180,
    margin: 16,
    padding: 20,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadMoreError: {
    margin: 16,
    alignItems: 'center',
    gap: 4
  },
  searchbar: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.control,
    elevation: 0
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
  card: {
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 13,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    flexShrink: 1
  },
  cardBody: {
    gap: 10
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  dueDateContainer: { flex: 1, minWidth: 0, marginRight: 8 },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto'
  },
  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  emptyState: {
    minHeight: 180,
    marginHorizontal: 12,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    gap: 10
  },
  emptyTitle: { textAlign: 'center' }
});
