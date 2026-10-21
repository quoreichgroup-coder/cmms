import * as React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, Chip, Divider, Text } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from '../../store';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { PlanFeature } from '../../models/subscriptionPlan';
import { SearchCriteria } from '../../models/page';
import PurchaseOrder from '../../models/purchaseOrder';
import {
  getMorePurchaseOrders,
  getPurchaseOrders
} from '../../slices/purchaseOrder';
import { RootStackScreenProps } from '../../types';
import { useAppTheme } from '../../custom-theme';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';

const PAGE_SIZE = 20;
const EMPTY_CRITERIA: SearchCriteria = {
  filterFields: [],
  pageNum: 0,
  pageSize: PAGE_SIZE,
  direction: 'DESC'
};

export default function PurchaseOrdersScreen({}: RootStackScreenProps<'PurchaseOrders'>) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const dispatch = useDispatch();
  const isFocused = useIsFocused();
  const { hasViewPermission, hasFeature } = useAuth();
  const canView =
    hasViewPermission(PermissionEntity.PURCHASE_ORDERS) &&
    hasFeature(PlanFeature.PURCHASE_ORDER);
  const { getFormattedDate } = React.useContext(CompanySettingsContext);
  const { purchaseOrders, loadingGet } = useSelector(
    (state) => state.purchaseOrders
  );
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const [loadMoreError, setLoadMoreError] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const currentRequest = React.useRef(0);
  const pagingInProgress = React.useRef(false);

  const loadFirstPage = React.useCallback(async () => {
    const requestId = ++currentRequest.current;
    setLoadError(false);
    setLoadMoreError(false);
    pagingInProgress.current = false;
    try {
      await dispatch(getPurchaseOrders(EMPTY_CRITERIA));
    } catch (_error) {
      if (requestId === currentRequest.current) setLoadError(true);
    } finally {
      if (requestId === currentRequest.current) {
        setHasLoaded(true);
        setRefreshing(false);
      }
    }
  }, [dispatch]);

  React.useEffect(() => {
    if (canView && isFocused) void loadFirstPage();
  }, [canView, isFocused, loadFirstPage]);

  const loadNextPage = React.useCallback(
    async (retry = false) => {
      if (
        !canView ||
        loadingGet ||
        loadingMore ||
        pagingInProgress.current ||
        purchaseOrders.last ||
        (loadMoreError && !retry)
      ) {
        return;
      }
      pagingInProgress.current = true;
      setLoadingMore(true);
      setLoadMoreError(false);
      try {
        await dispatch(
          getMorePurchaseOrders(EMPTY_CRITERIA, purchaseOrders.number + 1)
        );
      } catch (_error) {
        setLoadMoreError(true);
      } finally {
        pagingInProgress.current = false;
        setLoadingMore(false);
      }
    },
    [
      canView,
      dispatch,
      loadMoreError,
      loadingGet,
      loadingMore,
      purchaseOrders.last,
      purchaseOrders.number
    ]
  );

  const refresh = React.useCallback(() => {
    setRefreshing(true);
    void loadFirstPage();
  }, [loadFirstPage]);

  const statusColor = (status: PurchaseOrder['status']) => {
    if (status === 'APPROVED') {
      return {
        backgroundColor: theme.colors.successContainer,
        color: theme.colors.onSuccessContainer
      };
    }
    if (status === 'REJECTED') {
      return {
        backgroundColor: theme.colors.errorContainer,
        color: theme.colors.onErrorContainer
      };
    }
    return {
      backgroundColor: theme.colors.warningContainer,
      color: theme.colors.onWarningContainer
    };
  };

  const renderOrder = ({ item }: { item: PurchaseOrder }) => {
    const badge = statusColor(item.status);
    return (
      <Card
        mode="outlined"
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant
          }
        ]}
        accessibilityLabel={`${item.name}, ${t(item.status.toLowerCase())}`}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.heading}>
            <View style={styles.headingText}>
              <Text
                variant="titleMedium"
                numberOfLines={2}
                style={styles.title}
              >
                {item.name}
              </Text>
              {!!item.vendor?.companyName && (
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {item.vendor.companyName}
                </Text>
              )}
            </View>
            <Chip
              compact
              style={{ backgroundColor: badge.backgroundColor }}
              textStyle={{ color: badge.color }}
            >
              {t(item.status.toLowerCase())}
            </Chip>
          </View>
          {!!item.shippingDueDate && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t('purchase_order_due_date')}:{' '}
              {getFormattedDate(item.shippingDueDate, true)}
            </Text>
          )}
          {item.partQuantities?.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t('purchase_order_items_count', {
                  count: item.partQuantities.length
                })}
              </Text>
              {item.partQuantities.slice(0, 3).map((line) => (
                <View key={line.id} style={styles.partLine}>
                  <Text
                    variant="bodyMedium"
                    numberOfLines={2}
                    style={styles.partName}
                  >
                    {line.part?.name || t('part')}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {t('purchase_order_quantity')}: {line.quantity}
                  </Text>
                </View>
              ))}
              {item.partQuantities.length > 3 && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  +{item.partQuantities.length - 3}
                </Text>
              )}
            </>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (!canView) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <AsyncStateFeedback
          mode="permissionDenied"
          message={t('no_access_purchase_orders')}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text
        variant="bodySmall"
        style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
      >
        {t('purchase_orders_read_only_note')}
      </Text>
      <FlatList
        data={purchaseOrders.content}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={() => void loadNextPage()}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          loadError && purchaseOrders.content.length > 0 ? (
            <AsyncStateFeedback
              mode="banner"
              message={t('purchase_orders_load_error')}
              onRetry={() => void loadFirstPage()}
            />
          ) : null
        }
        ListEmptyComponent={
          loadingGet && !hasLoaded ? (
            <AsyncStateFeedback mode="loading" message={t('loading')} />
          ) : loadError ? (
            <AsyncStateFeedback
              mode="error"
              message={t('purchase_orders_load_error')}
              onRetry={() => void loadFirstPage()}
            />
          ) : hasLoaded ? (
            <Text
              variant="bodyMedium"
              style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}
            >
              {t('purchase_orders_empty')}
            </Text>
          ) : null
        }
        ListFooterComponent={
          loadMoreError ? (
            <AsyncStateFeedback
              mode="banner"
              message={t('purchase_orders_load_error')}
              onRetry={() => void loadNextPage(true)}
            />
          ) : loadingMore ? (
            <Text
              variant="bodySmall"
              style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}
            >
              {t('loading')}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', padding: 20 },
  note: { marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
    gap: 10,
    flexGrow: 1
  },
  card: { borderRadius: 16, borderWidth: 1 },
  cardContent: { gap: 10 },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8
  },
  headingText: { flex: 1, gap: 3 },
  title: { fontWeight: '700' },
  divider: { marginVertical: 2 },
  partLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  partName: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 48 },
  footer: { textAlign: 'center', padding: 14 }
});
