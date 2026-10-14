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
import {
  ActivityIndicator,
  Avatar,
  Button,
  Searchbar,
  Text,
  useTheme
} from 'react-native-paper';
import { getTaskFromTaskBase } from '../../utils/formatters';
import { getChecklists } from '../../slices/checklist';
import { useDispatch, useSelector } from '../../store';

export default function SelectChecklistsModal({
  navigation,
  route
}: RootStackScreenProps<'SelectChecklists'>) {
  const { onChange, selected } = route.params;
  const theme = useTheme();
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { loadingGet, checklists } = useSelector((state) => state.checklists);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState(false);

  const loadChecklists = useCallback(async () => {
    setLoadError(false);
    try {
      await dispatch(getChecklists());
    } catch (_error) {
      setLoadError(true);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadChecklists();
  }, [loadChecklists]);

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
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={{ backgroundColor: theme.colors.background }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        refreshControl={
          <RefreshControl refreshing={loadingGet} onRefresh={loadChecklists} />
        }
      >
        {loadingGet && !checklists.length ? (
          <ActivityIndicator
            animating
            accessibilityLabel={t('loading')}
            style={{ marginTop: 24 }}
          />
        ) : (
          filteredChecklists.map((checklist) => (
            <Pressable
              key={checklist.id}
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
              onPress={loadChecklists}
              accessibilityLabel={t('retry')}
            >
              {t('retry')}
            </Button>
          </View>
        )}
        {!loadingGet && !loadError && filteredChecklists.length === 0 && (
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
    flexDirection: 'row',
    gap: 6,
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
