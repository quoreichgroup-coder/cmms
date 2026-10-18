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
import { getTeamsMini } from '../../slices/team';
import { ActivityIndicator, Avatar, Searchbar, Text } from 'react-native-paper';
import { useAppTheme } from '../../custom-theme';
import SelectionIndicator from '../../components/SelectionIndicator';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';

export default function SelectTeamsModal({
  navigation,
  route
}: RootStackScreenProps<'SelectTeams'>) {
  const { onChange, selected, multiple } = route.params;
  const theme = useAppTheme();
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { teamsMini } = useSelector((state) => state.teams);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const selectedTeams = React.useMemo(
    () =>
      selectedIds.flatMap((id) => teamsMini.filter((team) => team.id === id)),
    [selectedIds, teamsMini]
  );

  useEffect(() => {
    if (!selectedIds.length) setSelectedIds(selected);
  }, [selected]);

  useEffect(() => {
    if (multiple)
      navigation.setOptions({
        headerRight: () => (
          <Pressable
            disabled={!selectedTeams.length}
            accessibilityRole="button"
            accessibilityLabel={`${t('add')} (${selectedTeams.length})`}
            accessibilityState={{ disabled: !selectedTeams.length }}
            onPress={() => {
              onChange(selectedTeams);
              navigation.goBack();
            }}
          >
            <Text variant="titleMedium">{t('add')}</Text>
          </Pressable>
        )
      });
  }, [selectedTeams, navigation, onChange, t]);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      await dispatch(getTeamsMini());
    } catch (_error) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const toggle = (id: number) => {
    if (multiple) {
      setSelectedIds((previous) =>
        previous.includes(id)
          ? previous.filter((selectedId) => selectedId !== id)
          : [...previous, id]
      );
      return;
    }
    const team = teamsMini.find((item) => item.id === id);
    if (team) onChange([team]);
    navigation.goBack();
  };

  const normalizedSearch = searchQuery.toLowerCase().trim();
  const filteredTeams = teamsMini.filter((team) =>
    team.name.toLowerCase().includes(normalizedSearch)
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
        data={filteredTeams}
        keyExtractor={(team) => String(team.id)}
        refreshing={loading}
        onRefresh={loadTeams}
        ListHeaderComponent={
          loadError && teamsMini.length > 0 ? (
            <AsyncStateFeedback
              mode="banner"
              message={t('an_error_occured')}
              onRetry={() => void loadTeams()}
            />
          ) : null
        }
        style={{
          flex: 1,
          backgroundColor: theme.colors.background
        }}
        renderItem={({ item: team }) => (
          <TouchableOpacity
            onPress={() => {
              toggle(team.id);
            }}
            accessibilityRole={multiple ? 'checkbox' : 'button'}
            accessibilityLabel={team.name}
            accessibilityState={
              multiple ? { checked: selectedIds.includes(team.id) } : undefined
            }
            key={team.id}
          >
            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.cardRow}>
                <Avatar.Icon
                  size={50}
                  icon="account-group-outline"
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={styles.cardTitle}>
                        {team.name}
                      </Text>
                      <Text
                        variant={'bodySmall'}
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >{`#${team.id}`}</Text>
                    </View>
                    {multiple && (
                      <SelectionIndicator
                        checked={selectedIds.includes(team.id)}
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
            teamsMini.length ? null : (
              <ActivityIndicator
                animating
                accessibilityLabel={t('loading')}
                style={{ marginTop: 24 }}
              />
            )
          ) : loadError && teamsMini.length === 0 ? (
            <AsyncStateFeedback
              mode="error"
              message={t('an_error_occured')}
              onRetry={() => void loadTeams()}
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
              {teamsMini.length
                ? t('no_results_found')
                : t('no_teams_available')}
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
