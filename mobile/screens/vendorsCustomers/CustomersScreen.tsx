import {
  ActivityIndicator,
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
import { getCustomers, getMoreCustomers } from '../../slices/customer';
import { FilterField, SearchCriteria } from '../../models/page';
import { Button, Searchbar, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Customer } from '../../models/customer';
import { isCloseToBottom, onSearchQueryChange } from '../../utils/overall';
import { RootStackScreenProps } from '../../types';
import { useDebouncedEffect } from '../../hooks/useDebouncedEffect';
import { useAppTheme } from '../../custom-theme';
import DirectoryCard from '../../components/DirectoryCard';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import DirectoryPaginationFooter from '../../components/DirectoryPaginationFooter';
import { qpmLayoutTokens } from '../../theme/tokens';

export default function CustomersScreen({
  navigation
}: RootStackScreenProps<'VendorsCustomers'>) {
  const { t } = useTranslation();
  const [startedSearch, setStartedSearch] = useState<boolean>(false);
  const { customers, loadingGet, currentPageNum, lastPage } = useSelector(
    (state) => state.customers
  );
  const theme = useAppTheme();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { hasViewPermission } = useAuth();
  const canView = hasViewPermission(PermissionEntity.VENDORS_AND_CUSTOMERS);
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
  const loadCustomers = useCallback(async () => {
    if (!canView) return;
    setLoadError(false);
    setLoadMoreError(false);
    try {
      await dispatch(
        getCustomers({
          ...criteria,
          pageSize: 10,
          pageNum: 0,
          direction: 'DESC'
        })
      );
    } catch (_error) {
      setLoadError(true);
    } finally {
      setHasLoadedList(true);
    }
  }, [canView, criteria, dispatch]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadCustomers();
    } finally {
      setRefreshing(false);
    }
  };

  const loadMoreCustomers = useCallback(
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
        await dispatch(getMoreCustomers(criteria, currentPageNum + 1));
      } catch (_error) {
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
    onSearchQueryChange<Customer>(
      query,
      criteria,
      setCriteria,
      setSearchQuery,
      [
        'name',
        'address',
        'phone',
        'email',
        'customerType',
        'description',
        'billingAddress',
        'billingName',
        'customFieldValues.value'
      ]
    );
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
          if (isCloseToBottom(nativeEvent)) void loadMoreCustomers();
        }}
        refreshControl={
          canView ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.surface}
            />
          ) : undefined
        }
        scrollEventThrottle={400}
      >
        {loadError && customers.content.length > 0 && (
          <AsyncStateFeedback
            mode="banner"
            message={t('directory_load_error')}
            onRetry={() => void loadCustomers()}
          />
        )}
        {canView && customers.content.length > 0 ? (
          customers.content.map((customer) => (
            <DirectoryCard
              key={customer.id}
              title={customer.name}
              icon="account-group-outline"
              accessibilityLabel={`${customer.name}${
                customer.customerType ? `, ${customer.customerType}` : ''
              }`}
              details={[
                ...(customer.customerType
                  ? [
                      {
                        label: customer.customerType,
                        icon: 'account-box-outline' as const
                      }
                    ]
                  : []),
                ...(customer.address
                  ? [
                      {
                        label: customer.address,
                        icon: 'map-marker-outline' as const
                      }
                    ]
                  : [])
              ]}
              onPress={() =>
                navigation.push('CustomerDetails', {
                  id: customer.id,
                  customerProp: customer
                })
              }
            />
          ))
        ) : canView && (loadingGet || !hasLoadedList) ? (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24
            }}
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
              {t('no_access_vendors_customers')}
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Text style={{ color: theme.colors.onSurface }}>
              {t('directory_load_error')}
            </Text>
            <Button onPress={() => void loadCustomers()}>{t('retry')}</Button>
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
                : t('no_customers_available')}
            </Text>
          </View>
        )}
        {canView && customers.content.length > 0 && !lastPage && (
          <DirectoryPaginationFooter
            loading={loadingMore}
            error={loadMoreError}
            loadingMessage={t('customers_page_loading')}
            onRetry={() => void loadMoreCustomers(true)}
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
