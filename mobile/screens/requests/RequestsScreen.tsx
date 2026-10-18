import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { useDispatch, useSelector } from '../../store';
import * as React from 'react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { getMoreRequests, getRequests } from '../../slices/request';
import { FilterField, SearchCriteria } from '../../models/page';
import {
  Badge,
  Button,
  Card,
  IconButton,
  Searchbar,
  Text,
  Avatar
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Request from '../../models/request';
import { getPriorityColor, onSearchQueryChange } from '../../utils/overall';
import { RootTabScreenProps } from '../../types';
import Tag from '../../components/Tag';
import { useDebouncedEffect } from '../../hooks/useDebouncedEffect';
import { dayDiff } from '../../utils/dates';
import { getUnreadNotificationCount } from '../../slices/notification';
import _ from 'lodash';
import EnumFilter from '../workOrders/components/EnumFilter';
import { IconWithLabel } from '../../components/IconWithLabel';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import { beginRequest, isCurrentRequest } from '../../utils/requestSequence';
import { useIsFocused } from '@react-navigation/native';

export default function RequestsScreen({
  navigation
}: RootTabScreenProps<'Requests'>) {
  const { t } = useTranslation();
  const [startedSearch, setStartedSearch] = useState<boolean>(false);
  const { requests, loadingGet, currentPageNum, lastPage } = useSelector(
    (state) => state.requests
  );
  const theme = useAppTheme();
  const dispatch = useDispatch();
  const { unreadCount } = useSelector((state) => state.notifications);
  const unreadNotificationCount = unreadCount ?? 0;
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedFirstPage, setHasLoadedFirstPage] = useState(false);
  const [loadedFilterFields, setLoadedFilterFields] = useState<
    FilterField[] | null
  >(null);
  const [loadError, setLoadError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const nextPageRequestInProgress = useRef(false);
  const firstPageRequestSequence = useRef(0);
  const paginationRequestSequence = useRef(0);
  const refreshRequestSequence = useRef(0);
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const isFocused = useIsFocused();
  const { hasViewPermission, user } = useAuth();
  const defaultFilterFields: FilterField[] = [
    {
      field: 'priority',
      operation: 'in',
      values: [],
      value: '',
      enumName: 'PRIORITY'
    },
    {
      field: 'status',
      operation: 'in',
      values: ['APPROVED', 'CANCELLED', 'PENDING'],
      value: '',
      enumName: 'STATUS'
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
  const hasCurrentCriteriaResults =
    loadedFilterFields !== null &&
    _.isEqual(loadedFilterFields, criteria.filterFields);
  const visibleRequests = hasCurrentCriteriaResults ? requests.content : [];
  const fetchFirstPage = useCallback(
    async (isRefresh = false) => {
      const requestSequence = beginRequest(firstPageRequestSequence);
      beginRequest(paginationRequestSequence);
      nextPageRequestInProgress.current = false;
      setLoadError(false);
      setLoadMoreError(false);
      if (!isRefresh) {
        refreshRequestSequence.current += 1;
        setRefreshing(false);
      }
      try {
        await dispatch(
          getRequests({
            ...criteria,
            pageSize: 10,
            pageNum: 0,
            direction: 'DESC'
          })
        );
        if (isCurrentRequest(requestSequence, firstPageRequestSequence)) {
          setLoadedFilterFields(criteria.filterFields);
        }
      } catch (_error) {
        if (isCurrentRequest(requestSequence, firstPageRequestSequence)) {
          setLoadError(true);
        }
      } finally {
        if (isCurrentRequest(requestSequence, firstPageRequestSequence)) {
          setHasLoadedFirstPage(true);
        }
      }
    },
    [criteria, dispatch]
  );
  const fetchNextPage = useCallback(
    async (retry = false) => {
      const firstPageSequence = firstPageRequestSequence.current;
      if (
        nextPageRequestInProgress.current ||
        loadingGet ||
        lastPage ||
        !hasCurrentCriteriaResults ||
        (loadMoreError && !retry)
      )
        return;
      const paginationSequence = beginRequest(paginationRequestSequence);
      nextPageRequestInProgress.current = true;
      setLoadMoreError(false);
      try {
        await dispatch(getMoreRequests(criteria, currentPageNum + 1));
      } catch (_error) {
        if (
          isCurrentRequest(firstPageSequence, firstPageRequestSequence) &&
          isCurrentRequest(paginationSequence, paginationRequestSequence)
        ) {
          setLoadMoreError(true);
        }
      } finally {
        if (
          isCurrentRequest(firstPageSequence, firstPageRequestSequence) &&
          isCurrentRequest(paginationSequence, paginationRequestSequence)
        ) {
          nextPageRequestInProgress.current = false;
        }
      }
    },
    [
      criteria,
      currentPageNum,
      dispatch,
      hasCurrentCriteriaResults,
      lastPage,
      loadMoreError,
      loadingGet
    ]
  );

  useEffect(() => {
    if (hasViewPermission(PermissionEntity.REQUESTS)) {
      void fetchFirstPage();
    }
  }, [criteria, fetchFirstPage, hasViewPermission]);

  useEffect(() => {
    if (user.role.code === 'REQUESTER')
      navigation.setOptions({
        title: t('requests'),
        headerRight: () => (
          <View
            style={{
              display: 'flex',
              flexDirection: 'row'
            }}
          >
            <View style={{ position: 'relative' }}>
              <IconButton
                icon="bell-outline"
                accessibilityLabel={
                  unreadCount === null
                    ? t('notifications')
                    : `${t('notifications')}, ${t(
                        'unread_notifications_count',
                        { count: unreadNotificationCount }
                      )}`
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
                visible={unreadNotificationCount > 0}
              >
                {unreadNotificationCount}
              </Badge>
            </View>
            <IconButton
              icon="cog-outline"
              accessibilityLabel={t('settings')}
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        )
      });
  }, [
    navigation,
    t,
    theme.colors.error,
    unreadNotificationCount,
    user.role.code
  ]);

  useEffect(() => {
    if (user.role.code === 'REQUESTER' && isFocused) {
      dispatch(getUnreadNotificationCount());
    }
  }, [dispatch, isFocused, user.role.code]);

  const onRefresh = async () => {
    const requestSequence = beginRequest(refreshRequestSequence);
    setRefreshing(true);
    try {
      await fetchFirstPage(true);
    } catch (_error) {
      // The API error handler displays the failure message globally.
    } finally {
      if (isCurrentRequest(requestSequence, refreshRequestSequence)) {
        setRefreshing(false);
      }
    }
  };

  const getStatusMeta = (request: Request): [string, string] => {
    if (request.workOrder) {
      // @ts-ignore
      return [t('approved'), theme.colors.success];
    } else if (request.cancelled) {
      return [t('rejected'), theme.colors.error];
    } else return [t('pending'), theme.colors.primary];
  };

  const onFilterChange = (newFilters: FilterField[]) => {
    const newCriteria = { ...criteria };
    newCriteria.filterFields = newFilters;
    setCriteria(newCriteria);
  };
  const hasActiveFilters = !_.isEqual(
    criteria.filterFields,
    defaultFilterFields
  );
  const hasActiveSearch = searchQuery.trim().length > 0;
  const clearSearchAndFilters = () => {
    // Keep debounced search enabled while the Searchbar remains focused so
    // the next query is applied without requiring a blur/refocus cycle.
    setStartedSearch(true);
    setSearchQuery('');
    setCriteria(getCriteriaFromFilterFields([]));
  };
  const onQueryChange = (query) => {
    onSearchQueryChange<Request>(query, criteria, setCriteria, setSearchQuery, [
      'title',
      'description',
      'customId',
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
  return (
    <View
      style={{ ...styles.container, backgroundColor: theme.colors.background }}
    >
      {hasViewPermission(PermissionEntity.REQUESTS) ? (
        <>
          <Searchbar
            placeholder={t('search')}
            accessibilityLabel={t('search')}
            onFocus={() => setStartedSearch(true)}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.search, { backgroundColor: theme.colors.surface }]}
          />
          <FlatList<Request>
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={visibleRequests}
            keyExtractor={(request) => String(request.id)}
            renderItem={({ item: request }) => (
              <Card
                mode="outlined"
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant
                  }
                ]}
                onPress={() => {
                  if (request.workOrder) {
                    navigation.push('WODetails', {
                      id: request.workOrder.id
                    });
                  } else {
                    navigation.push('RequestDetails', {
                      id: request.id,
                      requestProp: request
                    });
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={[
                  request.title,
                  request.customId ?? request.id,
                  getStatusMeta(request)[0],
                  request.priority && request.priority !== 'NONE'
                    ? `${t('priority')}: ${t(request.priority)}`
                    : undefined,
                  request.asset?.name
                    ? `${t('asset_name')}: ${request.asset.name}`
                    : undefined,
                  request.location?.name
                    ? `${t('location_name')}: ${request.location.name}`
                    : undefined,
                  request.dueDate
                    ? `${t('due_date')}: ${getFormattedDate(request.dueDate)}`
                    : undefined
                ]
                  .filter(Boolean)
                  .join(', ')}
                accessibilityHint={
                  request.workOrder
                    ? t('request_open_work_order_hint')
                    : t('request_open_details_hint')
                }
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.cardRow}>
                    {request.image ? (
                      <Avatar.Image
                        size={50}
                        source={{ uri: request.image.url }}
                      />
                    ) : (
                      <Avatar.Icon
                        style={{
                          backgroundColor: theme.colors.primaryContainer
                        }}
                        color={theme.colors.onPrimaryContainer}
                        icon="inbox-arrow-down-outline"
                        size={50}
                      />
                    )}
                    <View style={styles.cardMain}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            variant="titleMedium"
                            style={styles.cardTitle}
                            numberOfLines={2}
                          >
                            {request.title}
                          </Text>
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            {request.customId
                              ? `#${request.customId}`
                              : `#${request.id}`}
                          </Text>
                        </View>
                        <Tag
                          text={getStatusMeta(request)[0]}
                          color={
                            request.workOrder
                              ? theme.colors.onSuccess
                              : request.cancelled
                              ? theme.colors.onError
                              : theme.colors.onPrimary
                          }
                          backgroundColor={getStatusMeta(request)[1]}
                        />
                      </View>
                      <View style={styles.cardBody}>
                        {request.asset && (
                          <IconWithLabel
                            label={request.asset.name}
                            icon="package-variant-closed"
                            color={theme.colors.onSurfaceVariant}
                          />
                        )}
                        {request.location && (
                          <IconWithLabel
                            label={request.location.name}
                            icon="map-marker-outline"
                            color={theme.colors.onSurfaceVariant}
                          />
                        )}
                        {request.priority && request.priority !== 'NONE' && (
                          <Tag
                            text={t(request.priority)}
                            color={getPriorityColor(request.priority, theme)}
                            backgroundColor="transparent"
                          />
                        )}
                      </View>
                      {request.dueDate && (
                        <View style={styles.cardFooter}>
                          <IconWithLabel
                            color={
                              (dayDiff(new Date(request.dueDate), new Date()) <=
                                2 ||
                                new Date() > new Date(request.dueDate)) &&
                              request.workOrder?.status !== 'COMPLETE'
                                ? theme.colors.error
                                : theme.colors.onSurfaceVariant
                            }
                            label={getFormattedDate(request.dueDate)}
                            icon="clock-alert-outline"
                          />
                        </View>
                      )}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            )}
            ListHeaderComponent={
              <View>
                {loadError && visibleRequests.length > 0 && (
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
                      {t('requests_load_error')}
                    </Text>
                    <Button
                      compact
                      onPress={() => void fetchFirstPage()}
                      style={styles.retryButton}
                    >
                      {t('retry')}
                    </Button>
                  </View>
                )}
                <ScrollView
                  horizontal
                  style={[
                    styles.filters,
                    { backgroundColor: theme.colors.surface }
                  ]}
                  showsHorizontalScrollIndicator={false}
                >
                  <EnumFilter
                    filterFields={criteria.filterFields}
                    onChange={onFilterChange}
                    completeOptions={['NONE', 'LOW', 'MEDIUM', 'HIGH']}
                    initialOptions={[]}
                    fieldName="priority"
                    icon="signal"
                  />
                  <EnumFilter
                    filterFields={criteria.filterFields}
                    onChange={onFilterChange}
                    completeOptions={['APPROVED', 'CANCELLED', 'PENDING']}
                    initialOptions={['APPROVED', 'CANCELLED', 'PENDING']}
                    fieldName="status"
                    icon="circle-double"
                  />
                  {!_.isEqual(criteria.filterFields, defaultFilterFields) && (
                    <IconButton
                      icon="close"
                      iconColor={theme.colors.error}
                      accessibilityLabel={t('reset_filters')}
                      accessibilityRole="button"
                      mode="outlined"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1,
                        borderColor: theme.colors.controlOutline,
                        width: qpmLayoutTokens.touchTarget.minimum,
                        height: qpmLayoutTokens.touchTarget.minimum
                      }}
                      onPress={() => onFilterChange(defaultFilterFields)}
                    />
                  )}
                </ScrollView>
              </View>
            }
            ListEmptyComponent={
              loadingGet ||
              (!hasCurrentCriteriaResults && !loadError) ||
              (hasViewPermission(PermissionEntity.REQUESTS) &&
                !hasLoadedFirstPage) ? (
                <View
                  style={styles.loadingState}
                  accessibilityRole="progressbar"
                  accessibilityLabel={t('loading')}
                >
                  <ActivityIndicator
                    color={theme.colors.primary}
                    size="large"
                  />
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
                    {t('requests_load_error')}
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => void fetchFirstPage()}
                    style={styles.retryButton}
                  >
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
                    icon="inbox-arrow-down-outline"
                    style={{ backgroundColor: theme.colors.background }}
                    color={theme.colors.primary}
                  />
                  <Text variant="titleMedium" style={styles.emptyTitle}>
                    {hasActiveFilters || hasActiveSearch
                      ? t('no_element_match_criteria')
                      : t('no_requests_available')}
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
              loadingGet && !refreshing && visibleRequests.length > 0 ? (
                <View
                  style={styles.loadingFooter}
                  accessibilityRole="progressbar"
                  accessibilityLabel={t('requests_page_loading')}
                >
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {t('requests_page_loading')}
                  </Text>
                </View>
              ) : loadMoreError ? (
                <View style={styles.loadMoreError} accessibilityRole="alert">
                  <Text style={{ color: theme.colors.error }}>
                    {t('requests_load_error')}
                  </Text>
                  <Button
                    compact
                    onPress={() => void fetchNextPage(true)}
                    style={styles.retryButton}
                  >
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
                progressBackgroundColor={theme.colors.surface}
              />
            }
          />
        </>
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
          <Text variant={'titleLarge'}>{t('no_access_requests')}</Text>
        </View>
      )}
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
  filters: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: qpmLayoutTokens.radius.card
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
  loadingFooter: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
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
  loadMoreError: { margin: 16, alignItems: 'center', gap: 4 },
  retryButton: {
    minHeight: qpmLayoutTokens.touchTarget.minimum,
    justifyContent: 'center'
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    elevation: 1
  },
  cardContent: { paddingVertical: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardMain: { flex: 1, minWidth: 0 },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 4,
    flexShrink: 1
  },
  cardBody: { gap: 8 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  emptyState: {
    minHeight: 180,
    margin: 16,
    padding: 20,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  emptyTitle: { textAlign: 'center' }
});
