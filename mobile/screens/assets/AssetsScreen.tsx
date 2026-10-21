import { logSafeError } from '../../utils/safeErrorLog';
import _ from 'lodash';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
  StyleSheet
} from 'react-native';
import { useDispatch, useSelector } from '../../store';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { getAssetChildren, getAssets, getMoreAssets } from '../../slices/asset';
import { FilterField, SearchCriteria } from '../../models/page';
import { Avatar, Button, Searchbar, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import {
  AssetDTO,
  AssetRow,
  assetStatuses,
  getAssetStatusConfig
} from '../../models/asset';
import { onSearchQueryChange } from '../../utils/overall';
import { RootStackScreenProps } from '../../types';
import Tag from '../../components/Tag';
import { useDebouncedEffect } from '../../hooks/useDebouncedEffect';
import { IconWithLabel } from '../../components/IconWithLabel';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import { beginRequest, isCurrentRequest } from '../../utils/requestSequence';

const AssetCard = ({
  asset,
  navigation,
  showChildrenButton = false,
  onViewChildren
}: {
  asset: AssetDTO;
  navigation: RootStackScreenProps<'Assets'>['navigation'];
  showChildrenButton?: boolean;
  onViewChildren?: () => void;
}) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const accessibilityLabel = [
    asset.name,
    asset.customId ? `#${asset.customId}` : null,
    asset.location?.name,
    asset.status ? t(asset.status) : null
  ]
    .filter(Boolean)
    .join(', ');
  const assetIdentityLabel = [
    asset.customId ? `#${asset.customId}` : null,
    asset.name
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant
        }
      ]}
    >
      <Pressable
        onPress={() =>
          navigation.push('AssetDetails', {
            id: asset.id,
            assetProp: asset
          })
        }
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={t('related_asset_open_hint')}
        style={({ pressed }) => [
          styles.cardMain,
          { opacity: pressed ? 0.72 : 1 }
        ]}
      >
        {asset.image ? (
          <Avatar.Image size={48} source={{ uri: asset.image.url }} />
        ) : (
          <Avatar.Icon
            style={{ backgroundColor: theme.colors.primaryContainer }}
            color={theme.colors.onPrimaryContainer}
            icon="package-variant-closed"
            size={48}
          />
        )}
        <View style={styles.cardDetails}>
          <View style={styles.cardHeader}>
            <View style={styles.assetIdentity}>
              <Text
                variant="titleMedium"
                style={styles.cardTitle}
                numberOfLines={2}
              >
                {asset.name}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {`#${asset.customId}`}
              </Text>
            </View>
            <Tag
              text={t(asset?.status)}
              backgroundColor={getAssetStatusConfig(asset?.status).color(theme)}
              color={getAssetStatusConfig(asset?.status).foregroundColor(theme)}
            />
          </View>
          {asset.location && (
            <View style={styles.cardBody}>
              <IconWithLabel
                label={asset.location.name}
                icon="map-marker-outline"
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          )}
        </View>
      </Pressable>
      {showChildrenButton && asset.hasChildren && (
        <View
          style={[
            styles.cardFooter,
            { borderTopColor: theme.colors.outlineVariant }
          ]}
        >
          <View style={{ flex: 1 }} />
          <Button
            compact
            onPress={onViewChildren}
            accessibilityRole="button"
            accessibilityLabel={t('view_children_for_asset', {
              asset: assetIdentityLabel
            })}
            accessibilityHint={t('view_child_assets_hint')}
          >
            {t('view_children')}
          </Button>
        </View>
      )}
    </View>
  );
};

export default function AssetsScreen({
  navigation,
  route
}: RootStackScreenProps<'Assets'>) {
  const { t } = useTranslation();
  const [startedSearch, setStartedSearch] = useState<boolean>(false);
  const {
    assets,
    assetsHierarchy,
    listLoading,
    loadingGet,
    currentPageNum,
    lastPage,
    assetChildrenPageNum,
    assetChildrenLastPage
  } = useSelector((state) => state.assets);
  const theme = useTheme();
  const [view, setView] = useState<'hierarchy' | 'list'>('hierarchy');
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const { hasViewPermission } = useAuth();
  const canView = hasViewPermission(PermissionEntity.ASSETS);
  const [hasLoadedList, setHasLoadedList] = useState(false);
  const [listLoadError, setListLoadError] = useState(false);
  const [hierarchyLoadError, setHierarchyLoadError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const listPageRequestInProgress = useRef(false);
  const hierarchyPageRequestInProgress = useRef(false);
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
  const criteriaSearchQuery = String(
    criteria.filterFields.find((filterField) => filterField.field === 'name')
      ?.value ?? ''
  );
  const [loadedCriteria, setLoadedCriteria] = useState<{
    filterFields: FilterField[];
    searchQuery: string;
  } | null>(null);
  const hasCurrentCriteriaResults =
    loadedCriteria !== null &&
    _.isEqual(loadedCriteria.filterFields, criteria.filterFields) &&
    loadedCriteria.searchQuery === searchQuery &&
    criteriaSearchQuery === searchQuery;
  const visibleAssets = hasCurrentCriteriaResults ? assets.content : [];
  const listRequestSequence = useRef(0);
  const paginationRequestSequence = useRef(0);
  const loadAssets = useCallback(async () => {
    if (!canView) return;
    const requestSequence = beginRequest(listRequestSequence);
    // A new search or refresh invalidates any page request started for the
    // previous result set. Do not let its later failure decorate fresh rows.
    beginRequest(paginationRequestSequence);
    listPageRequestInProgress.current = false;
    setListLoadError(false);
    setLoadMoreError(false);
    try {
      await dispatch(
        getAssets({ ...criteria, pageSize: 10, pageNum: 0, direction: 'DESC' })
      );
      if (isCurrentRequest(requestSequence, listRequestSequence)) {
        setLoadedCriteria({
          filterFields: criteria.filterFields,
          searchQuery: criteriaSearchQuery
        });
      }
    } catch (error) {
      if (isCurrentRequest(requestSequence, listRequestSequence)) {
        logSafeError('Could not load assets:', error);
        setListLoadError(true);
      }
    } finally {
      if (isCurrentRequest(requestSequence, listRequestSequence)) {
        setHasLoadedList(true);
      }
    }
  }, [canView, criteria, criteriaSearchQuery, dispatch]);

  const loadNextAssetPage = useCallback(
    async (retry = false) => {
      if (
        listPageRequestInProgress.current ||
        listLoading ||
        lastPage ||
        !hasCurrentCriteriaResults ||
        (loadMoreError && !retry)
      )
        return;

      const firstPageSequence = listRequestSequence.current;
      const paginationSequence = beginRequest(paginationRequestSequence);
      listPageRequestInProgress.current = true;
      setLoadMoreError(false);
      try {
        await dispatch(getMoreAssets(criteria, currentPageNum + 1));
      } catch (error) {
        if (
          isCurrentRequest(firstPageSequence, listRequestSequence) &&
          isCurrentRequest(paginationSequence, paginationRequestSequence)
        ) {
          logSafeError('Could not load more assets:', error);
          setLoadMoreError(true);
        }
      } finally {
        if (
          isCurrentRequest(firstPageSequence, listRequestSequence) &&
          isCurrentRequest(paginationSequence, paginationRequestSequence)
        ) {
          listPageRequestInProgress.current = false;
        }
      }
    },
    [
      criteria,
      currentPageNum,
      dispatch,
      hasCurrentCriteriaResults,
      lastPage,
      listRequestSequence,
      listLoading,
      loadMoreError,
      paginationRequestSequence
    ]
  );

  const loadAssetChildren = useCallback(
    async (pageNum = 0) => {
      if (!canView || hierarchyPageRequestInProgress.current) return;
      hierarchyPageRequestInProgress.current = true;
      setHierarchyLoadError(false);
      setLoadMoreError(false);
      try {
        await dispatch(
          getAssetChildren(
            route.params?.id ?? 0,
            route.params?.hierarchy ?? [],
            pageNum
          )
        );
      } catch (error) {
        logSafeError('Could not load asset hierarchy:', error);
        if (pageNum === 0) setHierarchyLoadError(true);
        else setLoadMoreError(true);
      } finally {
        hierarchyPageRequestInProgress.current = false;
      }
    },
    [canView, dispatch, route.params?.hierarchy, route.params?.id]
  );

  const loadNextHierarchyPage = useCallback(
    (retry = false) => {
      const parentId = route.params?.id ?? 0;
      if (
        hierarchyPageRequestInProgress.current ||
        loadingGet ||
        assetChildrenLastPage[parentId] ||
        (loadMoreError && !retry)
      )
        return;

      void loadAssetChildren((assetChildrenPageNum[parentId] ?? 0) + 1);
    },
    [
      assetChildrenLastPage,
      assetChildrenPageNum,
      loadAssetChildren,
      loadMoreError,
      loadingGet,
      route.params?.id
    ]
  );

  useEffect(() => {
    if (view === 'list') loadAssets();
  }, [criteria, loadAssets, view]);
  const [currentAssets, setCurrentAssets] = useState<AssetRow[]>([]);
  useEffect(() => {
    if (
      route.params?.id &&
      assetsHierarchy.some(
        (asset) =>
          asset.hierarchy.includes(route.params.id) &&
          asset.id !== route.params.id
      )
    ) {
      return;
    }
    loadAssetChildren(0);
  }, [loadAssetChildren, route]);

  const onRefresh = () => {
    if (view === 'list') {
      void loadAssets();
    } else {
      void loadAssetChildren(0);
    }
  };

  const onQueryChange = (query) => {
    onSearchQueryChange<AssetDTO>(
      query,
      criteria,
      setCriteria,
      setSearchQuery,
      [
        'name',
        'description',
        'model',
        'additionalInfos',
        'barCode',
        'area',
        'serialNumber',
        'manufacturer',
        'power',
        'customId',
        'customFieldValues.value'
      ]
    );
    setView(query ? 'list' : 'hierarchy');
  };
  useDebouncedEffect(
    () => {
      if (startedSearch) onQueryChange(searchQuery);
    },
    [searchQuery],
    1000
  );

  useEffect(() => {
    let result = [];
    if (route.params?.id) {
      result = assetsHierarchy.filter((asset, index) => {
        return (
          asset.hierarchy[asset.hierarchy.length - 2] === route.params.id &&
          asset.id !== route.params.id
        );
      });
    } else
      result = assetsHierarchy.filter((asset) => asset.hierarchy.length === 1);
    setCurrentAssets(result);
  }, [assetsHierarchy]);

  const handleViewChildren = (asset) => {
    navigation.push('Assets', {
      id: asset.id,
      hierarchy: asset.hierarchy
    });
  };

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
      {view === 'list' ? (
        <FlatList
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          data={canView ? visibleAssets : []}
          keyExtractor={(asset) => String(asset.id)}
          renderItem={({ item }) => (
            <AssetCard asset={item} navigation={navigation} />
          )}
          onEndReached={() => void loadNextAssetPage()}
          onEndReachedThreshold={0.4}
          initialNumToRender={8}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={listLoading}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ListHeaderComponent={
            listLoadError && visibleAssets.length > 0 ? (
              <AsyncStateFeedback
                mode="banner"
                message={t('asset_list_load_error')}
                onRetry={loadAssets}
              />
            ) : null
          }
          ListEmptyComponent={
            !canView ? (
              <AsyncStateFeedback
                mode="permissionDenied"
                message={t('permission_denied_message', {
                  permission: t('assets')
                })}
              />
            ) : listLoading ||
              !hasLoadedList ||
              (!hasCurrentCriteriaResults && !listLoadError) ? (
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
            ) : listLoadError ? (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant
                  }
                ]}
                accessibilityRole="alert"
              >
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  {t('asset_list_load_error')}
                </Text>
                <Button onPress={loadAssets}>{t('retry')}</Button>
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
            loadMoreError ? (
              <AsyncStateFeedback
                mode="banner"
                message={t('asset_list_load_error')}
                onRetry={() => void loadNextAssetPage(true)}
              />
            ) : listLoading && visibleAssets.length > 0 ? (
              <ActivityIndicator
                color={theme.colors.primary}
                style={styles.loadingFooter}
              />
            ) : null
          }
        />
      ) : (
        <FlatList
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          data={canView ? currentAssets : []}
          keyExtractor={(asset) => String(asset.id)}
          renderItem={({ item }) => (
            <AssetCard
              asset={item}
              navigation={navigation}
              showChildrenButton={true}
              onViewChildren={() => handleViewChildren(item)}
            />
          )}
          onEndReached={() => loadNextHierarchyPage()}
          onEndReachedThreshold={0.4}
          initialNumToRender={8}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={loadingGet}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ListHeaderComponent={
            canView && hierarchyLoadError && currentAssets.length > 0 ? (
              <AsyncStateFeedback
                mode="banner"
                message={t('asset_list_load_error')}
                onRetry={() => loadAssetChildren(0)}
              />
            ) : null
          }
          ListEmptyComponent={
            !canView ? (
              <AsyncStateFeedback
                mode="permissionDenied"
                message={t('permission_denied_message', {
                  permission: t('assets')
                })}
              />
            ) : loadingGet ? (
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
            ) : hierarchyLoadError ? (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant
                  }
                ]}
                accessibilityRole="alert"
              >
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  {t('asset_list_load_error')}
                </Text>
                <Button onPress={() => loadAssetChildren(0)}>
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
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  {t('no_assets_available')}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loadMoreError ? (
              <AsyncStateFeedback
                mode="banner"
                message={t('asset_list_load_error')}
                onRetry={() => loadNextHierarchyPage(true)}
              />
            ) : loadingGet && currentAssets.length > 0 ? (
              <ActivityIndicator
                color={theme.colors.primary}
                style={styles.loadingFooter}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  scrollView: {
    width: '100%',
    flex: 1
  },
  listContent: { paddingBottom: 24, flexGrow: 1 },
  loadingFooter: { paddingVertical: 18 },
  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  search: { marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 12,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58
  },
  cardDetails: { flex: 1, minWidth: 0 },
  assetIdentity: { flex: 1, minWidth: 0, paddingRight: 8 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  emptyState: {
    margin: 16,
    padding: 20,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  }
});
