import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { Button, Card, Divider, Menu, Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { RootStackScreenProps } from '../../types';
import { PartMiniDTO } from '../../models/part';
import { VendorMiniDTO } from '../../models/vendor';
import { PermissionEntity } from '../../models/role';
import { PlanFeature } from '../../models/subscriptionPlan';
import useAuth from '../../hooks/useAuth';
import api, { getErrorMessage } from '../../utils/api';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import { useAppTheme } from '../../custom-theme';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import { useContext } from 'react';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

type OrderLine = {
  part: PartMiniDTO;
  quantity: string;
  price: string;
  siteId?: number | null;
  siteName?: string | null;
};
type SiteOption = { id: number; name: string };

const parseDecimal = (value: string) => Number(value.trim().replace(',', '.'));
// The API stores supplier prices with at most four decimals.
const isValidPrice = (value: string) =>
  /^\d+([.,]\d{1,4})?$/.test(value.trim()) && parseDecimal(value) >= 0;

export default function CreatePurchaseOrderScreen({
  navigation
}: RootStackScreenProps<'CreatePurchaseOrder'>) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { hasCreatePermission, hasFeature } = useAuth();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const canCreate =
    hasCreatePermission(PermissionEntity.PURCHASE_ORDERS) &&
    hasFeature(PlanFeature.PURCHASE_ORDER);
  const [name, setName] = React.useState('');
  const [vendor, setVendor] = React.useState<VendorMiniDTO | null>(null);
  const [dueDate, setDueDate] = React.useState<Date | null>(null);
  const [shippingDetails, setShippingDetails] = React.useState('');
  const [shippingAddress, setShippingAddress] = React.useState('');
  const [lines, setLines] = React.useState<OrderLine[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [sites, setSites] = React.useState<SiteOption[]>([]);
  const [siteMenuLine, setSiteMenuLine] = React.useState<number | null>(null);
  const isFormDirty =
    Boolean(name.trim() || vendor || dueDate || shippingDetails.trim() || shippingAddress.trim()) ||
    lines.length > 0;
  const markFormClean = useUnsavedChanges(navigation, isFormDirty);

  React.useEffect(() => {
    let active = true;
    api
      .get<SiteOption[]>('sites')
      .then((result) => active && setSites(Array.isArray(result) ? result : []))
      .catch(() => active && setSites([]));
    return () => {
      active = false;
    };
  }, []);

  const selectVendor = () =>
    navigation.navigate('SelectVendors', {
      onChange: (selected) => setVendor(selected[0] ?? null),
      selected: vendor ? [vendor.id] : [],
      multiple: false
    });
  const selectParts = () =>
    navigation.navigate('SelectParts', {
      selected: lines.map((line) => line.part.id),
      onChange: (selected) =>
        setLines((current) =>
          selected.map((part) => ({
            part,
            quantity:
              current.find((line) => line.part.id === part.id)?.quantity ?? '1',
            price:
              current.find((line) => line.part.id === part.id)?.price ??
              (part.cost != null ? String(part.cost) : ''),
            siteId: current.find((line) => line.part.id === part.id)?.siteId,
            siteName: current.find((line) => line.part.id === part.id)?.siteName
          }))
        )
    });
  const save = async () => {
    const normalizedLines = lines.map((line) => ({
      part: { id: line.part.id },
      quantity: parseDecimal(line.quantity),
      purchaseUnitPrice: isValidPrice(line.price)
        ? parseDecimal(line.price)
        : null,
      siteId: line.siteId ?? null
    }));
    if (lines.some((line) => !isValidPrice(line.price))) {
      setError(t('purchase_order_price_required'));
      return;
    }
    if (sites.length > 1 && lines.some((line) => !line.siteId)) {
      setError(t('procurement_site_required'));
      return;
    }
    if (
      !name.trim() ||
      !normalizedLines.length ||
      normalizedLines.some(
        (line) =>
          !Number.isFinite(line.quantity) ||
          line.quantity <= 0 ||
          (lines.find((entry) => entry.part.id === line.part.id)?.part.unit ==
            null &&
            !Number.isInteger(line.quantity))
      )
    ) {
      setError(t('purchase_order_mobile_validation'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('purchase-orders/with-lines', {
        purchaseOrder: {
          name: name.trim(),
          vendor: vendor ? { id: vendor.id } : null,
          category: null,
          shippingDueDate: dueDate?.toISOString() ?? null,
          shippingAdditionalDetail: shippingDetails.trim() || null,
          shippingAddress: shippingAddress.trim() || null,
          receivingWorkflowEnabled: true
        },
        partQuantities: normalizedLines,
        // Creation and approval are separate SAP-style actions.
        approveOnSubmit: false
      });
      showSnackBar(t('po_create_success'), 'success');
      markFormClean();
      navigation.goBack();
    } catch (e) {
      setError(getErrorMessage(e, t('po_create_failure')));
    } finally {
      setSaving(false);
    }
  };

  if (!canCreate)
    return (
      <AsyncStateFeedback
        mode="permissionDenied"
        message={t('no_access_purchase_orders')}
      />
    );
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {t('direct_purchase_order_hint')}
        </Text>
        <Card style={{ backgroundColor: theme.colors.surface }}>
          <Card.Content style={styles.form}>
            <TextInput
              label={t('name')}
              value={name}
              onChangeText={setName}
              maxLength={255}
            />
            <Button mode="outlined" icon="truck-outline" onPress={selectVendor}>
              {vendor?.companyName ?? t('select_vendor_optional')}
            </Button>
            <CustomDateTimePicker
              label={t('purchase_order_due_date')}
              value={dueDate}
              mode="date"
              onChange={setDueDate}
            />
            <TextInput
              label={t('purchase_order_shipping_address')}
              value={shippingAddress}
              onChangeText={setShippingAddress}
              maxLength={500}
            />
            <TextInput
              label={t('purchase_order_shipping_details')}
              value={shippingDetails}
              onChangeText={setShippingDetails}
              multiline
              maxLength={2000}
            />
            <Divider />
            <View style={styles.partsHeader}>
              <Text variant="titleMedium" style={styles.flex}>
                {t('parts')} · {lines.length}
              </Text>
              <Button icon="plus" onPress={selectParts}>
                {t('add_parts')}
              </Button>
            </View>
            {lines.map((line) => (
              <View key={line.part.id} style={styles.lineBlock}>
              <View style={styles.line}>
                <View style={styles.flex}>
                  <Text variant="bodyMedium">{line.part.name}</Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {line.part.unit || t('unit_unspecified')}
                  </Text>
                </View>
                <TextInput
                  label={t('quantity')}
                  keyboardType="decimal-pad"
                  accessibilityLabel={`${line.part.name} ${t('quantity')}`}
                  value={line.quantity}
                  onChangeText={(value) =>
                    setLines((current) =>
                      current.map((entry) =>
                        entry.part.id === line.part.id
                          ? { ...entry, quantity: value }
                          : entry
                      )
                    )
                  }
                  style={styles.quantity}
                />
                <TextInput
                  label={t('agreed_unit_price')}
                  keyboardType="decimal-pad"
                  accessibilityLabel={`${line.part.name} ${t('agreed_unit_price')}`}
                  value={line.price}
                  error={!!line.price && !isValidPrice(line.price)}
                  onChangeText={(value) =>
                    setLines((current) =>
                      current.map((entry) =>
                        entry.part.id === line.part.id
                          ? { ...entry, price: value }
                          : entry
                      )
                    )
                  }
                  style={styles.quantity}
                />
                <Button
                  compact
                  icon="close"
                  accessibilityLabel={t('remove')}
                  onPress={() =>
                    setLines((current) =>
                      current.filter((entry) => entry.part.id !== line.part.id)
                    )
                  }
                >
                  {t('remove')}
                </Button>
              </View>
              {sites.length > 0 && (
                <Menu
                  visible={siteMenuLine === line.part.id}
                  onDismiss={() => setSiteMenuLine(null)}
                  anchor={
                    <Button
                      mode="outlined"
                      compact
                      icon="map-marker-outline"
                      onPress={() => setSiteMenuLine(line.part.id)}
                    >
                      {line.siteName || t('select_site')}
                    </Button>
                  }
                >
                  {sites.map((site) => (
                    <Menu.Item
                      key={site.id}
                      title={site.name}
                      onPress={() => {
                        setLines((current) =>
                          current.map((entry) =>
                            entry.part.id === line.part.id
                              ? { ...entry, siteId: site.id, siteName: site.name }
                              : entry
                          )
                        );
                        setSiteMenuLine(null);
                      }}
                    />
                  ))}
                </Menu>
              )}
              </View>
            ))}
            {!!error && (
              <Text style={{ color: theme.colors.error }}>{error}</Text>
            )}
          </Card.Content>
        </Card>
        <Button
          mode="contained"
          icon="check"
          loading={saving}
          disabled={saving}
          onPress={() => void save()}
        >
          {t('create_purchase_order')}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  form: { gap: 12 },
  partsHeader: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  lineBlock: { gap: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  quantity: { width: 92 }
});
