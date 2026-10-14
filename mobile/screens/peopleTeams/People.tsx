import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { useDispatch, useSelector } from '../../store';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { getMoreUsers, getUsers } from '../../slices/user';
import { FilterField, SearchCriteria } from '../../models/page';
import { Button, Searchbar, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import User from '../../models/user';
import { isCloseToBottom, onSearchQueryChange } from '../../utils/overall';
import { RootStackScreenProps } from '../../types';
import { useDebouncedEffect } from '../../hooks/useDebouncedEffect';
import { getUserInitials } from '../../utils/displayers';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import DirectoryCard from '../../components/DirectoryCard';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import DirectoryPaginationFooter from '../../components/DirectoryPaginationFooter';

export default function People({
  navigation
}: RootStackScreenProps<'PeopleTeams'>) {
  const { t } = useTranslation();
  const currentUser = useAuth().user;
  const [startedSearch, setStartedSearch] = useState<boolean>(false);
  const { users, loadingGet, currentPageNum, lastPage } = useSelector(
    (state) => state.users
  );
  const theme = useAppTheme();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { hasViewPermission } = useAuth();
  const canView = hasViewPermission(PermissionEntity.PEOPLE_AND_TEAMS);
  const [hasLoadedList, setHasLoadedList] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const defaultFilterFields: FilterField[] = [];
  const getCriteriaFromFilterFields = (filterFields: FilterField[]) => {
    const initialCriteria: SearchCriteria = {
      filterFields: defaultFilterFields,
      pageSize: 10,
      pageNum: 0,
      direction: 'DESC'
    };
    let newFilterFields = [...initialCriteria.filterFields];
    filterFields.forEach(
      (filterField) =>
        (newFilterFields = newFilterFields.filter(
          (ff) => ff.field != filterField.field
        ))
    );
    return {
      ...initialCriteria,
      filterFields: [...newFilterFields, ...filterFields]
    };
  };
  const [criteria, setCriteria] = useState<SearchCriteria>(
    getCriteriaFromFilterFields([])
  );
  const loadUsers = useCallback(async () => {
    if (!canView) return;
    setLoadError(false);
    setLoadMoreError(false);
    try {
      await dispatch(
        getUsers({ ...criteria, pageSize: 10, pageNum: 0, direction: 'DESC' })
      );
    } catch (error) {
      console.warn('Could not load people:', error);
      setLoadError(true);
    } finally {
      setHasLoadedList(true);
    }
  }, [canView, criteria, dispatch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadUsers();
    } finally {
      setRefreshing(false);
    }
  };

  const loadMoreUsers = useCallback(
    async (retry = false) => {
      if (
        !canView ||
        loadingMoreRef.current ||
        loadingGet ||
        lastPage ||
        (loadMoreError && !retry)
      )
        return;

      loadingMoreRef.current = true;
      setLoadingMore(true);
      setLoadMoreError(false);
      try {
        await dispatch(getMoreUsers(criteria, currentPageNum + 1));
      } catch (error) {
        console.warn('Could not load more people:', error);
        setLoadMoreError(true);
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    [
      canView,
      criteria,
      currentPageNum,
      dispatch,
      lastPage,
      loadMoreError,
      loadingGet
    ]
  );

  const onQueryChange = (query) => {
    onSearchQueryChange<User>(query, criteria, setCriteria, setSearchQuery, [
      'firstName',
      'lastName',
      'phone',
      'email',
      'jobTitle'
    ]);
  };
  useDebouncedEffect(
    () => {
      if (startedSearch) onQueryChange(searchQuery);
    },
    [searchQuery],
    1000
  );
  return (
    <View
      style={{ ...styles.container, backgroundColor: theme.colors.background }}
    >
      {canView && (
        <Searchbar
          placeholder={t('search')}
          accessibilityLabel={t('search')}
          onFocus={() => setStartedSearch(true)}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.search, { backgroundColor: theme.colors.surface }]}
        />
      )}
      <ScrollView
        style={styles.scrollView}
        onScroll={({ nativeEvent }) => {
          if (isCloseToBottom(nativeEvent)) void loadMoreUsers();
        }}
        refreshControl={
          canView ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.surface}
            />
          ) : undefined
        }
        scrollEventThrottle={400}
      >
        {loadError && users.content.length > 0 && (
          <AsyncStateFeedback
            mode="banner"
            message={t('directory_load_error')}
            onRetry={loadUsers}
          />
        )}
        {canView && users.content.length > 0 ? (
          users.content.map((user) => (
            <DirectoryCard
              key={user.id}
              title={`${user.firstName} ${user.lastName}`}
              icon="account-outline"
              avatarSource={user.image ? { uri: user.image.url } : undefined}
              avatarLabel={!user.image ? getUserInitials(user) : undefined}
              accessibilityLabel={`${user.firstName} ${user.lastName}${
                user.email ? `, ${user.email}` : ''
              }`}
              details={[
                ...(user.email
                  ? [{ label: user.email, icon: 'email-outline' as const }]
                  : []),
                ...(user.phone
                  ? [{ label: user.phone, icon: 'phone-outline' as const }]
                  : [])
              ]}
              trailingAction={
                user.phone
                  ? {
                      icon: 'phone' as const,
                      label: `${t('phone')} ${user.firstName} ${user.lastName}`,
                      onPress: () => Linking.openURL(`tel:${user.phone}`)
                    }
                  : undefined
              }
              onPress={() => {
                if (user.id === currentUser.id) {
                  navigation.navigate('UserProfile');
                } else
                  navigation.push('UserDetails', {
                    id: user.id,
                    userProp: user
                  });
              }}
            />
          ))
        ) : canView && (loadingGet || !hasLoadedList) ? (
          <View
            style={styles.loadingState}
            accessibilityRole="progressbar"
            accessibilityLabel={t('loading')}
          >
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {t('loading')}
            </Text>
          </View>
        ) : !canView ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
          >
            <Text style={{ color: theme.colors.onSurface }}>
              {t('no_access_people_team')}
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptyState} accessibilityRole="alert">
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {t('directory_load_error')}
            </Text>
            <Button onPress={loadUsers}>{t('retry')}</Button>
          </View>
        ) : (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant
              }
            ]}
          >
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {searchQuery.trim()
                ? t('no_element_match_criteria')
                : t('no_users_available')}
            </Text>
          </View>
        )}
        {canView && !!users.content.length && !lastPage && (
          <DirectoryPaginationFooter
            loading={loadingMore}
            error={loadMoreError}
            loadingMessage={t('people_page_loading')}
            onRetry={() => void loadMoreUsers(true)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  scrollView: {
    width: '100%',
    flex: 1
  },
  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: qpmLayoutTokens.radius.control
  },
  emptyState: {
    margin: 16,
    padding: 20,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  }
});
