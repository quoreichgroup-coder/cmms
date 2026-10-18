import { FlatList, Pressable, StyleSheet, View as RNView } from 'react-native';
import { View } from '../../components/Themed';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from '../../store';
import { AssetMiniDTO } from '../../models/asset';
import { getAssetsMini } from '../../slices/asset';
import {
  Avatar,
  Button,
  Divider,
  Icon,
  IconButton,
  Searchbar,
  SegmentedButtons,
  Text
} from 'react-native-paper';
import { useAppTheme } from '../../custom-theme';
import SelectionIndicator from '../../components/SelectionIndicator';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';

interface AssetHierarchyNode extends AssetMiniDTO {
  hasChildren: boolean;
}

const ITEM_HEIGHT = 78;
const HIERARCHY_ITEM_HEIGHT = 100;

const AssetItem = React.memo(
  ({
    asset,
    isSelected,
    multiple,
    showChevron,
    viewChildrenLabel,
    onToggle,
    onNavigateDown,
    hierarchy
  }: {
    asset: AssetHierarchyNode;
    isSelected: boolean;
    multiple: boolean;
    showChevron: boolean;
    viewChildrenLabel: string;
    onToggle: (id: number) => void;
    onNavigateDown: (asset: AssetHierarchyNode) => void;
    hierarchy?: boolean;
  }) => {
    const theme = useAppTheme();
    const handleToggle = useCallback(
      () => onToggle(asset.id),
      [asset.id, onToggle]
    );
    const handleNavigateDown = useCallback(
      () => onNavigateDown(asset),
      [asset, onNavigateDown]
    );

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface },
          hierarchy ? { height: HIERARCHY_ITEM_HEIGHT } : {}
        ]}
      >
        <View style={styles.cardRow}>
          <Pressable
            onPress={handleToggle}
            accessibilityRole={multiple ? 'checkbox' : 'button'}
            accessibilityLabel={`${asset.name}, ${asset.customId}`}
            accessibilityState={multiple ? { checked: isSelected } : undefined}
            style={styles.selectionTarget}
          >
            <Avatar.Icon
              style={{ backgroundColor: theme.colors.primaryContainer }}
              color={theme.colors.primary}
              icon={'package-variant-closed'}
              size={50}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={2}
                    variant="titleMedium"
                    style={styles.cardTitle}
                  >
                    {asset.name}
                  </Text>
                  <Text
                    variant={'bodySmall'}
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >{`#${asset.customId}`}</Text>
                </View>
                {multiple && (
                  <SelectionIndicator
                    checked={isSelected}
                    color={theme.colors.primary}
                    uncheckedColor={theme.colors.controlOutline}
                  />
                )}
              </View>
            </View>
          </Pressable>
          {showChevron && (
            <IconButton
              icon="chevron-right"
              size={24}
              accessibilityLabel={viewChildrenLabel}
              style={styles.hierarchyButton}
              onPress={handleNavigateDown}
            />
          )}
        </View>
      </View>
    );
  }
);

export default function SelectAssetsModal({
  navigation,
  route
}: RootStackScreenProps<'SelectAssets'>) {
  const { onChange, selected, multiple, locationId } = route.params;
  const theme = useAppTheme();
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { assetsMini } = useSelector((state) => state.assets);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadedLocationKey, setLoadedLocationKey] = useState<string | null>(
    null
  );
  const loadRequestRef = useRef(0);
  const locationKey = locationId == null ? 'all' : `location:${locationId}`;
  const hasLoadedForLocation = loadedLocationKey === locationKey;
  const visibleAssetsMini = hasLoadedForLocation ? assetsMini : [];

  const assetsHierarchy: AssetHierarchyNode[] = useMemo(() => {
    const assetMap = new Map(
      visibleAssetsMini.map((asset) => [asset.id, asset])
    );
    const childrenMap = new Map<number, boolean>();
    visibleAssetsMini.forEach((asset) => {
      if (asset.parentId !== null && assetMap.has(asset.parentId)) {
        childrenMap.set(asset.parentId, true);
      }
    });
    return visibleAssetsMini.map((asset) => ({
      ...asset,
      hasChildren: childrenMap.has(asset.id) || false
    }));
  }, [visibleAssetsMini]);

  const assetsMap = useMemo(
    () => new Map(assetsHierarchy.map((a) => [a.id, a])),
    [assetsHierarchy]
  );

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [view, setView] = useState<'list' | 'hierarchy'>('list');
  const [currentHierarchyParent, setCurrentHierarchyParent] =
    useState<AssetHierarchyNode | null>(null);

  const currentHierarchyLevel = useMemo(
    () =>
      assetsHierarchy.filter(
        (asset) => asset.parentId === (currentHierarchyParent?.id ?? null)
      ),
    [assetsHierarchy, currentHierarchyParent]
  );

  useEffect(() => {
    if (selected) {
      setSelectedIds(selected);
    }
  }, [selected]);

  const loadAssets = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoadingAssets(true);
    setLoadError(false);
    try {
      await dispatch(getAssetsMini(locationId));
      if (requestId !== loadRequestRef.current) return;
      setLoadedLocationKey(locationKey);
    } catch (_error) {
      if (requestId !== loadRequestRef.current) return;
      setLoadError(true);
    } finally {
      if (requestId === loadRequestRef.current) setLoadingAssets(false);
    }
  }, [dispatch, locationId, locationKey]);

  useEffect(() => {
    void loadAssets();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadAssets]);

  useEffect(() => {
    setCurrentHierarchyParent(null);
  }, [locationKey]);

  const currentlySelectedAssets = useMemo(
    () =>
      selectedIds.flatMap((id) => {
        const asset = assetsMap.get(id);
        return asset ? [asset] : [];
      }),
    [selectedIds, assetsMap]
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <RNView style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton
            icon="barcode-scan"
            size={24}
            accessibilityLabel={t('to_scan')}
            onPress={() =>
              navigation.replace('ScanAsset', {
                onChange: (asset) => {
                  onChange([asset]);
                }
              })
            }
            style={{ marginRight: 5 }}
          />
          {multiple && (
            <Pressable
              disabled={!currentlySelectedAssets.length}
              accessibilityRole="button"
              accessibilityLabel={`${t('add')} (${
                currentlySelectedAssets.length
              })`}
              accessibilityState={{ disabled: !currentlySelectedAssets.length }}
              onPress={() => {
                onChange(currentlySelectedAssets);
                navigation.goBack();
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.primary, marginRight: 10 }}
              >
                {t('add')} ({currentlySelectedAssets.length})
              </Text>
            </Pressable>
          )}
        </RNView>
      )
    });
  }, [
    currentlySelectedAssets,
    multiple,
    navigation,
    onChange,
    theme.colors.primary,
    t
  ]);

  const toggle = useCallback(
    (id: number) => {
      if (!multiple) {
        const asset = assetsMap.get(id);
        if (asset) {
          onChange([asset]);
        }
        navigation.goBack();
        return;
      }
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    },
    [multiple, assetsMap, onChange, navigation]
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (query) {
      setView('list');
    }
  }, []);

  const handleViewChange = useCallback((newView: string) => {
    setView(newView as 'list' | 'hierarchy');
    setSearchQuery('');
    setCurrentHierarchyParent(null);
  }, []);

  const navigateHierarchyDown = useCallback((asset: AssetHierarchyNode) => {
    setCurrentHierarchyParent(asset);
  }, []);

  const navigateHierarchyUp = useCallback(() => {
    setCurrentHierarchyParent((prev) => {
      if (!prev) return prev;
      return assetsMap.get(prev.parentId ?? -1) ?? null;
    });
  }, [assetsMap]);

  const onRefresh = useCallback(() => {
    void loadAssets();
    if (view === 'hierarchy') {
      setCurrentHierarchyParent(null);
    }
  }, [loadAssets, view]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredListAssets = useMemo(() => {
    if (!searchQuery) return assetsHierarchy;
    return assetsHierarchy.filter((asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [assetsHierarchy, searchQuery]);

  const renderItem = useCallback(
    ({ item }: { item: AssetHierarchyNode }, hierarchy?: boolean) => (
      <AssetItem
        asset={item}
        isSelected={selectedSet.has(item.id)}
        multiple={multiple}
        showChevron={view === 'hierarchy' && item.hasChildren}
        viewChildrenLabel={t('view_children')}
        onToggle={toggle}
        onNavigateDown={navigateHierarchyDown}
        hierarchy={hierarchy}
      />
    ),
    [selectedSet, multiple, view, t, toggle, navigateHierarchyDown]
  );

  const keyExtractor = useCallback(
    (item: AssetHierarchyNode) => String(item.id),
    []
  );

  const ListEmptyComponent = useCallback(() => {
    if (loadingAssets || (!hasLoadedForLocation && !loadError)) {
      return <AsyncStateFeedback mode="loading" message={t('loading')} />;
    }
    if (loadError && !hasLoadedForLocation) {
      return (
        <AsyncStateFeedback
          mode="error"
          message={t('asset_list_load_error')}
          onRetry={() => void loadAssets()}
        />
      );
    }
    if (view === 'hierarchy') return null;
    if (searchQuery) {
      return (
        <Text
          style={[
            styles.noResultsText,
            { color: theme.colors.onSurfaceVariant }
          ]}
        >
          {t('no_results_found')}
        </Text>
      );
    }
    return (
      <Text
        style={[styles.noResultsText, { color: theme.colors.onSurfaceVariant }]}
      >
        {t('no_assets_available')}
      </Text>
    );
  }, [
    loadingAssets,
    hasLoadedForLocation,
    loadError,
    loadAssets,
    view,
    searchQuery,
    t
  ]);

  const ListFooterComponent = useCallback(
    () => (
      <>
        <Divider />
        <Button
          icon={'plus-circle'}
          style={{ margin: 20 }}
          mode={'contained'}
          onPress={() => {
            const params = {
              openedFromSelector: true,
              onSuccess: (newAsset) => {
                if (!multiple) {
                  onChange([newAsset]);
                } else {
                  setSelectedIds((prev) => [...prev, newAsset.id]);
                }
              }
            };
            if (multiple) {
              navigation.navigate('AddAsset', params);
            } else {
              navigation.replace('AddAsset', params);
            }
          }}
        >
          {t('create_asset')}
        </Button>
      </>
    ),
    [t, navigation, multiple, onChange]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Searchbar
        placeholder={t('search')}
        accessibilityLabel={t('search')}
        onChangeText={handleSearchChange}
        value={searchQuery}
        style={{ backgroundColor: theme.colors.background, margin: 5 }}
      />
      <SegmentedButtons
        value={view}
        onValueChange={handleViewChange}
        buttons={[
          { value: 'list', label: t('list') },
          { value: 'hierarchy', label: t('hierarchy') }
        ]}
        style={styles.segmentedButtons}
      />
      {view === 'hierarchy' && currentHierarchyParent && (
        <Pressable onPress={navigateHierarchyUp} style={styles.backButton}>
          <Icon source="arrow-left" size={20} color={theme.colors.onSurface} />
          <Text variant="titleMedium">
            {t('back_to')}{' '}
            {assetsMap.get(currentHierarchyParent.parentId ?? -1)?.name ??
              t('top_level')}
          </Text>
        </Pressable>
      )}
      {view === 'list' ? (
        <FlatList
          key="list"
          data={filteredListAssets}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshing={loadingAssets}
          onRefresh={onRefresh}
          ListHeaderComponent={
            loadError && hasLoadedForLocation ? (
              <AsyncStateFeedback
                mode="banner"
                message={t('asset_list_load_error')}
                onRetry={() => void loadAssets()}
              />
            ) : null
          }
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(_data, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index
          })}
        />
      ) : (
        <FlatList
          key="hierarchy"
          data={currentHierarchyLevel}
          renderItem={(item) => renderItem(item, true)}
          keyExtractor={keyExtractor}
          refreshing={loadingAssets}
          onRefresh={onRefresh}
          ListHeaderComponent={
            loadError && hasLoadedForLocation ? (
              <AsyncStateFeedback
                mode="banner"
                message={t('asset_list_load_error')}
                onRetry={() => void loadAssets()}
              />
            ) : null
          }
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(_data, index) => ({
            length: HIERARCHY_ITEM_HEIGHT,
            offset: HIERARCHY_ITEM_HEIGHT * index,
            index
          })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentedButtons: {
    marginHorizontal: 10,
    marginBottom: 10
  },
  card: {
    marginBottom: 1,
    padding: 10,
    height: ITEM_HEIGHT
  },
  cardRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  selectionTarget: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  hierarchyButton: {
    margin: 0
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    flexShrink: 1
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  noResultsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16
  }
});
