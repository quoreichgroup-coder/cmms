import * as React from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  Menu,
  Portal,
  Searchbar,
  Text,
  TextInput
} from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { RootStackScreenProps } from '../../types';
import useAuth from '../../hooks/useAuth';
import { PermissionEntity } from '../../models/role';
import { PlanFeature } from '../../models/subscriptionPlan';
import { PartMiniDTO } from '../../models/part';
import { Page } from '../../models/page';
import api, { getErrorMessage } from '../../utils/api';
import { useAppTheme } from '../../custom-theme';
import AsyncStateFeedback from '../../components/AsyncStateFeedback';
import ApprovalSummaryCard, { type ApprovalSummary } from '../../components/ApprovalSummaryCard';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { VendorMiniDTO } from '../../models/vendor';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import ProcurementDocumentActions from '../../components/ProcurementDocumentActions';

type RequisitionLine = {
  id?: number;
  partId: number;
  partName: string;
  unit?: string | null;
  quantity: number;
  orderedQuantity?: number;
  notes?: string;
  siteId?: number | null;
  siteName?: string | null;
};
type PurchaseRequisition = {
  id: number;
  title: string;
  justification?: string;
  requiredDate?: string;
  status: string;
  requesterId?: number;
  requesterName?: string;
  sourceWorkOrderId?: number;
  sourceWorkOrderName?: string;
  decisionById?: number;
  decisionAt?: string;
  decisionNote?: string;
  lines: RequisitionLine[];
};
type DraftLine = { part: PartMiniDTO; quantity: string; notes: string; siteId?: number | null; siteName?: string | null };
type SiteOption = { id: number; name: string };
const PAGE_SIZE = 20;
export default function PurchaseRequisitionsScreen({
  route,
  navigation
}: RootStackScreenProps<'PurchaseRequisitions'>) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const focused = useIsFocused();
  const {
    hasCreatePermission,
    hasViewPermission,
    hasViewOtherPermission,
    hasFeature,
    user
  } = useAuth();
  const { getFormattedDate, getUserNameById } = React.useContext(
    CompanySettingsContext
  );
  const { showSnackBar } = React.useContext(CustomSnackBarContext);
  const canCreate =
    hasCreatePermission(PermissionEntity.PURCHASE_REQUISITIONS) &&
    hasFeature(PlanFeature.PURCHASE_ORDER);
  const canEditOther = Boolean(
    user?.role?.editOtherPermissions?.includes(
      PermissionEntity.PURCHASE_REQUISITIONS
    )
  );
  const canApprove = Boolean(
    user?.role?.editOtherPermissions?.includes(
      PermissionEntity.PURCHASE_REQUISITION_APPROVAL
    ) &&
      hasViewPermission(PermissionEntity.PURCHASE_REQUISITIONS) &&
      hasViewOtherPermission(PermissionEntity.PURCHASE_REQUISITIONS)
  );
  const canUse =
    hasFeature(PlanFeature.PURCHASE_ORDER) &&
    (canCreate ||
      canEditOther ||
      (hasViewPermission(PermissionEntity.PURCHASE_REQUISITIONS) &&
        hasViewOtherPermission(PermissionEntity.PURCHASE_REQUISITIONS)));
  const canManageOwnDraft = (item: PurchaseRequisition) =>
    item.requesterId === user?.id || canEditOther;
  const canDeleteDraft = (item: PurchaseRequisition) =>
    item.requesterId === user?.id ||
    Boolean(
      user?.role?.deleteOtherPermissions?.includes(
        PermissionEntity.PURCHASE_REQUISITIONS
      )
    );
  const [items, setItems] = React.useState<PurchaseRequisition[]>([]);
  const [page, setPage] = React.useState(0);
  const [last, setLast] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [activeSearch, setActiveSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [justification, setJustification] = React.useState('');
  const [requiredDate, setRequiredDate] = React.useState('');
  const [lines, setLines] = React.useState<DraftLine[]>([]);
  const [partSearch, setPartSearch] = React.useState('');
  const [parts, setParts] = React.useState<PartMiniDTO[]>([]);
  const [sites, setSites] = React.useState<SiteOption[]>([]);
  const [siteMenuLine, setSiteMenuLine] = React.useState<number | null>(null);
  const [partsLoading, setPartsLoading] = React.useState(false);
  const [submittingId, setSubmittingId] = React.useState<number | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [decisionTarget, setDecisionTarget] = React.useState<{
    id: number;
    approved: boolean;
  } | null>(null);
  const [decisionNote, setDecisionNote] = React.useState('');
  const [decisionSaving, setDecisionSaving] = React.useState(false);
  const [decisionError, setDecisionError] = React.useState('');
  const [approvalSummary, setApprovalSummary] = React.useState<ApprovalSummary | null>(null);
  const [approvalSummaryLoading, setApprovalSummaryLoading] = React.useState(false);
  const [approvalSummaryLoaded, setApprovalSummaryLoaded] = React.useState(false);
  const [approvalSummaryError, setApprovalSummaryError] = React.useState('');
  const decisionSummaryRequest = React.useRef(0);
  const [convertTarget, setConvertTarget] =
    React.useState<PurchaseRequisition | null>(null);
  const [convertVendor, setConvertVendor] =
    React.useState<VendorMiniDTO | null>(null);
  const [convertName, setConvertName] = React.useState('');
  const [convertQuantities, setConvertQuantities] = React.useState<
    Record<number, string>
  >({});
  const [converting, setConverting] = React.useState(false);
  const [convertError, setConvertError] = React.useState('');
  const canCreateOrder = hasCreatePermission(PermissionEntity.PURCHASE_ORDERS);
  const source = route.params?.sourceWorkOrderId;
  const sourcePartId = route.params?.sourcePartId;
  const [formSource, setFormSource] = React.useState<{
    id?: number;
    name?: string;
  }>({ id: source, name: route.params?.sourceWorkOrderName });
  const sourcePartLaunchHandled = React.useRef(false);

  const loadPage = React.useCallback(
    async (pageNum = 0, append = false) => {
      setLoading(true);
      setError('');
      try {
        const filterFields = [
          ...(activeSearch
            ? [{ field: 'title', operation: 'cn', value: activeSearch }]
            : []),
          ...(statusFilter
            ? [
                {
                  field: 'status',
                  operation: 'eq',
                  value: statusFilter,
                  enumName: 'PURCHASE_REQUISITION_STATUS'
                }
              ]
            : [])
        ];
        const result = await api.post<Page<PurchaseRequisition>>(
          'purchase-requisitions/search',
          { filterFields, pageNum, pageSize: PAGE_SIZE, direction: 'DESC' }
        );
        setItems((current) =>
          append ? [...current, ...result.content] : result.content
        );
        setPage(result.number);
        setLast(result.last);
      } catch (e) {
        setError(getErrorMessage(e, t('purchase_requisitions_load_error')));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeSearch, statusFilter, t]
  );
  React.useEffect(() => {
    if (focused && canUse) void loadPage();
  }, [focused, canUse, loadPage]);
  React.useEffect(() => {
    const timeout = setTimeout(() => setActiveSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const openForm = React.useCallback(
    (requisition?: PurchaseRequisition) => {
      setEditingId(requisition?.id ?? null);
      setTitle(requisition?.title ?? '');
      setJustification(requisition?.justification ?? '');
      setRequiredDate(requisition?.requiredDate?.slice(0, 10) ?? '');
      setLines([]);
      setFormSource({
        id: requisition?.sourceWorkOrderId ?? source,
        name:
          requisition?.sourceWorkOrderName ?? route.params?.sourceWorkOrderName
      });
      setFormError('');
      setFormOpen(true);
      setPartsLoading(true);
      void api.get<SiteOption[]>('sites').then((result) => setSites(Array.isArray(result) ? result : [])).catch(() => setSites([]));
      void api
        .get<PartMiniDTO[]>('parts/mini')
        .then((result) => {
          setParts(result);
          if (requisition) {
            setLines(
              requisition.lines.map((line) => ({
                part: result.find((part) => part.id === line.partId) ?? {
                  id: line.partId,
                  name: line.partName,
                  unit: line.unit,
                  cost: 0,
                  description: ''
                },
                quantity: String(line.quantity),
                notes: line.notes ?? '',
                siteId: line.siteId,
                siteName: line.siteName
              }))
            );
          } else if (sourcePartId) {
            const sourcePart = result.find((part) => part.id === sourcePartId);
            if (sourcePart) {
              setLines([
                {
                  part: sourcePart,
                  quantity: String(route.params?.suggestedQuantity ?? 1),
                  notes: ''
                }
              ]);
              setTitle(
                (current) =>
                  current ||
                  t('purchase_requisition_restock_title', {
                    part: route.params?.sourcePartName ?? sourcePart.name
                  })
              );
            }
          }
        })
        .catch((e) =>
          setFormError(
            getErrorMessage(e, t('purchase_requisition_parts_error'))
          )
        )
        .finally(() => setPartsLoading(false));
    },
    [
      route.params?.sourcePartName,
      route.params?.suggestedQuantity,
      route.params?.sourceWorkOrderName,
      source,
      sourcePartId,
      t
    ]
  );
  React.useEffect(() => {
    if (
      focused &&
      canCreate &&
      sourcePartId &&
      !sourcePartLaunchHandled.current
    ) {
      sourcePartLaunchHandled.current = true;
      openForm();
    }
  }, [canCreate, focused, openForm, sourcePartId]);
  const addPart = (part: PartMiniDTO) => {
    setLines((current) =>
      current.some((line) => line.part.id === part.id)
        ? current
        : [...current, { part, quantity: '1', notes: '' }]
    );
  };
  const save = async (submit: boolean) => {
    if (!formSource.id && sites.length > 1 && lines.some((line) => !line.siteId)) {
      setFormError(t('procurement_site_required'));
      return;
    }
    const normalizedLines = lines.map((line) => ({
      partId: line.part.id,
      quantity: Number(line.quantity.replace(',', '.')),
      notes: line.notes.trim() || undefined,
      siteId: line.siteId
    }));
    if (
      !title.trim() ||
      normalizedLines.length === 0 ||
      normalizedLines.some(
        (line) => !Number.isFinite(line.quantity) || line.quantity <= 0
      )
    ) {
      setFormError(t('purchase_requisition_validation'));
      return;
    }
    setSaving(true);
    setFormError('');
    let saved: PurchaseRequisition;
    try {
      const payload = {
        title: title.trim(),
        justification: justification.trim() || undefined,
        requiredDate: requiredDate.trim() || undefined,
        sourceWorkOrderId: formSource.id,
        lines: normalizedLines
      };
      saved = editingId
        ? await api.put<PurchaseRequisition>(
            `purchase-requisitions/${editingId}`,
            payload
          )
        : await api.post<PurchaseRequisition>('purchase-requisitions', payload);
    } catch (e) {
      setFormError(getErrorMessage(e, t('purchase_requisition_save_error')));
      setSaving(false);
      return;
    }
    setFormOpen(false);
    setEditingId(null);
    await loadPage();
    if (submit) {
      try {
        await api.post<PurchaseRequisition>(
          `purchase-requisitions/${saved.id}/submit`,
          {}
        );
        await loadPage();
      } catch (e) {
        setError(getErrorMessage(e, t('purchase_requisition_submit_error')));
      }
    }
    setSaving(false);
  };
  const filteredParts = parts
    .filter((part) =>
      `${part.name} ${part.description}`
        .toLowerCase()
        .includes(partSearch.toLowerCase())
    )
    .slice(0, 8);
  const submitDraft = async (id: number) => {
    setSubmittingId(id);
    setError('');
    try {
      await api.post<PurchaseRequisition>(
        `purchase-requisitions/${id}/submit`,
        {}
      );
      await loadPage();
    } catch (e) {
      setError(getErrorMessage(e, t('purchase_requisition_submit_error')));
    } finally {
      setSubmittingId(null);
    }
  };
  const confirmDeleteDraft = (id: number) => {
    Alert.alert(
      t('purchase_requisition_delete_title'),
      t('purchase_requisition_delete_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => void deleteDraft(id)
        }
      ]
    );
  };
  const deleteDraft = async (id: number) => {
    setDeletingId(id);
    setError('');
    try {
      await api.deletes(`purchase-requisitions/${id}`);
      await loadPage();
    } catch (e) {
      setError(getErrorMessage(e, t('purchase_requisition_delete_error')));
    } finally {
      setDeletingId(null);
    }
  };
  const loadApprovalSummary = async (id: number) => {
    const request = ++decisionSummaryRequest.current;
    setApprovalSummaryLoading(true);
    setApprovalSummaryLoaded(false);
    setApprovalSummaryError('');
    try {
      const summary = await api.get<ApprovalSummary | undefined>(
        `approval-management/documents/PR/${id}`
      );
      if (request === decisionSummaryRequest.current) {
        setApprovalSummary(summary ?? null);
        setApprovalSummaryLoaded(true);
      }
    } catch (e) {
      if (request === decisionSummaryRequest.current) {
        setApprovalSummaryError(
          getErrorMessage(e, t('approval_summary_load_error'))
        );
      }
    } finally {
      if (request === decisionSummaryRequest.current) {
        setApprovalSummaryLoading(false);
      }
    }
  };
  const openDecision = (item: PurchaseRequisition, approved: boolean) => {
    setDecisionNote('');
    setDecisionError('');
    setDecisionTarget({ id: item.id, approved });
    setApprovalSummary(null);
    void loadApprovalSummary(item.id);
  };
  const closeDecision = () => {
    if (decisionSaving) return;
    decisionSummaryRequest.current += 1;
    setDecisionTarget(null);
    setApprovalSummary(null);
    setApprovalSummaryLoaded(false);
    setApprovalSummaryError('');
  };
  const submitDecision = async () => {
    if (
      !decisionTarget ||
      !approvalSummaryLoaded ||
      approvalSummaryLoading ||
      approvalSummaryError ||
      (approvalSummary && !approvalSummary.canDecide)
    ) return;
    if (!decisionTarget.approved && !decisionNote.trim()) {
      setDecisionError(t('purchase_requisition_rejection_note_required'));
      return;
    }
    setDecisionSaving(true);
    setDecisionError('');
    try {
      await api.post<PurchaseRequisition>(
        `purchase-requisitions/${decisionTarget.id}/decision`,
        {
          approved: decisionTarget.approved,
          note: decisionNote.trim() || undefined
        }
      );
      setDecisionTarget(null);
      setDecisionNote('');
      setApprovalSummary(null);
      setApprovalSummaryLoaded(false);
      await loadPage();
    } catch (e) {
      setDecisionError(
        getErrorMessage(e, t('purchase_requisition_decision_error'))
      );
    } finally {
      setDecisionSaving(false);
    }
  };
  const openConversion = (requisition: PurchaseRequisition) => {
    const quantities = Object.fromEntries(
      requisition.lines
        .filter((line) => line.id != null)
        .map((line) => [
          line.id as number,
          String(Math.max(0, line.quantity - (line.orderedQuantity ?? 0)))
        ])
    );
    setConvertTarget(requisition);
    setConvertQuantities(quantities);
    setConvertVendor(null);
    setConvertName('');
    setConvertError('');
  };
  const selectConversionVendor = () =>
    navigation.navigate('SelectVendors', {
      onChange: (vendors) => setConvertVendor(vendors[0] ?? null),
      selected: convertVendor ? [convertVendor.id] : [],
      multiple: false
    });
  const convertToOrder = async () => {
    if (!convertTarget || !convertVendor) {
      setConvertError(t('purchase_requisition_conversion_validation'));
      return;
    }
    const enteredLines = Object.entries(convertQuantities).filter(
      ([, value]) => value.trim() !== ''
    );
    const selectedLines = enteredLines.map(([requisitionLineId, quantity]) => ({
      requisitionLineId: Number(requisitionLineId),
      quantity: Number(quantity.replace(',', '.'))
    }));
    const invalidLine = selectedLines.some((selected) => {
      const sourceLine = convertTarget.lines.find(
        (line) => line.id === selected.requisitionLineId
      );
      if (!sourceLine) return true;
      const remaining = sourceLine.quantity - (sourceLine.orderedQuantity ?? 0);
      return (
        !Number.isFinite(selected.quantity) ||
        selected.quantity <= 0 ||
        selected.quantity > remaining ||
        (!sourceLine.unit && !Number.isInteger(selected.quantity))
      );
    });
    if (selectedLines.length === 0 || invalidLine) {
      setConvertError(t('purchase_requisition_conversion_validation'));
      return;
    }
    setConverting(true);
    setConvertError('');
    try {
      const createdOrder = await api.post<{ id: number }>(
        `purchase-requisitions/${convertTarget.id}/convert-to-order`,
        {
          vendorId: convertVendor.id,
          purchaseOrderName: convertName.trim() || undefined,
          lines: selectedLines
        }
      );
      setConvertTarget(null);
      showSnackBar(t('purchase_requisition_converted'), 'success');
      await loadPage();
      if (hasViewPermission(PermissionEntity.PURCHASE_ORDERS)) {
        navigation.navigate('PurchaseOrderDetails', { id: createdOrder.id });
      }
    } catch (e) {
      setConvertError(
        getErrorMessage(e, t('purchase_requisition_conversion_error'))
      );
    } finally {
      setConverting(false);
    }
  };

  if (!canUse)
    return (
      <AsyncStateFeedback
        mode="permissionDenied"
        message={t('no_access_purchase_requisitions')}
      />
    );
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.toolbar}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
        >
          {t('purchase_requisitions_mobile_hint')}
        </Text>
        {canCreate && (
          <Button mode="contained" icon="plus" onPress={() => openForm()}>
            {t('purchase_requisition_new')}
          </Button>
        )}
      </View>
      {!!error && (
        <AsyncStateFeedback
          mode="banner"
          message={error}
          onRetry={() => void loadPage()}
        />
      )}
      <Searchbar
        placeholder={t('search_purchase_requisitions')}
        accessibilityLabel={t('search')}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        keyboardShouldPersistTaps="handled"
      >
        {[
          '',
          'DRAFT',
          'PENDING_APPROVAL',
          'APPROVED',
          'PARTIALLY_ORDERED',
          'ORDERED',
          'REJECTED',
          'CANCELLED'
        ].map((status) => (
          <Chip
            key={status || 'all'}
            selected={statusFilter === status}
            onPress={() => setStatusFilter(status)}
          >
            {status
              ? t(`purchase_requisition_status_${status.toLowerCase()}`)
              : t('all_purchase_requisitions')}
          </Chip>
        ))}
      </ScrollView>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadPage();
            }}
          />
        }
        onEndReached={() => {
          if (!loading && !last) void loadPage(page + 1, true);
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={styles.empty}>{t('purchase_requisitions_empty')}</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.flex}>
                  {item.title}
                </Text>
                <Chip
                  compact
                  textStyle={
                    item.status === 'REJECTED'
                      ? { color: theme.colors.error }
                      : undefined
                  }
                >
                  {t(
                    `purchase_requisition_status_${item.status.toLowerCase()}`,
                    { defaultValue: item.status.replaceAll('_', ' ') }
                  )}
                </Chip>
              </View>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t('purchase_requisition_number', { id: item.id })}
                {item.requesterName ? ` · ${item.requesterName}` : ''}
              </Text>
              {item.sourceWorkOrderName ? (
                <Text variant="bodySmall">
                  {t('purchase_requisition_source_wo')}:{' '}
                  {item.sourceWorkOrderName}
                </Text>
              ) : null}
              {item.requiredDate ? (
                <Text variant="bodySmall">
                  {t('required_date')}:{' '}
                  {getFormattedDate(item.requiredDate, true)}
                </Text>
              ) : null}
              <Divider style={styles.divider} />
              {item.lines?.map((line) => (
                <Text key={line.id ?? line.partId} variant="bodyMedium">
                  {line.partName} · {line.quantity} {line.unit ?? ''}{line.siteName ? ` · ${line.siteName}` : ''}
                  {line.orderedQuantity
                    ? ` (${t('purchase_requisition_ordered_quantity', {
                        quantity: line.orderedQuantity
                      })})`
                    : ''}
                </Text>
              ))}
              {!!item.decisionNote && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {item.decisionNote}
                </Text>
              )}
              {item.decisionAt && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t('purchase_requisition_decision_recorded', {
                    date: getFormattedDate(item.decisionAt, true),
                    user: item.decisionById
                      ? getUserNameById(item.decisionById) ?? t('unknown_user')
                      : t('unknown_user')
                  })}
                </Text>
              )}
              <ProcurementDocumentActions kind="purchase-requisitions" sourceId={item.id} disabled={['REJECTED', 'CANCELLED'].includes(item.status)} />
              {item.status === 'DRAFT' &&
                (canManageOwnDraft(item) || canDeleteDraft(item)) && (
                  <View style={styles.draftActions}>
                    {canManageOwnDraft(item) && (
                      <Button
                        icon="pencil-outline"
                        disabled={submittingId !== null || deletingId !== null}
                        onPress={() => openForm(item)}
                      >
                        {t('edit')}
                      </Button>
                    )}
                    {canManageOwnDraft(item) && (
                      <Button
                        mode="contained-tonal"
                        icon="send-outline"
                        loading={submittingId === item.id}
                        disabled={submittingId !== null || deletingId !== null}
                        onPress={() => void submitDraft(item.id)}
                      >
                        {t('submit')}
                      </Button>
                    )}
                    {canDeleteDraft(item) && (
                      <Button
                        icon="delete-outline"
                        textColor={theme.colors.error}
                        disabled={submittingId !== null || deletingId !== null}
                        loading={deletingId === item.id}
                        onPress={() => confirmDeleteDraft(item.id)}
                      >
                        {t('delete')}
                      </Button>
                    )}
                  </View>
                )}
              {canCreateOrder &&
                (item.status === 'APPROVED' ||
                  item.status === 'PARTIALLY_ORDERED') &&
                item.lines.some(
                  (line) => line.quantity - (line.orderedQuantity ?? 0) > 0
                ) && (
                  <View style={styles.draftActions}>
                    <Button
                      mode="contained-tonal"
                      icon="cart-arrow-down"
                      onPress={() => openConversion(item)}
                    >
                      {t('convert_to_purchase_order')}
                    </Button>
                  </View>
                )}
              {canApprove &&
                item.status === 'PENDING_APPROVAL' &&
                item.requesterId !== user?.id && (
                  <View style={styles.draftActions}>
                    <Button
                      mode="contained-tonal"
                      icon="check"
                      onPress={() => openDecision(item, true)}
                    >
                      {t('approve')}
                    </Button>
                    <Button
                      icon="close"
                      textColor={theme.colors.error}
                      onPress={() => openDecision(item, false)}
                    >
                      {t('reject')}
                    </Button>
                  </View>
                )}
            </Card.Content>
          </Card>
        )}
      />
      {loading && items.length === 0 ? (
        <View style={styles.loading}>
          <Text>{t('loading')}</Text>
        </View>
      ) : null}
      <Portal>
        <Dialog
          visible={decisionTarget !== null}
          onDismiss={closeDecision}
        >
          <Dialog.Title>
            {t(
              decisionTarget?.approved
                ? 'purchase_requisition_approve_title'
                : 'purchase_requisition_reject_title'
            )}
          </Dialog.Title>
          <Dialog.Content>
            {approvalSummaryLoading && (
              <Text accessibilityRole="progressbar" style={{ marginBottom: 12 }}>
                {t('loading')}
              </Text>
            )}
            {!!approvalSummaryError && (
              <View style={{ marginBottom: 12 }}>
                <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>
                  {approvalSummaryError}
                </Text>
                <Button
                  onPress={() => decisionTarget && void loadApprovalSummary(decisionTarget.id)}
                  disabled={approvalSummaryLoading || decisionSaving}
                >
                  {t('retry')}
                </Button>
              </View>
            )}
            {approvalSummary && <ApprovalSummaryCard summary={approvalSummary} />}
            <TextInput
              label={t('purchase_requisition_decision_note')}
              value={decisionNote}
              onChangeText={setDecisionNote}
              multiline
              maxLength={2000}
              error={Boolean(decisionError)}
            />
            {!!decisionError && (
              <Text style={{ color: theme.colors.error, marginTop: 8 }}>
                {decisionError}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={decisionSaving}
              onPress={closeDecision}
            >
              {t('cancel')}
            </Button>
            <Button
              mode="contained"
              loading={decisionSaving}
              disabled={
                decisionSaving ||
                approvalSummaryLoading ||
                !approvalSummaryLoaded ||
                Boolean(approvalSummaryError) ||
                Boolean(approvalSummary && !approvalSummary.canDecide)
              }
              onPress={() => void submitDecision()}
            >
              {t('confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={formOpen}
          onDismiss={() => !saving && setFormOpen(false)}
          style={{ maxHeight: '90%' }}
        >
          <Dialog.Title>
            {t(
              editingId
                ? 'purchase_requisition_edit'
                : 'purchase_requisition_new'
            )}
          </Dialog.Title>
          <Dialog.ScrollArea>
            <FlatList
              data={[]}
              renderItem={() => null}
              ListHeaderComponent={
                <View style={styles.form}>
                  {formSource.id ? (
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.primary }}
                    >
                      {t('purchase_requisition_linked_work_order', {
                        name: formSource.name ?? formSource.id
                      })}
                    </Text>
                  ) : null}
                  {formSource.id ? (
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {t('purchase_requisition_manual_parts_help')}
                    </Text>
                  ) : null}
                  <TextInput
                    label={t('purchase_requisition_title')}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={255}
                  />
                  <TextInput
                    label={t('purchase_requisition_justification')}
                    value={justification}
                    onChangeText={setJustification}
                    multiline
                    maxLength={4000}
                  />
                  <TextInput
                    label={t('required_date')}
                    value={requiredDate}
                    onChangeText={setRequiredDate}
                    placeholder="YYYY-MM-DD"
                  />
                  <Text variant="titleSmall">
                    {t('purchase_requisition_lines')} ({lines.length})
                  </Text>
                  <Searchbar
                    placeholder={t('search_parts')}
                    accessibilityLabel={t('search')}
                    value={partSearch}
                    onChangeText={setPartSearch}
                  />
                  {partsLoading ? (
                    <Text>{t('loading')}</Text>
                  ) : (
                    filteredParts.map((part) => (
                      <Button
                        key={part.id}
                        mode="text"
                        icon="plus"
                        onPress={() => addPart(part)}
                      >
                        {part.name}
                        {part.unit ? ` · ${part.unit}` : ''}
                      </Button>
                    ))
                  )}
                  {lines.map((line) => (
                    <View key={line.part.id} style={styles.lineContainer}>
                      <View style={styles.line}>
                        <Text style={styles.flex}>{line.part.name}</Text>
                        <TextInput
                          accessibilityLabel={t('quantity')}
                          keyboardType="decimal-pad"
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
                        <Button
                          compact
                          onPress={() =>
                            setLines((current) =>
                              current.filter(
                                (entry) => entry.part.id !== line.part.id
                              )
                            )
                          }
                        >
                          {t('remove')}
                        </Button>
                      </View>
                      <TextInput
                        label={t('purchase_requisition_line_notes')}
                        value={line.notes}
                        onChangeText={(value) =>
                          setLines((current) =>
                            current.map((entry) =>
                              entry.part.id === line.part.id
                                ? { ...entry, notes: value }
                                : entry
                            )
                          )
                        }
                        maxLength={2000}
                        dense
                      />
                      {sites.length > 0 && (
                        <Menu
                          visible={siteMenuLine === line.part.id}
                          onDismiss={() => setSiteMenuLine(null)}
                          anchor={<Button mode="outlined" compact onPress={() => setSiteMenuLine(line.part.id)}>{line.siteName || t('select_site', 'Select site')}</Button>}
                        >
                          {sites.map((site) => (
                            <Menu.Item key={site.id} title={site.name} onPress={() => {
                              setLines((current) => current.map((entry) => entry.part.id === line.part.id ? { ...entry, siteId: site.id, siteName: site.name } : entry));
                              setSiteMenuLine(null);
                            }} />
                          ))}
                        </Menu>
                      )}
                    </View>
                  ))}
                  {!!formError && (
                    <Text style={{ color: theme.colors.error }}>
                      {formError}
                    </Text>
                  )}
                </View>
              }
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button disabled={saving} onPress={() => setFormOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              loading={saving}
              disabled={saving}
              onPress={() => void save(false)}
            >
              {t('save_draft')}
            </Button>
            <Button
              mode="contained"
              loading={saving}
              disabled={saving}
              onPress={() => void save(true)}
            >
              {t('submit')}
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={convertTarget !== null}
          onDismiss={() => !converting && setConvertTarget(null)}
          style={{ maxHeight: '90%' }}
        >
          <Dialog.Title>{t('convert_to_purchase_order')}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
            >
              <Text variant="bodySmall">{convertTarget?.title}</Text>
              <Button
                mode="outlined"
                icon="truck-outline"
                onPress={selectConversionVendor}
              >
                {convertVendor?.companyName ?? t('select_vendor')}
              </Button>
              <TextInput
                label={t('purchase_order_name_optional')}
                value={convertName}
                onChangeText={setConvertName}
                maxLength={255}
              />
              {convertTarget?.lines.map((line) => {
                const remaining = Math.max(
                  0,
                  line.quantity - (line.orderedQuantity ?? 0)
                );
                if (remaining <= 0 || line.id == null) return null;
                return (
                  <TextInput
                    key={line.id}
                    label={`${line.partName} · ${t(
                      'remaining'
                    )}: ${remaining} ${line.unit ?? ''}`}
                    value={convertQuantities[line.id] ?? ''}
                    keyboardType="decimal-pad"
                    onChangeText={(value) =>
                      setConvertQuantities((current) => ({
                        ...current,
                        [line.id as number]: value
                      }))
                    }
                  />
                );
              })}
              {!!convertError && (
                <Text style={{ color: theme.colors.error }}>
                  {convertError}
                </Text>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              disabled={converting}
              onPress={() => setConvertTarget(null)}
            >
              {t('cancel')}
            </Button>
            <Button
              mode="contained"
              loading={converting}
              disabled={converting}
              onPress={() => void convertToOrder()}
            >
              {t('create_purchase_order')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { padding: 16, gap: 12, flexDirection: 'row', alignItems: 'center' },
  search: { marginHorizontal: 16, marginBottom: 8 },
  filters: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 28, gap: 10 },
  card: { borderRadius: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  divider: { marginVertical: 8 },
  draftActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  loading: { position: 'absolute', alignSelf: 'center', top: '50%' },
  form: { padding: 16, gap: 12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineContainer: { gap: 6 },
  empty: { textAlign: 'center', padding: 24, color: '#667085' },
  quantity: { width: 76 }
});
