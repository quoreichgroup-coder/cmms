import { logSafeError } from '../../utils/safeErrorLog';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { View } from '../../components/Themed';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from '../../store';
import { getCategories, addCategory } from '../../slices/category';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Divider,
  Icon,
  Searchbar,
  Text,
  TextInput
} from 'react-native-paper';
import { useAppTheme } from '../../custom-theme';
import SelectionIndicator from '../../components/SelectionIndicator';

export default function SelectCategoriesModal({
  navigation,
  route
}: RootStackScreenProps<'SelectCategories'>) {
  const { onChange, selected, multiple, type } = route.params;
  const theme = useAppTheme();
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { categories } = useSelector((state) => state.categories);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [showCreateInput, setShowCreateInput] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const currentCategories = categories[type] ?? [];
  const selectedCategories = React.useMemo(
    () =>
      selectedIds.flatMap((id) =>
        currentCategories.filter((category) => category.id === id)
      ),
    [selectedIds, currentCategories]
  );

  useEffect(() => {
    if (!selectedIds.length) setSelectedIds(selected);
  }, [selected]);

  useEffect(() => {
    if (multiple)
      navigation.setOptions({
        headerRight: () => (
          <Pressable
            disabled={!selectedCategories.length}
            accessibilityRole="button"
            accessibilityLabel={`${t('add')} (${selectedCategories.length})`}
            accessibilityState={{ disabled: !selectedCategories.length }}
            onPress={() => {
              onChange(selectedCategories);
              navigation.goBack();
            }}
          >
            <Text variant="titleMedium">{t('add')}</Text>
          </Pressable>
        )
      });
  }, [selectedCategories, navigation, onChange, t]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      await dispatch(getCategories(type));
    } catch (_error) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [dispatch, type]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const filteredCategories = React.useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
    if (!normalizedSearch) return currentCategories;
    return currentCategories.filter((category) =>
      category.name.toLocaleLowerCase().includes(normalizedSearch)
    );
  }, [currentCategories, searchQuery]);

  const toggle = (id: number) => {
    if (multiple) {
      setSelectedIds((previous) =>
        previous.includes(id)
          ? previous.filter((selectedId) => selectedId !== id)
          : [...previous, id]
      );
      return;
    }
    const category = currentCategories.find((item) => item.id === id);
    if (category) onChange([category]);
    navigation.goBack();
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreating(true);
    try {
      const createdCategory = await dispatch(
        addCategory({ name: newCategoryName.trim() }, type)
      );
      setSelectedIds((prev) => [...prev, createdCategory.id]);
      if (!multiple) {
        onChange([createdCategory]);
        navigation.goBack();
      }
      setNewCategoryName('');
      setCreateError(false);
      setShowCreateInput(false);
    } catch (err) {
      logSafeError('Error creating category:', err);
      setCreateError(true);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Searchbar
        placeholder={t('search')}
        accessibilityLabel={t('search')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={{ backgroundColor: theme.colors.background }}
      />
      <FlatList
        data={filteredCategories}
        keyExtractor={(category) => String(category.id)}
        refreshing={loading}
        onRefresh={loadCategories}
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        ListHeaderComponent={
          loadError && currentCategories.length > 0 ? (
            <View style={styles.loadErrorBanner} accessibilityRole="alert">
              <Text style={{ color: theme.colors.error, flex: 1 }}>
                {t('category_load_failed')}
              </Text>
              <Button compact onPress={loadCategories}>
                {t('retry')}
              </Button>
            </View>
          ) : null
        }
        renderItem={({ item: category }) => (
          <TouchableOpacity
            onPress={() => {
              toggle(category.id);
            }}
            accessibilityRole={multiple ? 'checkbox' : 'button'}
            accessibilityLabel={category.name}
            accessibilityState={
              multiple
                ? { checked: selectedIds.includes(category.id) }
                : { selected: selectedIds.includes(category.id) }
            }
            key={category.id}
          >
            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.cardRow}>
                <Avatar.Icon
                  size={50}
                  icon="shape-outline"
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={styles.cardTitle}>
                        {category.name}
                      </Text>
                      <Text
                        variant={'bodySmall'}
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >{`#${category.id}`}</Text>
                    </View>
                    {multiple ? (
                      <SelectionIndicator
                        checked={selectedIds.includes(category.id)}
                        color={theme.colors.primary}
                        uncheckedColor={theme.colors.controlOutline}
                      />
                    ) : selectedIds.includes(category.id) ? (
                      <Icon
                        source="check-circle"
                        size={24}
                        color={theme.colors.primary}
                      />
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              style={styles.emptyState}
              color={theme.colors.primary}
              accessibilityLabel={t('loading')}
            />
          ) : loadError ? (
            <View style={styles.emptyState} accessibilityRole="alert">
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {t('category_load_failed')}
              </Text>
              <Button onPress={loadCategories}>{t('retry')}</Button>
            </View>
          ) : (
            <Text
              style={[
                styles.emptyState,
                { color: theme.colors.onSurfaceVariant }
              ]}
            >
              {searchQuery ? t('no_results') : t('no_categories')}
            </Text>
          )
        }
        ListFooterComponent={
          <>
            <Divider />
            {showCreateInput ? (
              <View style={styles.createContainer}>
                <TextInput
                  mode="outlined"
                  placeholder={t('name')}
                  value={newCategoryName}
                  onChangeText={(value) => {
                    setNewCategoryName(value);
                    setCreateError(false);
                  }}
                  style={styles.createInput}
                  disabled={isCreating}
                  error={createError}
                  autoFocus
                />
                {createError && (
                  <Text
                    accessibilityRole="alert"
                    style={{ color: theme.colors.error, marginBottom: 12 }}
                  >
                    {t('category_create_failed')}
                  </Text>
                )}
                <View style={styles.createActions}>
                  <Button
                    mode="text"
                    onPress={() => {
                      setNewCategoryName('');
                      setCreateError(false);
                      setShowCreateInput(false);
                    }}
                    disabled={isCreating}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleCreateCategory}
                    loading={isCreating}
                    disabled={isCreating || !newCategoryName.trim()}
                  >
                    {t('save')}
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                icon="plus-circle"
                style={{ margin: 20 }}
                mode="contained"
                onPress={() => setShowCreateInput(true)}
              >
                {t('create_category')}
              </Button>
            )}
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  card: {
    marginBottom: 1,
    padding: 10
  },
  cardRow: {
    display: 'flex',
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
  createContainer: {
    padding: 20
  },
  createInput: {
    marginBottom: 10
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10
  },
  emptyState: {
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8
  },
  loadErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    padding: 12
  }
});
