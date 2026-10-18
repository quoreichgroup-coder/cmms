import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View
} from 'react-native';
import { useDispatch, useSelector } from '../../store';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { getMoreParts, getParts } from '../../slices/part';
import { FilterField, SearchCriteria } from '../../models/page';
import { Searchbar, Text, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Part from '../../models/part';
import { onSearchQueryChange } from '../../utils/overall';
import { RootStackScreenProps } from '../../types';
import { useDebouncedEffect } from '../../hooks/useDebouncedEffect';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import { IconWithLabel } from '../../components/IconWithLabel';
import { beginRequest, isCurrentRequest } from '../../utils/requestSequence';
export const getFormattedQuantityWithUnit = (
  quantity: number,
  unit: string
) => {
  return unit ? quantity + ' ' + unit : quantity;
};
export default function PartsScreen({
  navigation
}: RootStackScreenProps<'Parts'>) {
  const { t } = useTranslation();
  const [startedSearch, setStartedSearch] = useState<boolean>(false);
  const { parts, listLoading, currentPageNum, lastPage } = useSelector(
    (state) => state.parts
  );
  const theme = useAppTheme();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const nextPageRequestInProgress = useRef(false);
  const firstPageRequestSequence = useRef(0);
  const paginationRequestSequence = useRef(0);
  const refreshRequestSequence = useRef(0);
  const { hasViewPermission } = useAuth();
  const canView = hasViewPermission(PermissionEntity.PARTS_AND_MULTIPARTS);
  const [hasLoadedList, setHasLoadedList] = useState(false);
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
          getParts({
            ...criteria,
            pageSize: 10,
            pageNum: 0,
            direction: 'DESC'
          })
        );
      } catch (_error) {
        if (isCurrentRequest(requestSequence, firstPageRequestSequence)) {
          setLoadError(true);
        }
      } finally {
        if (isCurrentRequest(requestSequence, firstPageRequestSequence)) {
          setHasLoadedList(true);
        }
      }
    },
    [criteria, dispatch]
  );

  const fetchNextPage = useCallback(
    async (retry = false) => {
      const firstPageSequence = firstPageRequestSequence.current;
      if (
        !canView ||
        nextPageRequestInProgress.current ||
        listLoading ||
        lastPage ||
        (loadMoreError && !retry)
      )
        return;
      const paginationSequence = beginRequest(paginationRequestSequence);
      nextPageRequestInProgress.current = true;
      setLoadMoreError(false);
      try {
        await dispatch(getMoreParts(criteria, currentPageNum + 1));
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
      canView,
      criteria,
      currentPageNum,
      dispatch,
      lastPage,
      loadMoreError,
      listLoading
    ]
  );

  useEffect(() => {
    if (canView) void fetchFirstPage();
  }, [canView, fetchFirstPage]);

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

  const onQueryChange = (query) => {
    onSearchQueryChange<Part>(query, criteria, setCriteria, setSearchQuery, [
      'name',
      'description',
      'additionalInfos',
      'area',
      'barcode',
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
      {canView && (
        <Searchbar
          placeholder={t('search')}
          accessibilityLabel={t('search')}
          onFocus={() => setStartedSearch(true)}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.search, { backgroundColor: theme.colors.surface }]}
        />
      )}
      <FlatList<Part>
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={parts.content}
        keyExtractor={(part) => String(part.id)}
        renderItem={({ item: part }) => (
          <Pressable
            onPress={() =>
              navigation.push('PartDetails', { id: part.id, partProp: part })
            }
            accessibilityRole="button"
            accessibilityLabel={`${part.name}, ${t('remaining_parts', {
              quantity: getFormattedQuantityWithUnit(part.quantity, part.unit)
            })}, ${t('minimum_quantity')}: ${getFormattedQuantityWithUnit(
              part.minQuantity,
              part.unit
            )}${
              part.quantity < part.minQuantity
                ? `, ${t('part_below_minimum_stock')}`
                : ''
            }`}
            accessibilityHint={t('part_open_details_hint')}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                opacity: pressed ? 0.72 : 1
              }
            ]}
          >
            {part.image ? (
              <Avatar.Image size={48} source={{ uri: part.image.url }} />
            ) : (
              <Avatar.Icon
                style={{ backgroundColor: theme.colors.primaryContainer }}
                color={theme.colors.onPrimaryContainer}
                icon="archive-outline"
                size={48}
              />
            )}
            <View style={styles.partDetails}>
              <Text
                variant="titleMedium"
                style={styles.cardTitle}
                numberOfLines={2}
              >
                {part.name}
              </Text>
              <View
                style={[
                  styles.quantityBadge,
                  {
                    backgroundColor:
                      part.quantity < part.minQuantity
                        ? theme.colors.errorContainer
                        : theme.colors.secondaryContainer
                  }
                ]}
              >
                <IconWithLabel
                  label={t('remaining_parts', {
                    quantity: getFormattedQuantityWithUnit(
                      part.quantity,
                      part.unit
                    )
                  })}
                  icon="toolbox-outline"
                  color={
                    part.quantity < part.minQuantity
                      ? theme.colors.onErrorContainer
                      : theme.colors.onSecondaryContainer
                  }
                />
              </View>
              {part.minQuantity > 0 && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t('minimum_quantity')}:{' '}
                  {getFormattedQuantityWithUnit(part.minQuantity, part.unit)}
                </Text>
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          canView && (listLoading || !hasLoadedList) ? (
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
          ) : !canView ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant
                }
              ]}
            >
              <Text style={{ color: theme.colors.onSurface }}>
                {t('no_access_inventory')}
              </Text>
            </View>
          ) : loadError ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant
                }
              ]}
            >
              <Text style={{ color: theme.colors.onSurface }}>
                {t('parts_load_error')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('retry')}
                onPress={() => void fetchFirstPage()}
                style={styles.retryButton}
              >
                <Text style={{ color: theme.colors.primary }}>
                  {t('retry')}
                </Text>
              </Pressable>
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
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface }}
              >
                {t('no_element_match_criteria')}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          listLoading && !refreshing && parts.content.length > 0 ? (
            <View
              style={styles.loadingFooter}
              accessibilityRole="progressbar"
              accessibilityLabel={t('parts_page_loading')}
            >
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {t('parts_page_loading')}
              </Text>
            </View>
          ) : loadMoreError ? (
            <View style={styles.loadingFooter}>
              <Text style={{ color: theme.colors.error }}>
                {t('parts_load_error')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('retry')}
                onPress={() => void fetchNextPage(true)}
                style={styles.retryButton}
              >
                <Text style={{ color: theme.colors.primary }}>
                  {t('retry')}
                </Text>
              </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  retryButton: { paddingHorizontal: 12, paddingVertical: 8 },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: qpmLayoutTokens.radius.control
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 78
  },
  partDetails: { flex: 1, minWidth: 0, gap: 5 },
  quantityBadge: {
    alignSelf: 'flex-start',
    borderRadius: qpmLayoutTokens.radius.control,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    flexShrink: 1
  },
  emptyState: {
    margin: 16,
    padding: 20,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  }
});
