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
import { getVendorsMini } from '../../slices/vendor';
import { ActivityIndicator, Avatar, Searchbar, Text } from 'react-native-paper';
import { useAppTheme } from '../../custom-theme';
import SelectionIndicator from '../../components/SelectionIndicator';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';

export default function SelectVendorsModal({
  navigation,
  route
}: RootStackScreenProps<'SelectVendors'>) {
  const { onChange, selected, multiple } = route.params;
  const theme = useAppTheme();
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { vendorsMini } = useSelector((state) => state.vendors);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const selectedVendors = React.useMemo(
    () =>
      selectedIds.flatMap((id) =>
        vendorsMini.filter((vendor) => vendor.id === id)
      ),
    [selectedIds, vendorsMini]
  );

  useEffect(() => {
    if (!selectedIds.length) setSelectedIds(selected);
  }, [selected]);

  useEffect(() => {
    if (multiple)
      navigation.setOptions({
        headerRight: () => (
          <Pressable
            disabled={!selectedVendors.length}
            accessibilityRole="button"
            accessibilityLabel={`${t('add')} (${selectedVendors.length})`}
            accessibilityState={{ disabled: !selectedVendors.length }}
            onPress={() => {
              onChange(selectedVendors);
              navigation.goBack();
            }}
          >
            <Text variant="titleMedium">{t('add')}</Text>
          </Pressable>
        )
      });
  }, [selectedVendors, navigation, onChange, t]);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      await dispatch(getVendorsMini());
    } catch (_error) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  const toggle = (id: number) => {
    if (multiple) {
      setSelectedIds((previous) =>
        previous.includes(id)
          ? previous.filter((selectedId) => selectedId !== id)
          : [...previous, id]
      );
      return;
    }
    const vendor = vendorsMini.find((item) => item.id === id);
    if (vendor) onChange([vendor]);
    navigation.goBack();
  };

  const normalizedSearch = searchQuery.toLowerCase().trim();
  const filteredVendors = vendorsMini.filter((vendor) =>
    vendor.companyName.toLowerCase().includes(normalizedSearch)
  );

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
        data={filteredVendors}
        keyExtractor={(vendor) => String(vendor.id)}
        refreshing={loading}
        onRefresh={loadVendors}
        ListHeaderComponent={
          loadError && vendorsMini.length > 0 ? (
            <AsyncStateFeedback
              mode="banner"
              message={t('an_error_occured')}
              onRetry={() => void loadVendors()}
            />
          ) : null
        }
        style={{
          flex: 1,
          backgroundColor: theme.colors.background
        }}
        renderItem={({ item: vendor }) => (
          <TouchableOpacity
            onPress={() => {
              toggle(vendor.id);
            }}
            accessibilityRole={multiple ? 'checkbox' : 'button'}
            accessibilityLabel={vendor.companyName}
            accessibilityState={
              multiple
                ? { checked: selectedIds.includes(vendor.id) }
                : undefined
            }
            key={vendor.id}
          >
            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.cardRow}>
                <Avatar.Icon
                  size={50}
                  icon="truck-outline"
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={styles.cardTitle}>
                        {vendor.companyName}
                      </Text>
                      <Text
                        variant={'bodySmall'}
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >{`#${vendor.id}`}</Text>
                    </View>
                    {multiple && (
                      <SelectionIndicator
                        checked={selectedIds.includes(vendor.id)}
                        color={theme.colors.primary}
                        uncheckedColor={theme.colors.controlOutline}
                      />
                    )}
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            vendorsMini.length ? null : (
              <ActivityIndicator
                animating
                accessibilityLabel={t('loading')}
                style={{ marginTop: 24 }}
              />
            )
          ) : loadError && vendorsMini.length === 0 ? (
            <AsyncStateFeedback
              mode="error"
              message={t('an_error_occured')}
              onRetry={() => void loadVendors()}
            />
          ) : (
            <Text
              accessibilityRole="alert"
              style={{
                textAlign: 'center',
                marginTop: 24,
                color: theme.colors.onSurfaceVariant
              }}
            >
              {vendorsMini.length
                ? t('no_results_found')
                : t('no_vendors_available')}
            </Text>
          )
        }
        keyboardShouldPersistTaps="handled"
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
  }
});
