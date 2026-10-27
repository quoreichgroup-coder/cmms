import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Divider, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { RootStackScreenProps } from '../../types';
import PurchaseOrder from '../../models/purchaseOrder';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { PlanFeature } from '../../models/subscriptionPlan';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import { useAppTheme } from '../../custom-theme';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';

export default function PurchaseOrderDetailsScreen({
  navigation,
  route
}: RootStackScreenProps<'PurchaseOrderDetails'>) {
  const { id } = route.params;
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { hasViewPermission, hasFeature } = useAuth();
  const { getFormattedDate, getFormattedCurrency } = useContext(
    CompanySettingsContext
  );
  const canView =
    hasViewPermission(PermissionEntity.PURCHASE_ORDERS) &&
    hasFeature(PlanFeature.PURCHASE_ORDER);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestId = useRef(0);

  const loadPurchaseOrder = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setLoadError(false);
    setPurchaseOrder(null);
    try {
      const result = await api.get<PurchaseOrder>(`purchase-orders/${id}`);
      if (currentRequestId === requestId.current) setPurchaseOrder(result);
    } catch (_error) {
      if (currentRequestId === requestId.current) setLoadError(true);
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    navigation.setOptions({
      title: purchaseOrder?.name ?? t('purchase_order_details')
    });
  }, [navigation, purchaseOrder?.name, t]);

  useEffect(() => {
    if (canView) void loadPurchaseOrder();
    return () => {
      requestId.current += 1;
    };
  }, [canView, loadPurchaseOrder]);

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
  if (loading) {
    return <AsyncStateFeedback mode="loading" message={t('loading')} />;
  }
  if (loadError || !purchaseOrder) {
    return (
      <AsyncStateFeedback
        mode="error"
        message={t('purchase_orders_load_error')}
        onRetry={() => void loadPurchaseOrder()}
      />
    );
  }

  const statusColor =
    purchaseOrder.status === 'APPROVED'
      ? [theme.colors.successContainer, theme.colors.onSuccessContainer]
      : purchaseOrder.status === 'REJECTED'
      ? [theme.colors.errorContainer, theme.colors.onErrorContainer]
      : [theme.colors.warningContainer, theme.colors.onWarningContainer];

  const renderField = (label: string, value?: string | number | null) =>
    value !== undefined && value !== null && String(value).trim() !== '' ? (
      <View key={label} style={styles.field}>
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {label}
        </Text>
        <Text
          selectable
          variant="bodyMedium"
          style={{ color: theme.colors.onSurface }}
        >
          {String(value)}
        </Text>
      </View>
    ) : null;
  const hasAnyValue = (values: Array<string | number | null | undefined>) =>
    values.some(
      (value) =>
        value !== undefined && value !== null && String(value).trim() !== ''
    );
  const partQuantities = purchaseOrder.partQuantities ?? [];
  const orderedQuantitiesByUnit = partQuantities.reduce<
    Map<string, { label: string; total: number }>
  >((totals, line) => {
    const unit = line.part?.unit?.trim() || t('unit_unspecified');
    const unitKey = unit.toLowerCase();
    const current = totals.get(unitKey);
    totals.set(unitKey, {
      label: current?.label ?? unit,
      total: (current?.total ?? 0) + line.quantity
    });
    return totals;
  }, new Map());
  const hasCompleteCost =
    partQuantities.length > 0 &&
    partQuantities.every((line) => Number.isFinite(line.part?.cost));
  // Match the Web grid: this is an estimate using each part's current unit cost.
  const totalCost = partQuantities.reduce(
    (total, line) => total + line.part.cost * line.quantity,
    0
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { backgroundColor: theme.colors.background }
      ]}
    >
      <Card mode="outlined" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.heading}>
            <View style={styles.headingText}>
              <Text
                variant="titleLarge"
                style={{ color: theme.colors.onSurface }}
              >
                {purchaseOrder.name}
              </Text>
              {!!purchaseOrder.vendor?.companyName && (
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {purchaseOrder.vendor.companyName}
                </Text>
              )}
            </View>
            <Chip
              compact
              style={{ backgroundColor: statusColor[0] }}
              textStyle={{ color: statusColor[1] }}
            >
              {t(purchaseOrder.status.toLowerCase())}
            </Chip>
          </View>
          <Divider />
          {renderField(t('id'), purchaseOrder.id)}
          {renderField(t('category'), purchaseOrder.category?.name)}
          {renderField(
            t('purchase_order_due_date'),
            purchaseOrder.shippingDueDate
              ? getFormattedDate(purchaseOrder.shippingDueDate, true)
              : undefined
          )}
          {renderField(
            t('created_at'),
            purchaseOrder.createdAt
              ? getFormattedDate(purchaseOrder.createdAt, true)
              : undefined
          )}
        </Card.Content>
      </Card>

      <Card mode="outlined" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {t('purchase_order_summary')}
          </Text>
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t('ordered_quantity_by_unit')}
              </Text>
              {orderedQuantitiesByUnit.size ? (
                Array.from(orderedQuantitiesByUnit.values()).map(
                  ({ label, total }) => (
                    <Text
                      key={label}
                      variant="titleMedium"
                      style={{ color: theme.colors.onSurface }}
                    >
                      {total.toLocaleString()} {label}
                    </Text>
                  )
                )
              ) : (
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t('no_data')}
                </Text>
              )}
            </View>
            <View style={styles.summaryItem}>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t('total_cost')}
              </Text>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface }}
                numberOfLines={2}
              >
                {hasCompleteCost
                  ? getFormattedCurrency(totalCost)
                  : t('no_data')}
              </Text>
              {hasCompleteCost && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t('purchase_order_cost_estimate_note')}
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card mode="outlined" style={{ backgroundColor: theme.colors.surface }}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {t('parts')} ·{' '}
            {t('purchase_order_items_count', {
              count: purchaseOrder.partQuantities?.length ?? 0
            })}
          </Text>
          {purchaseOrder.partQuantities?.length ? (
            purchaseOrder.partQuantities.map((line, index) => (
              <View key={line.id}>
                {index > 0 && <Divider />}
                <View style={styles.partLine}>
                  <Text variant="bodyMedium" style={styles.partName}>
                    {line.part?.name || t('part')}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {t('purchase_order_quantity')}: {line.quantity}
                    {line.part?.unit ? ` ${line.part.unit}` : ''}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t('no_data')}
            </Text>
          )}
        </Card.Content>
      </Card>

      {hasAnyValue([
        purchaseOrder.shippingShipToName,
        purchaseOrder.shippingCompanyName,
        purchaseOrder.shippingAddress,
        purchaseOrder.shippingCity,
        purchaseOrder.shippingState,
        purchaseOrder.shippingZipCode,
        purchaseOrder.shippingPhone,
        purchaseOrder.shippingFax,
        purchaseOrder.shippingAdditionalDetail
      ]) && (
        <Card mode="outlined" style={{ backgroundColor: theme.colors.surface }}>
          <Card.Content style={styles.cardContent}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {t('shipping_information')}
            </Text>
            {renderField(t('ship_to'), purchaseOrder.shippingShipToName)}
            {renderField(t('company_name'), purchaseOrder.shippingCompanyName)}
            {renderField(t('address'), purchaseOrder.shippingAddress)}
            {renderField(t('city'), purchaseOrder.shippingCity)}
            {renderField(t('state'), purchaseOrder.shippingState)}
            {renderField(t('zip_code'), purchaseOrder.shippingZipCode)}
            {renderField(t('phone'), purchaseOrder.shippingPhone)}
            {renderField(t('fax_number'), purchaseOrder.shippingFax)}
            {renderField(
              t('additional_details'),
              purchaseOrder.shippingAdditionalDetail
            )}
          </Card.Content>
        </Card>
      )}

      {hasAnyValue([
        purchaseOrder.additionalInfoDate,
        purchaseOrder.additionalInfoRequisitionedName,
        purchaseOrder.additionalInfoShippingOrderCategory,
        purchaseOrder.additionalInfoTerm,
        purchaseOrder.additionalInfoNotes
      ]) && (
        <Card mode="outlined" style={{ backgroundColor: theme.colors.surface }}>
          <Card.Content style={styles.cardContent}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {t('additional_information')}
            </Text>
            {renderField(
              t('date'),
              purchaseOrder.additionalInfoDate
                ? getFormattedDate(purchaseOrder.additionalInfoDate, true)
                : undefined
            )}
            {renderField(
              t('requisitioner'),
              purchaseOrder.additionalInfoRequisitionedName
            )}
            {renderField(
              t('shipping_order_category'),
              purchaseOrder.additionalInfoShippingOrderCategory
            )}
            {renderField(t('terms'), purchaseOrder.additionalInfoTerm)}
            {renderField(t('notes'), purchaseOrder.additionalInfoNotes)}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', padding: 20 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  cardContent: { gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headingText: { flex: 1, gap: 4 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  summaryItem: { flex: 1, minWidth: 130, gap: 4 },
  field: { gap: 3 },
  partLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8
  },
  partName: { flex: 1, minWidth: 140 }
});
