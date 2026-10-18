import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions
} from 'react-native';
import { View } from '../../components/Themed';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TabBar, TabView } from 'react-native-tab-view';
import { useDispatch, useSelector } from '../../store';
import { PartMiniDTO } from '../../models/part';
import { getPartsMini } from '../../slices/part';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Searchbar,
  Text
} from 'react-native-paper';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { getMultiPartsMini } from '../../slices/multipart';
import SetType from '../../models/setType';
import SelectionIndicator from '../../components/SelectionIndicator';

const PartItem = React.memo(
  ({
    part,
    isSelected,
    onToggle,
    onNavigate,
    formattedCost
  }: {
    part: PartMiniDTO;
    isSelected: boolean;
    onToggle: (id: number) => void;
    onNavigate: (id: number) => void;
    formattedCost: string;
  }) => {
    const theme = useAppTheme();
    const { t } = useTranslation();

    const handleToggle = useCallback(
      () => onToggle(part.id),
      [part.id, onToggle]
    );
    const handleNavigate = useCallback(
      () => onNavigate(part.id),
      [part.id, onNavigate]
    );

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardRow}>
          <Pressable
            onPress={handleToggle}
            accessibilityRole="checkbox"
            accessibilityLabel={part.name}
            accessibilityState={{ checked: isSelected }}
            style={styles.selectionTarget}
          >
            <SelectionIndicator
              checked={isSelected}
              color={theme.colors.primary}
              uncheckedColor={theme.colors.controlOutline}
            />
            <Avatar.Icon
              size={50}
              icon="archive-outline"
              style={{ backgroundColor: theme.colors.primaryContainer }}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={2}
                    variant="titleMedium"
                    style={styles.cardTitle}
                  >
                    {part.name}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {formattedCost}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
          <Button
            mode="text"
            onPress={handleNavigate}
            accessibilityLabel={`${t('details')}: ${part.name}`}
            style={{ marginRight: 8 }}
          >
            {t('details')}
          </Button>
        </View>
      </View>
    );
  }
);

const SelectorEmptyState = ({ message }: { message: string }) => {
  const theme = useAppTheme();
  return (
    <View style={styles.emptyState} accessibilityRole="text">
      <Text style={{ color: theme.colors.onSurfaceVariant }}>{message}</Text>
    </View>
  );
};

const SetItem = React.memo(
  ({
    multiPart,
    isSelected,
    onToggle
  }: {
    multiPart: SetType;
    isSelected: boolean;
    onToggle: (multiPart: SetType, checked: boolean) => void;
  }) => {
    const theme = useAppTheme();
    const handleToggle = useCallback(
      () => onToggle(multiPart, isSelected),
      [multiPart, isSelected, onToggle]
    );

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Pressable
          onPress={handleToggle}
          accessibilityRole="checkbox"
          accessibilityLabel={multiPart.name}
          accessibilityState={{ checked: isSelected }}
          style={styles.cardRow}
        >
          <Avatar.Icon
            size={50}
            icon="archive-outline"
            style={{ backgroundColor: theme.colors.primaryContainer }}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  {multiPart.name}
                </Text>
              </View>
              <SelectionIndicator
                checked={isSelected}
                color={theme.colors.primary}
                uncheckedColor={theme.colors.controlOutline}
              />
            </View>
          </View>
        </Pressable>
      </View>
    );
  }
);

const PartsRoute = React.memo(
  ({
    toggle,
    partsMini,
    loading,
    loadError,
    onRetry,
    navigation,
    selectedIds
  }: {
    toggle: (id: number) => void;
    partsMini: PartMiniDTO[];
    loading: boolean;
    loadError: boolean;
    onRetry: () => void;
    selectedIds: number[];
    navigation: any;
  }) => {
    const { getFormattedCurrency } = useContext(CompanySettingsContext);
    const { t } = useTranslation();
    const theme = useAppTheme();
    const [searchQuery, setSearchQuery] = useState<string>('');

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const filteredParts = useMemo(
      () =>
        partsMini.filter((part) =>
          part.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        ),
      [partsMini, searchQuery]
    );

    const handleNavigate = useCallback(
      (id: number) => navigation.navigate('PartDetails', { id }),
      [navigation]
    );

    const renderItem = useCallback(
      ({ item }: { item: PartMiniDTO }) => (
        <PartItem
          part={item}
          isSelected={selectedSet.has(item.id)}
          onToggle={toggle}
          onNavigate={handleNavigate}
          formattedCost={getFormattedCurrency(item.cost)}
        />
      ),
      [selectedSet, toggle, handleNavigate, getFormattedCurrency]
    );

    const keyExtractor = useCallback(
      (item: PartMiniDTO) => String(item.id),
      []
    );

    return (
      <View style={{ flex: 1 }}>
        <Searchbar
          placeholder={t('search')}
          accessibilityLabel={t('search')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={{ backgroundColor: theme.colors.background }}
        />
        {loadError && partsMini.length > 0 ? (
          <AsyncStateFeedback
            mode="banner"
            message={t('parts_load_error')}
            onRetry={onRetry}
          />
        ) : null}
        {loading && partsMini.length > 0 ? (
          <ActivityIndicator
            style={styles.refreshIndicator}
            accessibilityRole="progressbar"
            accessibilityLabel={t('loading')}
          />
        ) : null}
        {loadError && partsMini.length === 0 ? (
          <AsyncStateFeedback
            mode="error"
            message={t('parts_load_error')}
            onRetry={onRetry}
          />
        ) : loading && partsMini.length === 0 ? (
          <AsyncStateFeedback mode="loading" message={t('loading')} />
        ) : (
          <FlatList
            data={filteredParts}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            removeClippedSubviews={true}
            ListEmptyComponent={
              <SelectorEmptyState
                message={searchQuery.trim() ? t('no_results') : t('no_parts')}
              />
            }
            getItemLayout={(_data, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index
            })}
          />
        )}
      </View>
    );
  }
);

const SetsRoute = React.memo(
  ({
    toggle,
    multiParts,
    loading,
    loadError,
    onRetry,
    selectedIds
  }: {
    toggle: (multiPart: SetType, checked: boolean) => void;
    multiParts: SetType[];
    loading: boolean;
    loadError: boolean;
    onRetry: () => void;
    selectedIds: number[];
  }) => {
    const { t } = useTranslation();
    const theme = useAppTheme();
    const [searchQuery, setSearchQuery] = useState<string>('');

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    // A set is "selected" when every one of its parts is in selectedIds
    const selectedMultiPartIds = useMemo(
      () =>
        new Set(
          multiParts
            .filter(
              (mp) =>
                mp.parts.length > 0 &&
                mp.parts.every((p) => selectedSet.has(p.id))
            )
            .map((mp) => mp.id)
        ),
      [multiParts, selectedSet]
    );

    const filteredMultiParts = useMemo(
      () =>
        multiParts.filter((mp) =>
          mp.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        ),
      [multiParts, searchQuery]
    );

    const renderItem = useCallback(
      ({ item }: { item: SetType }) => (
        <SetItem
          multiPart={item}
          isSelected={selectedMultiPartIds.has(item.id)}
          onToggle={toggle}
        />
      ),
      [selectedMultiPartIds, toggle]
    );

    const keyExtractor = useCallback((item: SetType) => String(item.id), []);

    return (
      <View style={{ flex: 1 }}>
        <Searchbar
          placeholder={t('search')}
          accessibilityLabel={t('search')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={{ backgroundColor: theme.colors.background }}
        />
        {loadError && multiParts.length > 0 ? (
          <AsyncStateFeedback
            mode="banner"
            message={t('multi_parts_load_error')}
            onRetry={onRetry}
          />
        ) : null}
        {loading && multiParts.length > 0 ? (
          <ActivityIndicator
            style={styles.refreshIndicator}
            accessibilityRole="progressbar"
            accessibilityLabel={t('loading')}
          />
        ) : null}
        {loadError && multiParts.length === 0 ? (
          <AsyncStateFeedback
            mode="error"
            message={t('multi_parts_load_error')}
            onRetry={onRetry}
          />
        ) : loading && multiParts.length === 0 ? (
          <AsyncStateFeedback mode="loading" message={t('loading')} />
        ) : (
          <FlatList
            data={filteredMultiParts}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            removeClippedSubviews={true}
            ListEmptyComponent={
              <SelectorEmptyState
                message={
                  searchQuery.trim()
                    ? t('no_results')
                    : t('no_part_sets_available')
                }
              />
            }
            getItemLayout={(_data, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index
            })}
          />
        )}
      </View>
    );
  }
);

const ITEM_HEIGHT = 78;

export default function SelectParts({
  navigation,
  route
}: RootStackScreenProps<'SelectParts'>) {
  const { onChange, selected } = route.params;
  const theme = useAppTheme();
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { partsMini, partsMiniLoading } = useSelector((state) => state.parts);
  const { miniMultiParts: multiParts, loadingMultiparts } = useSelector(
    (state) => state.multiParts
  );
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [partsLoadError, setPartsLoadError] = useState(false);
  const [setsLoadError, setSetsLoadError] = useState(false);
  const layout = useWindowDimensions();

  const loadPartsMini = useCallback(async () => {
    setPartsLoadError(false);
    try {
      await dispatch(getPartsMini());
    } catch (_error) {
      setPartsLoadError(true);
    }
  }, [dispatch]);

  const loadSetsMini = useCallback(async () => {
    setSetsLoadError(false);
    try {
      await dispatch(getMultiPartsMini());
    } catch (_error) {
      setSetsLoadError(true);
    }
  }, [dispatch]);

  const [tabs] = useState([
    { key: 'parts', title: t('parts') },
    { key: 'sets', title: t('sets_of_parts') }
  ]);

  const selectedParts = useMemo(() => {
    if (!partsMini.length) return [];
    const partMap = new Map(partsMini.map((p) => [p.id, p]));
    return selectedIds.flatMap((id) => {
      const part = partMap.get(id);
      return part ? [part] : [];
    });
  }, [selectedIds, partsMini]);

  useEffect(() => {
    if (!selectedIds.length) setSelectedIds(selected);
  }, [selected]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          disabled={!selectedParts.length}
          accessibilityRole="button"
          accessibilityLabel={`${t('add')} (${selectedParts.length})`}
          accessibilityState={{ disabled: !selectedParts.length }}
          onPress={() => {
            onChange(selectedParts);
            navigation.goBack();
          }}
        >
          <Text variant="titleMedium">{t('add')}</Text>
        </Pressable>
      )
    });
  }, [selectedParts, navigation, onChange, t]);

  useEffect(() => {
    void loadPartsMini();
    void loadSetsMini();
  }, [loadPartsMini, loadSetsMini]);

  const onSelect = useCallback((ids: number[]) => {
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  }, []);

  const onUnSelect = useCallback((ids: number[]) => {
    const removeSet = new Set(ids);
    setSelectedIds((prev) => prev.filter((id) => !removeSet.has(id)));
  }, []);

  const toggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }, []);

  const toggleMultipart = useCallback(
    (multiPart: SetType, isCurrentlyChecked: boolean) => {
      const ids = multiPart.parts.map((p) => p.id);
      if (isCurrentlyChecked) {
        onUnSelect(ids);
      } else {
        onSelect(ids);
      }
    },
    [onSelect, onUnSelect]
  );

  const renderScene = useCallback(
    ({ route: sceneRoute }) => {
      switch (sceneRoute.key) {
        case 'parts':
          return (
            <PartsRoute
              toggle={toggle}
              navigation={navigation}
              partsMini={partsMini}
              loading={partsMiniLoading}
              loadError={partsLoadError}
              onRetry={loadPartsMini}
              selectedIds={selectedIds}
            />
          );
        case 'sets':
          return (
            <SetsRoute
              toggle={toggleMultipart}
              multiParts={multiParts}
              loading={loadingMultiparts}
              loadError={setsLoadError}
              onRetry={loadSetsMini}
              selectedIds={selectedIds}
            />
          );
      }
    },
    [toggle, toggleMultipart, navigation, partsMini, multiParts, selectedIds]
  );

  const renderTabBar = useCallback(
    (props) => (
      <TabBar
        {...props}
        indicatorStyle={{ backgroundColor: theme.colors.onPrimary }}
        style={{ backgroundColor: theme.colors.primary }}
      />
    ),
    [theme.colors.primary]
  );

  return (
    <View
      style={{ ...styles.container, backgroundColor: theme.colors.background }}
    >
      <TabView
        style={{ flex: 1 }}
        renderTabBar={renderTabBar}
        navigationState={{ index: tabIndex, routes: tabs }}
        renderScene={renderScene}
        onIndexChange={setTabIndex}
        initialLayout={{ width: layout.width }}
        lazy
      />
      <Button
        icon={'plus-circle'}
        style={{ margin: 20 }}
        mode={'contained'}
        onPress={() => {
          navigation.navigate('AddPart', {
            openedFromSelector: true,
            onSuccess: (newPart) => {
              setSelectedIds((prev) => [...prev, newPart.id]);
            }
          });
        }}
      >
        {t('create_part')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    marginBottom: 1,
    padding: 10,
    height: ITEM_HEIGHT
  },
  cardRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  selectionTarget: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontWeight: 'bold',
    flexShrink: 1
  },
  emptyState: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    padding: qpmLayoutTokens.space.xl
  },
  refreshIndicator: {
    alignSelf: 'center',
    marginVertical: qpmLayoutTokens.space.sm
  }
});
