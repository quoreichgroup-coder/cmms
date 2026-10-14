import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet
} from 'react-native';
import { View } from '../../components/Themed';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from '../../store';
import { getMetersMini } from '../../slices/meter';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Searchbar,
  Text
} from 'react-native-paper';
import { useAppTheme } from '../../custom-theme';
import SelectionIndicator from '../../components/SelectionIndicator';

export default function SelectMetersModal({
  navigation,
  route
}: RootStackScreenProps<'SelectMeters'>) {
  const { onChange, selected, multiple } = route.params;
  const theme = useAppTheme();
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { metersMini } = useSelector((state) => state.meters);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const selectedMeters = React.useMemo(
    () =>
      selectedIds.flatMap((id) =>
        metersMini.filter((meter) => meter.id === id)
      ),
    [selectedIds, metersMini]
  );

  const loadMeters = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      await dispatch(getMetersMini());
    } catch (_error) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!selectedIds.length) setSelectedIds(selected);
  }, [selected]);

  useEffect(() => {
    if (multiple)
      navigation.setOptions({
        headerRight: () => (
          <Pressable
            disabled={!selectedMeters.length}
            accessibilityRole="button"
            accessibilityLabel={`${t('add')} (${selectedMeters.length})`}
            accessibilityState={{ disabled: !selectedMeters.length }}
            onPress={() => {
              onChange(selectedMeters);
              navigation.goBack();
            }}
          >
            <Text variant="titleMedium">{t('add')}</Text>
          </Pressable>
        )
      });
  }, [selectedMeters, navigation, onChange, t]);

  useEffect(() => {
    void loadMeters();
  }, [loadMeters]);

  const toggle = (id: number) => {
    if (multiple) {
      setSelectedIds((previous) =>
        previous.includes(id)
          ? previous.filter((selectedId) => selectedId !== id)
          : [...previous, id]
      );
      return;
    }
    const meter = metersMini.find((item) => item.id === id);
    if (meter) onChange([meter]);
    navigation.goBack();
  };

  const normalizedSearch = searchQuery.toLowerCase().trim();
  const filteredMeters = metersMini.filter((meter) =>
    meter.name.toLowerCase().includes(normalizedSearch)
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Searchbar
        placeholder={t('search')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={{ backgroundColor: theme.colors.background }}
      />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadMeters} />
        }
        style={{
          flex: 1,
          backgroundColor: theme.colors.background
        }}
      >
        {loading && !metersMini.length ? (
          <ActivityIndicator
            animating
            accessibilityLabel={t('loading')}
            style={{ marginTop: 24 }}
          />
        ) : (
          filteredMeters.map((meter) => (
            <View
              key={meter.id}
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <Pressable
                onPress={() => {
                  toggle(meter.id);
                }}
                accessibilityRole={multiple ? 'checkbox' : 'button'}
                accessibilityLabel={`${meter.name}, #${meter.id}`}
                accessibilityState={
                  multiple
                    ? { checked: selectedIds.includes(meter.id) }
                    : undefined
                }
                style={styles.selectionTarget}
              >
                {multiple && (
                  <SelectionIndicator
                    checked={selectedIds.includes(meter.id)}
                    color={theme.colors.primary}
                    uncheckedColor={theme.colors.controlOutline}
                  />
                )}
                <Avatar.Icon
                  size={50}
                  icon="gauge"
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={styles.cardTitle}>
                        {meter.name}
                      </Text>
                      <Text
                        variant={'bodySmall'}
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >{`#${meter.id}`}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </View>
          ))
        )}
        {loadError && (
          <View style={styles.messageContainer}>
            <Text
              accessibilityRole="alert"
              style={{ color: theme.colors.error, textAlign: 'center' }}
            >
              {t('an_error_occured')}
            </Text>
            <Button
              mode="text"
              onPress={loadMeters}
              accessibilityLabel={t('retry')}
              style={{ marginTop: 4 }}
            >
              {t('retry')}
            </Button>
          </View>
        )}
        {!loading && !loadError && filteredMeters.length === 0 && (
          <Text
            accessibilityRole="alert"
            style={{
              textAlign: 'center',
              marginTop: 24,
              color: theme.colors.onSurfaceVariant
            }}
          >
            {metersMini.length
              ? t('no_results_found')
              : t('no_meters_available')}
          </Text>
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
  selectionTarget: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    minHeight: 58
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
  messageContainer: {
    alignItems: 'center',
    padding: 20
  }
});
