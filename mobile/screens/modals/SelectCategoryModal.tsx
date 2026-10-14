import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { View } from '../../components/Themed';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from '../../store';
import { getCategories, addCategory } from '../../slices/category';
import { Avatar, Button, Divider, Text, TextInput } from 'react-native-paper';
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

  useEffect(() => {
    dispatch(getCategories(type));
  }, []);

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
      console.error('Error creating category:', err);
      setCreateError(true);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        // refreshControl={
        //   <RefreshControl refreshing={loadingGet} onRefresh={() => dispatch(getCategories())} />}
        style={{
          flex: 1,
          backgroundColor: theme.colors.background
        }}
      >
        {currentCategories.map((category) => (
          <TouchableOpacity
            onPress={() => {
              toggle(category.id);
            }}
            accessibilityRole={multiple ? 'checkbox' : 'button'}
            accessibilityLabel={category.name}
            accessibilityState={
              multiple
                ? { checked: selectedIds.includes(category.id) }
                : undefined
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
                    {multiple && (
                      <SelectionIndicator
                        checked={selectedIds.includes(category.id)}
                        color={theme.colors.primary}
                        uncheckedColor={theme.colors.controlOutline}
                      />
                    )}
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
            icon={'plus-circle'}
            style={{ margin: 20 }}
            mode={'contained'}
            onPress={() => setShowCreateInput(true)}
          >
            {t('create_category')}
          </Button>
        )}
      </ScrollView>
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
  }
});
