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
import { getUsersMini } from '../../slices/user';
import {
  Avatar,
  ActivityIndicator,
  Button,
  Divider,
  Icon,
  Searchbar,
  Text
} from 'react-native-paper';
import { useAppTheme } from '../../custom-theme';
import { getUserInitials } from '../../utils/displayers';
import SelectionIndicator from '../../components/SelectionIndicator';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';

export default function SelectUsersModal({
  navigation,
  route
}: RootStackScreenProps<'SelectUsers'>) {
  const { onChange, selected, multiple } = route.params;
  const theme = useAppTheme();
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { usersMini } = useSelector((state) => state.users);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const selectedUsers = React.useMemo(
    () =>
      selectedIds.flatMap((id) => usersMini.filter((user) => user.id === id)),
    [selectedIds, usersMini]
  );

  useEffect(() => {
    if (!selectedIds.length) setSelectedIds(selected);
  }, [selected]);

  useEffect(() => {
    if (multiple)
      navigation.setOptions({
        headerRight: () => (
          <Pressable
            disabled={!selectedUsers.length}
            accessibilityRole="button"
            accessibilityLabel={`${t('add')} (${selectedUsers.length})`}
            accessibilityState={{ disabled: !selectedUsers.length }}
            onPress={() => {
              onChange(selectedUsers);
              navigation.goBack();
            }}
          >
            <Text variant="titleMedium">{t('add')}</Text>
          </Pressable>
        )
      });
  }, [selectedUsers, navigation, onChange, t]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      await dispatch(getUsersMini());
    } catch (_error) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const toggle = (id: number) => {
    if (multiple) {
      setSelectedIds((previous) =>
        previous.includes(id)
          ? previous.filter((selectedId) => selectedId !== id)
          : [...previous, id]
      );
      return;
    }
    const user = usersMini.find((item) => item.id === id);
    if (user) onChange([user]);
    navigation.goBack();
  };

  const normalizedSearch = searchQuery.toLowerCase().trim();
  const filteredUsers = usersMini.filter(
    (user) =>
      user.firstName.toLowerCase().includes(normalizedSearch) ||
      user.lastName.toLowerCase().includes(normalizedSearch)
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
        data={filteredUsers}
        keyExtractor={(user) => String(user.id)}
        refreshing={loading}
        onRefresh={loadUsers}
        ListHeaderComponent={
          loadError && usersMini.length > 0 ? (
            <AsyncStateFeedback
              mode="banner"
              message={t('an_error_occured')}
              onRetry={() => void loadUsers()}
            />
          ) : null
        }
        style={{
          flex: 1,
          backgroundColor: theme.colors.background
        }}
        renderItem={({ item: user }) => (
          <TouchableOpacity
            onPress={() => {
              toggle(user.id);
            }}
            accessibilityRole={multiple ? 'checkbox' : 'button'}
            accessibilityLabel={`${user.firstName} ${user.lastName}`}
            accessibilityState={
              multiple
                ? { checked: selectedIds.includes(user.id) }
                : { selected: selectedIds.includes(user.id) }
            }
          >
            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.cardRow}>
                {user.image ? (
                  <Avatar.Image size={50} source={{ uri: user.image.url }} />
                ) : (
                  <Avatar.Text
                    size={50}
                    label={getUserInitials(user)}
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={styles.cardTitle}>
                        {`${user.firstName} ${user.lastName}`}
                      </Text>
                      <Text
                        variant={'bodySmall'}
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >{`#${user.id}`}</Text>
                    </View>
                    {multiple && (
                      <SelectionIndicator
                        checked={selectedIds.includes(user.id)}
                        color={theme.colors.primary}
                        uncheckedColor={theme.colors.controlOutline}
                      />
                    )}
                    {!multiple && selectedIds.includes(user.id) && (
                      <Icon
                        source="check-circle"
                        size={24}
                        color={theme.colors.primary}
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
            usersMini.length ? null : (
              <ActivityIndicator
                animating
                accessibilityLabel={t('loading')}
                style={{ marginTop: 24 }}
              />
            )
          ) : loadError && usersMini.length === 0 ? (
            <AsyncStateFeedback
              mode="error"
              message={t('an_error_occured')}
              onRetry={() => void loadUsers()}
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
              {usersMini.length
                ? t('no_results_found')
                : t('no_users_available')}
            </Text>
          )
        }
        ListFooterComponent={
          <>
            <Divider />
            <Button
              icon={'plus-circle'}
              style={{ margin: 20 }}
              mode={'contained'}
              accessibilityLabel={t('invite_users')}
              onPress={() => {
                navigation.navigate('AddUser', { openedFromSelector: true });
              }}
            >
              {t('invite_users')}
            </Button>
          </>
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
