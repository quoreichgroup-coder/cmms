import {
  Pressable,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { useDispatch, useSelector } from '../../store';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import {
  getLocationChildren,
  getLocations,
  getMoreLocations
} from '../../slices/location';
import { FilterField, SearchCriteria } from '../../models/page';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Searchbar,
  Text
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Location from '../../models/location';
import { isCloseToBottom, onSearchQueryChange } from '../../utils/overall';
import { RootStackScreenProps } from '../../types';
import { useDebouncedEffect } from '../../hooks/useDebouncedEffect';
import { qpmLayoutTokens, useAppTheme } from '../../custom-theme';
import { IconWithLabel } from '../../components/IconWithLabel';

export default function LocationsScreen({
  navigation,
  route
}: RootStackScreenProps<'Locations'>) {
  const { t } = useTranslation();
  const [startedSearch, setStartedSearch] = useState<boolean>(false);
  const {
    locations,
    locationsHierarchy,
    loadingGet,
    currentPageNum,
    lastPage,
    locationChildrenPageNum,
    locationChildrenLastPage
  } = useSelector((state) => state.locations);
  const theme = useAppTheme();
  const [view, setView] = useState<'hierarchy' | 'list'>('hierarchy');
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const { hasViewPermission } = useAuth();
  const canView = hasViewPermission(PermissionEntity.LOCATIONS);
  const [hasLoadedList, setHasLoadedList] = useState(false);
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
  const [loadMoreError, setLoadMoreError] = useState(false);
  const listPageRequestInProgress = useRef(false);
  useEffect(() => {
    if (canView && view === 'list') {
      dispatch(
        getLocations({
          ...criteria,
          pageSize: 10,
          pageNum: 0,
          direction: 'DESC'
        })
      ).then(
        () => setHasLoadedList(true),
        () => setHasLoadedList(true)
      );
    }
  }, [canView, criteria, dispatch, view]);
  const [currentLocations, setCurrentLocations] = useState([]);
  useEffect(() => {
    if (
      route.params?.id &&
      locationsHierarchy.some(
        (location) =>
          location.hierarchy.includes(route.params.id) &&
          location.id !== route.params.id
      )
    ) {
      return;
    }
    dispatch(
      getLocationChildren(route.params?.id ?? 0, route.params?.hierarchy ?? [])
    );
  }, [route]);

  const onRefresh = () => {
    if (view === 'list') {
      dispatch(
        getLocations({
          ...criteria,
          pageSize: 10,
          pageNum: 0,
          direction: 'DESC'
        })
      ).catch((error) => {
        console.warn('Could not refresh locations:', error);
      });
    } else {
      dispatch(
        getLocationChildren(
          route.params?.id ?? 0,
          route.params?.hierarchy ?? [],
          0
        )
      ).catch((error) => {
        console.warn('Could not refresh location hierarchy:', error);
      });
    }
  };

  const loadNextLocationPage = (retry = false) => {
    if (
      listPageRequestInProgress.current ||
      loadingGet ||
      lastPage ||
      (loadMoreError && !retry)
    ) {
      return;
    }

    listPageRequestInProgress.current = true;
    setLoadMoreError(false);
    dispatch(getMoreLocations(criteria, currentPageNum + 1))
      .catch((error) => {
        setLoadMoreError(true);
        console.warn('Could not load more locations:', error);
      })
      .finally(() => {
        listPageRequestInProgress.current = false;
      });
  };

  const onQueryChange = (query) => {
    onSearchQueryChange<Location>(
      query,
      criteria,
      setCriteria,
      setSearchQuery,
      ['name', 'address', 'customId', 'customFieldValues.value']
    );
    setView(query ? 'list' : 'hierarchy');
  };
  useDebouncedEffect(
    () => {
      if (startedSearch) onQueryChange(searchQuery);
    },
    [searchQuery],
    1000
  );

  useEffect(() => {
    let result = [];
    if (route.params?.id) {
      result = locationsHierarchy.filter((location, index) => {
        return (
          location.hierarchy[location.hierarchy.length - 2] ===
            route.params.id && location.id !== route.params.id
        );
      });
    } else
      result = locationsHierarchy.filter(
        (location) => location.hierarchy.length === 1
      );
    setCurrentLocations(result);
  }, [locationsHierarchy]);

  const LocationCard = ({
    location,
    showChildrenButton = false
  }: {
    location: any;
    showChildrenButton?: boolean;
  }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant
        }
      ]}
    >
      <Pressable
        onPress={() =>
          navigation.push('LocationDetails', {
            id: location.id,
            locationProp: location
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`${location.name}, ${location.customId}`}
        style={({ pressed }) => [
          styles.cardMain,
          { opacity: pressed ? 0.72 : 1 }
        ]}
      >
        <Avatar.Icon
          style={{ backgroundColor: theme.colors.primaryContainer }}
          color={theme.colors.onPrimaryContainer}
          icon="map-marker-outline"
          size={48}
        />
        <View style={styles.cardDetails}>
          <Text
            variant="titleMedium"
            style={styles.cardTitle}
            numberOfLines={2}
          >
            {location.name}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {`#${location.customId}`}
          </Text>
          {location.address && (
            <View style={styles.cardBody}>
              <IconWithLabel
                label={location.address}
                icon="map-legend"
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          )}
        </View>
      </Pressable>
      {showChildrenButton && location.hasChildren && (
        <View
          style={[
            styles.cardFooter,
            { borderTopColor: theme.colors.outlineVariant }
          ]}
        >
          <View style={{ flex: 1 }} />
          <Button
            compact
            onPress={() =>
              navigation.push('Locations', {
                id: location.id,
                hierarchy: location.hierarchy
              })
            }
            accessibilityRole="button"
          >
            {t('view_children')}
          </Button>
        </View>
      )}
    </View>
  );

  return (
    <View
      style={{ ...styles.container, backgroundColor: theme.colors.background }}
    >
      <Searchbar
        placeholder={t('search')}
        onFocus={() => setStartedSearch(true)}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.search, { backgroundColor: theme.colors.surface }]}
      />
      {view === 'list' ? (
        <FlatList
          style={styles.scrollView}
          data={locations.content}
          keyExtractor={(location) => String(location.id)}
          renderItem={({ item }) => <LocationCard location={item} />}
          onEndReached={() => loadNextLocationPage()}
          onEndReachedThreshold={0.4}
          initialNumToRender={8}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loadingGet}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            loadingGet || (canView && !hasLoadedList) ? (
              <ActivityIndicator
                style={styles.listLoading}
                color={theme.colors.primary}
              />
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
                  {t('no_element_match_criteria')}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loadMoreError ? (
              <View style={styles.paginationFeedback}>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.error, textAlign: 'center' }}
                >
                  {t('error')}
                </Text>
                <Button onPress={() => loadNextLocationPage(true)}>
                  {t('retry')}
                </Button>
              </View>
            ) : loadingGet && locations.content.length > 0 ? (
              <ActivityIndicator
                style={styles.listLoading}
                color={theme.colors.primary}
              />
            ) : null
          }
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          onScroll={({ nativeEvent }) => {
            if (isCloseToBottom(nativeEvent)) {
              if (
                !loadingGet &&
                !locationChildrenLastPage[route.params?.id ?? 0]
              ) {
                dispatch(
                  getLocationChildren(
                    route.params?.id ?? 0,
                    route.params?.hierarchy ?? [],
                    (locationChildrenPageNum[route.params?.id ?? 0] ?? 0) + 1
                  )
                );
              }
            }
          }}
          scrollEventThrottle={400}
          refreshControl={
            <RefreshControl
              refreshing={loadingGet}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
        >
          {!!currentLocations.length &&
            currentLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                showChildrenButton={true}
              />
            ))}
        </ScrollView>
      )}
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
  listContent: { flexGrow: 1, paddingBottom: 16 },
  listLoading: { paddingVertical: 16 },
  paginationFeedback: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  search: { marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 12,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58
  },
  cardDetails: { flex: 1, minWidth: 0 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    flexShrink: 1
  },
  cardBody: {
    gap: 10
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  emptyState: {
    margin: 16,
    padding: 20,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.cardLarge
  }
});
