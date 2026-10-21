import { logSafeError } from '../../utils/safeErrorLog';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View
} from 'react-native';
import { useDispatch, useSelector } from '../../store';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { getMoreTeams, getTeams } from '../../slices/team';
import { FilterField, SearchCriteria } from '../../models/page';
import { Button, Searchbar, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Team from '../../models/team';
import { onSearchQueryChange } from '../../utils/overall';
import { RootStackScreenProps } from '../../types';
import { useDebouncedEffect } from '../../hooks/useDebouncedEffect';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import DirectoryCard from '../../components/DirectoryCard';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import DirectoryPaginationFooter from '../../components/DirectoryPaginationFooter';
import _ from 'lodash';

const teamSearchFields: (keyof Team)[] = ['name', 'description'];

export default function Teams({
  navigation
}: RootStackScreenProps<'PeopleTeams'>) {
  const { t } = useTranslation();
  const [startedSearch, setStartedSearch] = useState<boolean>(false);
  const { teams, listLoading, currentPageNum, lastPage } = useSelector(
    (state) => state.teams
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
  const activeListLoadId = useRef(0);
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
  const [loadedCriteria, setLoadedCriteria] = useState<{
    filterFields: FilterField[];
    searchQuery: string;
  } | null>(null);
  const criteriaSearchQuery = String(
    criteria.filterFields.find((field) =>
      teamSearchFields.some((key) => key === field.field)
    )?.value ?? ''
  );
  const hasCurrentCriteriaResults =
    loadedCriteria !== null &&
    _.isEqual(loadedCriteria.filterFields, criteria.filterFields) &&
    loadedCriteria.searchQuery === searchQuery &&
    criteriaSearchQuery === searchQuery;
  const visibleTeams = hasCurrentCriteriaResults ? teams.content : [];
  const loadTeams = useCallback(async () => {
    if (!canView) return;
    const requestId = ++activeListLoadId.current;
    const requestSearchQuery = criteriaSearchQuery;
    setLoadError(false);
    setLoadMoreError(false);
    try {
      await dispatch(
        getTeams({ ...criteria, pageSize: 10, pageNum: 0, direction: 'DESC' })
      );
      if (activeListLoadId.current === requestId) {
        setLoadedCriteria({
          filterFields: criteria.filterFields,
          searchQuery: requestSearchQuery
        });
      }
    } catch (error) {
      logSafeError('Could not load teams:', error);
      if (activeListLoadId.current === requestId) setLoadError(true);
    } finally {
      if (activeListLoadId.current === requestId) setHasLoadedList(true);
    }
  }, [canView, criteria, criteriaSearchQuery, dispatch]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadTeams();
    } finally {
      setRefreshing(false);
    }
  };

  const loadMoreTeams = useCallback(
    async (retry = false) => {
      if (
        !canView ||
        loadingMoreRef.current ||
        listLoading ||
        lastPage ||
        !hasCurrentCriteriaResults ||
        (loadMoreError && !retry)
      )
        return;

      loadingMoreRef.current = true;
      const listRequestId = activeListLoadId.current;
      setLoadingMore(true);
      setLoadMoreError(false);
      try {
        await dispatch(getMoreTeams(criteria, currentPageNum + 1));
      } catch (error) {
        logSafeError('Could not load more teams:', error);
        if (activeListLoadId.current === listRequestId) setLoadMoreError(true);
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
      hasCurrentCriteriaResults,
      loadMoreError,
      listLoading
    ]
  );

  const onQueryChange = (query) => {
    onSearchQueryChange<Team>(
      query,
      criteria,
      setCriteria,
      setSearchQuery,
      teamSearchFields
    );
  };
  const onSearchTextChange = (query: string) => {
    setLoadError(false);
    setLoadMoreError(false);
    setSearchQuery(query);
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
          onChangeText={onSearchTextChange}
          value={searchQuery}
          style={[styles.search, { backgroundColor: theme.colors.surface }]}
        />
      )}
      <FlatList
        style={styles.scrollView}
        contentContainerStyle={styles.listContent}
        data={canView ? visibleTeams : []}
        keyExtractor={(team) => String(team.id)}
        renderItem={({ item: team }) => (
          <DirectoryCard
            title={team.name}
            icon="account-group-outline"
            accessibilityLabel={`${team.name}, ${t('team_members_count', {
              count: team.users.length
            })}`}
            details={[
              {
                label: t('team_members_count', {
                  count: team.users.length
                }),
                icon: 'account-multiple-outline'
              }
            ]}
            onPress={() =>
              navigation.push('TeamDetails', { id: team.id, teamProp: team })
            }
          />
        )}
        onEndReached={() => void loadMoreTeams()}
        onEndReachedThreshold={0.4}
        initialNumToRender={8}
        windowSize={7}
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
        ListHeaderComponent={
          loadError && visibleTeams.length > 0 ? (
            <AsyncStateFeedback
              mode="banner"
              message={t('directory_load_error')}
              onRetry={loadTeams}
            />
          ) : null
        }
        ListEmptyComponent={
          canView &&
          (listLoading ||
            !hasLoadedList ||
            (!hasCurrentCriteriaResults && !loadError)) ? (
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
              <Button onPress={loadTeams}>{t('retry')}</Button>
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
                  : t('no_teams_available')}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          canView && !!visibleTeams.length && !lastPage ? (
            <DirectoryPaginationFooter
              loading={loadingMore}
              error={loadMoreError}
              loadingMessage={t('teams_page_loading')}
              onRetry={() => void loadMoreTeams(true)}
            />
          ) : null
        }
      />
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
  listContent: { flexGrow: 1, paddingBottom: 24 },
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
