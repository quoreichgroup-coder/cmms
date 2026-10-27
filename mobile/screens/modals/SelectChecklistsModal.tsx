import { FlatList, Pressable, StyleSheet } from 'react-native';
import { View } from '../../components/Themed';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Avatar,
  Searchbar,
  Text,
  useTheme
} from 'react-native-paper';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import { getTaskFromTaskBase } from '../../utils/formatters';
import { getChecklists } from '../../slices/checklist';
import { useDispatch, useSelector } from '../../store';
import useAuth from '../../hooks/useAuth';
import { PlanFeature } from '../../models/subscriptionPlan';

export default function SelectChecklistsModal({
  navigation,
  route
}: RootStackScreenProps<'SelectChecklists'>) {
  const { onChange, selected } = route.params;
  const theme = useTheme();
  const { t }: { t: any } = useTranslation();
  const { hasFeature } = useAuth();
  const hasChecklistFeature = hasFeature(PlanFeature.CHECKLIST);
  const dispatch = useDispatch();
  const { checklists } = useSelector((state) => state.checklists);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const loadChecklists = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError(false);
    try {
      await dispatch(getChecklists());
    } catch (_error) {
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (hasChecklistFeature) void loadChecklists();
  }, [hasChecklistFeature, loadChecklists]);

  if (!hasChecklistFeature) {
    return (
      <AsyncStateFeedback
        mode="permissionDenied"
        message={t('checklist_feature_unavailable')}
      />
    );
  }

  const normalizedSearch = searchQuery.toLowerCase().trim();
  const filteredChecklists = checklists.filter((checklist) =>
    checklist.name.toLowerCase().includes(normalizedSearch)
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
      {loadError && checklists.length > 0 ? (
        <AsyncStateFeedback
          mode="banner"
          message={t('checklists_load_error')}
          onRetry={() => void loadChecklists()}
        />
      ) : null}
      <FlatList
        data={filteredChecklists}
        keyExtractor={(checklist) => String(checklist.id)}
        refreshing={loading}
        onRefresh={loadChecklists}
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        renderItem={({ item: checklist }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={checklist.name}
            onPress={() => {
              onChange([
                ...selected,
                ...checklist.taskBases.map((taskBase) =>
                  getTaskFromTaskBase(taskBase)
                )
              ]);
              navigation.pop(2);
            }}
          >
            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.cardRow}>
                <Avatar.Icon
                  size={50}
                  icon="format-list-checks"
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                  color={theme.colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    {checklist.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >{`#${checklist.id}`}</Text>
                </View>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {checklist.taskBases.length}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading && !checklists.length ? (
            <ActivityIndicator
              animating
              accessibilityLabel={t('loading')}
              style={{ marginTop: 24 }}
            />
          ) : loadError && !checklists.length ? (
            <AsyncStateFeedback
              mode="error"
              message={t('checklists_load_error')}
              onRetry={() => void loadChecklists()}
            />
          ) : filteredChecklists.length === 0 ? (
            <Text
              accessibilityRole="alert"
              style={{
                textAlign: 'center',
                marginTop: 24,
                color: theme.colors.onSurfaceVariant
              }}
            >
              {checklists.length
                ? t('no_results_found')
                : t('no_checklists_available')}
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
  cardRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  cardTitle: {
    fontWeight: 'bold',
    flexShrink: 1
  }
});
