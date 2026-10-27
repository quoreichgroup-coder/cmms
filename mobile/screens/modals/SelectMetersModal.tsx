import { FlatList, Pressable, StyleSheet } from 'react-native';
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
  Icon,
  Searchbar,
  Text
} from 'react-native-paper';
import { useAppTheme } from '../../custom-theme';
import SelectionIndicator from '../../components/SelectionIndicator';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import useAuth from '../../hooks/useAuth';
import { PlanFeature } from '../../models/subscriptionPlan';

export default function SelectMetersModal({
  navigation,
  route
}: RootStackScreenProps<'SelectMeters'>) {
  const { onChange, selected, multiple } = route.params;
  const theme = useAppTheme();
  const { t }: { t: any } = useTranslation();
  const { hasFeature } = useAuth();
  const hasMeterFeature = hasFeature(PlanFeature.METER);
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
    if (hasMeterFeature) void loadMeters();
  }, [hasMeterFeature, loadMeters]);

  if (!hasMeterFeature) {
    return (
      <AsyncStateFeedback
        mode="permissionDenied"
        message={t('meter_feature_unavailable')}
      />
    );
  }

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
        accessibilityLabel={t('search')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={{ backgroundColor: theme.colors.background }}
      />
      {loadError && metersMini.length > 0 ? (
        <AsyncStateFeedback
          mode="banner"
          message={t('meters_load_error')}
          onRetry={() => void loadMeters()}
        />
      ) : null}
      <FlatList
        data={filteredMeters}
        keyExtractor={(meter) => String(meter.id)}
        refreshing={loading}
        onRefresh={loadMeters}
        style={{
          flex: 1,
          backgroundColor: theme.colors.background
        }}
        renderItem={({ item: meter }) => (
          <View
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
                  : { selected: selectedIds.includes(meter.id) }
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
              {!multiple && selectedIds.includes(meter.id) && (
                <Icon
                  source="check-circle"
                  size={24}
                  color={theme.colors.primary}
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
        )}
        ListEmptyComponent={
          loading && !metersMini.length ? (
            <ActivityIndicator
              animating
              accessibilityLabel={t('loading')}
              style={{ marginTop: 24 }}
            />
          ) : loadError && !metersMini.length ? (
            <AsyncStateFeedback
              mode="error"
              message={t('meters_load_error')}
              onRetry={() => void loadMeters()}
            />
          ) : !loading && !loadError && filteredMeters.length === 0 ? (
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
          ) : null
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
  }
});
