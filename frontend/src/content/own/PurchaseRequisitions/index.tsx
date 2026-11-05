import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ApprovalProgress, { useApprovalSummary } from '../ApprovalManagement/ApprovalProgress';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Yup from 'yup';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import { TitleContext } from '../../../contexts/TitleContext';
import useAuth from '../../../hooks/useAuth';
import { PurchaseRequisition } from '../../../models/owns/purchaseRequisition';
import { Page } from '../../../models/owns/page';
import { VendorMiniDTO } from '../../../models/owns/vendor';
import { PartMiniDTO } from '../../../models/owns/part';
import { PermissionEntity } from '../../../models/owns/role';
import { UserMiniDTO } from '../../../models/owns/user';
import { PlanFeature } from '../../../models/owns/subscriptionPlan';
import api, { getErrorMessage } from '../../../utils/api';
import Form from '../components/form';
import FeatureErrorMessage from '../components/FeatureErrorMessage';
import PermissionErrorMessage from '../components/PermissionErrorMessage';
import { IField } from '../type';
import ProcurementDocumentModal from '../components/ProcurementDocumentModal';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import { downloadCsv } from '../../../utils/csv';

function PurchaseRequisitions() {
  const { t }: { t: any } = useTranslation();
  const { setTitle } = useContext(TitleContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { getCurrencyCode } = useContext(CompanySettingsContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    hasFeature,
    hasViewPermission,
    hasCreatePermission
  } = useAuth();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = useState<PurchaseRequisition[]>([]);
  const [vendors, setVendors] = useState<VendorMiniDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [converting, setConverting] = useState(false);
  const [pageNumber, setPageNumber] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'draft' | 'approved'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PurchaseRequisition | null>(null);
  const [sourceWorkOrder, setSourceWorkOrder] = useState<{ id: number; name: string } | null>(null);
  const [sourcePart, setSourcePart] = useState<{
    part: PartMiniDTO;
    suggestedQuantity: number;
  } | null>(null);
  const [decisionRow, setDecisionRow] = useState<PurchaseRequisition | null>(null);
  const approvalState = useApprovalSummary('PR', decisionRow?.id);
  const decisionLock = useRef(false);
  const [deciding, setDeciding] = useState(false);
  const [deleteRow, setDeleteRow] = useState<PurchaseRequisition | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [reassignmentRow, setReassignmentRow] = useState<PurchaseRequisition | null>(null);
  const [reassignmentTargets, setReassignmentTargets] = useState<UserMiniDTO[]>([]);
  const [reassignmentTargetId, setReassignmentTargetId] = useState<number | ''>('');
  const [reassignmentReason, setReassignmentReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [convertRow, setConvertRow] = useState<PurchaseRequisition | null>(null);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [unitPrices, setUnitPrices] = useState<Record<number, number | ''>>({});
  const canApprove =
    user?.role?.editOtherPermissions?.includes(
      PermissionEntity.PURCHASE_REQUISITION_APPROVAL
    );
  const canManageApproval = Boolean(user?.role?.viewPermissions?.includes(PermissionEntity.SETTINGS)
    && user?.role?.editOtherPermissions?.includes(PermissionEntity.SETTINGS));

  const openLegacyReassignment = async (row: PurchaseRequisition) => {
    try {
      const targets = await api.get<UserMiniDTO[]>(`purchase-requisitions/${row.id}/legacy-approval-reassignment-targets`);
      setReassignmentTargets(targets);
      setReassignmentTargetId('');
      setReassignmentReason('');
      setReassignmentRow(row);
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'approval_reassignment_unavailable')), 'error');
    }
  };

  const submitLegacyReassignment = async () => {
    if (!reassignmentRow || !reassignmentTargetId || !reassignmentReason.trim() || reassigning) return;
    setReassigning(true);
    try {
      await api.post(`purchase-requisitions/${reassignmentRow.id}/legacy-approval-reassignment`, {
        targetUserId: reassignmentTargetId, reason: reassignmentReason.trim()
      });
      showSnackBar(t('approval_reassigned'), 'success');
      setReassignmentRow(null);
      await refresh();
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'approval_reassignment_unavailable')), 'error');
    } finally { setReassigning(false); }
  };
  const canEditOther = user?.role?.editOtherPermissions?.includes(
    PermissionEntity.PURCHASE_REQUISITIONS
  );
  const canDelete = user?.role?.deleteOtherPermissions?.includes(
    PermissionEntity.PURCHASE_REQUISITIONS
  );
  const canCreateOrder = user?.role?.createPermissions?.includes(
    PermissionEntity.PURCHASE_ORDERS
  );
  const canTrackOwnRequests =
    hasViewPermission(PermissionEntity.PURCHASE_REQUISITIONS) ||
    hasCreatePermission(PermissionEntity.PURCHASE_REQUISITIONS) ||
    canApprove;

  const searchCriteria = (pageNum: number) => {
    const statusValues = {
      pending: ['PENDING_APPROVAL'],
      draft: ['DRAFT'],
      approved: ['APPROVED', 'PARTIALLY_ORDERED', 'ORDERED']
    }[statusFilter];
    return {
      pageNum,
      pageSize: 30,
      filterFields: statusValues ? [{
        field: 'status',
        operation: statusValues.length === 1 ? 'eq' : 'in',
        value: statusValues[0],
        values: statusValues,
        enumName: 'PURCHASE_REQUISITION_STATUS'
      }] : []
    };
  };

  const clearSourceWorkOrderContext = () => {
    setSourceWorkOrder(null);
    setSourcePart(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('sourceWorkOrderId');
    nextParams.delete('sourceWorkOrderName');
    nextParams.delete('sourcePartId');
    nextParams.delete('sourcePartName');
    nextParams.delete('suggestedQuantity');
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    setTitle(t('purchase_requisitions'));
  }, [setTitle, t]);

  useEffect(() => {
    const workOrderId = Number(searchParams.get('sourceWorkOrderId'));
    const partId = Number(searchParams.get('sourcePartId'));
    const hasWorkOrder = Number.isSafeInteger(workOrderId) && workOrderId > 0;
    const hasPart = Number.isSafeInteger(partId) && partId > 0;
    if (!hasWorkOrder && !hasPart) return;
    if (hasWorkOrder) {
      setSourceWorkOrder({
        id: workOrderId,
        name: searchParams.get('sourceWorkOrderName') || `WO-${workOrderId}`
      });
    }
    if (hasPart) {
      const suggestedQuantity = Number(searchParams.get('suggestedQuantity'));
      void api
        .get<PartMiniDTO[]>('parts/mini')
        .then((parts) => {
          const part = parts.find((candidate) => candidate.id === partId);
          if (!part) {
            showSnackBar(t('purchase_requisition_parts_error'), 'error');
            return;
          }
          setSourcePart({
            part,
            suggestedQuantity:
              Number.isFinite(suggestedQuantity) && suggestedQuantity > 0
                ? suggestedQuantity
                : 1
          });
        })
        .catch(() =>
          showSnackBar(t('purchase_requisition_parts_error'), 'error')
        );
    }
    setEditingRow(null);
    setFormOpen(true);
  }, [searchParams, showSnackBar, t]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.post<Page<PurchaseRequisition>>(
        'purchase-requisitions/search',
        searchCriteria(0)
      );
      setRows(result.content);
      setPageNumber(0);
      setHasMore(!result.last);
    } catch {
      showSnackBar(t('purchase_requisitions_load_failed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackBar, statusFilter, t]);

  const exportRequisitions = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const all: PurchaseRequisition[] = [];
      let page = 0;
      let last = false;
      while (!last && all.length < 10000) {
        const result = await api.post<Page<PurchaseRequisition>>(
          'purchase-requisitions/search', { ...searchCriteria(page), pageSize: 100 }
        );
        all.push(...result.content);
        last = result.last;
        page += 1;
      }
      if (!last) throw new Error('export_limit_reached');
      downloadCsv(`purchase-requisitions-${new Date().toISOString().slice(0, 10)}.csv`,
        ['requisitionKey', 'title', 'justification', 'requiredDate', 'sourceWorkOrderId', 'partId', 'quantity', 'notes', 'siteId', 'siteName', 'status', 'requester', 'sourceWorkOrder', 'partName', 'orderedQuantity', 'unit'],
        all.flatMap((request) => request.lines.map((line) => [request.id, request.title,
          request.justification, request.requiredDate, request.sourceWorkOrderId, line.partId, line.quantity,
          line.notes, line.siteId, line.siteName, request.status, request.requesterName, request.sourceWorkOrderName, line.partName,
          line.orderedQuantity, line.unit])));
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'purchase_export_failed')), 'error');
    } finally {
      setExporting(false);
    }
  };

  const importRequisitions = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const result = await api.post<{ importedRequisitions: number; createdAs: string }>(
        'purchase-requisitions/import', form,
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` } }, true
      );
      showSnackBar(t('purchase_requisition_imported', result), 'success');
      await refresh();
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'purchase_import_failed')), 'error');
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const downloadRequisitionTemplate = () => downloadCsv('purchase-requisitions-template.csv',
    ['requisitionKey', 'title', 'justification', 'requiredDate', 'sourceWorkOrderId', 'partId', 'quantity', 'notes', 'siteId'], []);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    const next = pageNumber + 1;
    setLoading(true);
    try {
      const result = await api.post<Page<PurchaseRequisition>>(
        'purchase-requisitions/search',
        searchCriteria(next)
      );
      setRows((current) => [...current, ...result.content]);
      setPageNumber(next);
      setHasMore(!result.last);
    } catch {
      showSnackBar(t('purchase_requisitions_load_failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canTrackOwnRequests) void refresh();
  }, [canTrackOwnRequests, refresh]);

  useEffect(() => {
    if (hasCreatePermission(PermissionEntity.PURCHASE_ORDERS)) {
      void api.get<VendorMiniDTO[]>('vendors/mini').then(setVendors).catch(() => setVendors([]));
    }
  }, [hasCreatePermission]);

  const formFields: IField[] = useMemo(
    () => [
      { name: 'title', type: 'text', label: t('requisition_title'), required: true },
      {
        name: 'justification',
        type: 'text',
        label: t('requisition_justification'),
        multiple: true
      },
      { name: 'requiredDate', type: 'date', label: t('required_date') },
      {
        name: 'partQuantities',
        type: 'partQuantity',
        label: t('requested_items'),
        multiple: true,
        siteSelectionEnabled: true,
        siteSelectionRequired: !sourceWorkOrder?.id
      }
    ],
    [t, sourceWorkOrder?.id]
  );

  const statusLabel = (status: string) => t(`requisition_status_${status.toLowerCase()}`);
  const statusColor = (status: string): 'default' | 'warning' | 'success' | 'error' | 'info' => {
    if (status === 'APPROVED' || status === 'ORDERED') return 'success';
    if (status === 'PENDING_APPROVAL' || status === 'PARTIALLY_ORDERED') return 'warning';
    if (status === 'REJECTED' || status === 'CANCELLED') return 'error';
    return 'default';
  };

  const submitDraft = async (row: PurchaseRequisition) => {
    try {
      await api.post(`purchase-requisitions/${row.id}/submit`, {});
      showSnackBar(t('requisition_submitted'), 'success');
      await refresh();
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'requisition_action_failed')), 'error');
    }
  };

  const decide = async (approved: boolean) => {
    if (!decisionRow || decisionLock.current) return;
    decisionLock.current = true;
    setDeciding(true);
    try {
      const result = await api.post<PurchaseRequisition>(`purchase-requisitions/${decisionRow.id}/decision`, {
        approved,
        note: decisionNote.trim() || null
      });
      showSnackBar(
        approved && result.status === 'PENDING_APPROVAL' ? t('ap_intermediate_saved') : approved ? t('requisition_approved') : t('requisition_rejected'),
        'success'
      );
      setDecisionRow(null);
      setDecisionNote('');
      await refresh();
    } catch (error) {
      approvalState.reload();
      showSnackBar(t(getErrorMessage(error, 'requisition_action_failed')), 'error');
    } finally {
      decisionLock.current = false;
      setDeciding(false);
    }
  };

  const deleteDraft = async (row: PurchaseRequisition) => {
    try {
      await api.deletes(`purchase-requisitions/${row.id}`);
      showSnackBar(t('requisition_deleted'), 'success');
      setDeleteRow(null);
      await refresh();
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'requisition_action_failed')), 'error');
    }
  };

  const editDraft = (row: PurchaseRequisition) => {
    setEditingRow(row);
    setFormOpen(true);
  };

  const openConversion = (row: PurchaseRequisition) => {
    setConvertRow(row);
    setVendorId(null);
    setQuantities(
      Object.fromEntries(
        row.lines
          .map((line) => [line.id, line.quantity - line.orderedQuantity] as const)
          .filter(([, quantity]) => quantity > 0)
      )
    );
    setUnitPrices(Object.fromEntries(row.lines
      .filter((line) => line.quantity - line.orderedQuantity > 0)
      .map((line) => [line.id, ''])));
  };

  const convert = async () => {
    if (!convertRow || !vendorId || converting) return;
    setConverting(true);
    try {
      const lines = convertRow.lines
        .map((line) => ({ requisitionLineId: line.id, quantity: quantities[line.id] || 0, purchaseUnitPrice: unitPrices[line.id] }))
        .filter((line) => line.quantity > 0);
      if (lines.some((line) => line.purchaseUnitPrice === '' || line.purchaseUnitPrice == null
        || !Number.isFinite(Number(line.purchaseUnitPrice)) || Number(line.purchaseUnitPrice) < 0)) {
        showSnackBar(t('enter_supplier_price', 'Enter agreed supplier price for each selected line'), 'error');
        return;
      }
      const purchaseOrder = await api.post<{ id: number }>(`purchase-requisitions/${convertRow.id}/convert-to-order`, {
        vendorId,
        lines
      });
      showSnackBar(t('requisition_converted'), 'success');
      setConvertRow(null);
      await refresh();
      if (hasViewPermission(PermissionEntity.PURCHASE_ORDERS)) {
        navigate(`/app/purchase-orders/${purchaseOrder.id}`);
      }
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'requisition_action_failed')), 'error');
    } finally {
      setConverting(false);
    }
  };

  if (!hasFeature(PlanFeature.PURCHASE_ORDER))
    return <FeatureErrorMessage message="purchase_orders" />;
  if (!canTrackOwnRequests)
    return <PermissionErrorMessage message="no_access_purchase_requisitions" />;

  return (
    <>
      <Helmet><title>{t('purchase_requisitions')}</title></Helmet>
      <Stack spacing={2} sx={{ px: { xs: 1, sm: 2, md: 3 }, pb: 3 }}>
        <Alert severity="info" variant="outlined">
          {t('requisition_is_internal_notice')}
        </Alert>
        {!canApprove && (
          <Alert severity="info" variant="outlined">
            {t('requisition_approval_access_hint')}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h5" fontWeight={700}>{t('purchase_requisitions')}</Typography>
            <Typography color="text.secondary">{t('purchase_requisitions_description')}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <input ref={importFileRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => void importRequisitions(event.target.files?.[0])} />
            {hasCreatePermission(PermissionEntity.PURCHASE_REQUISITIONS) && <>
              <Button variant="outlined" disabled={importing || loading} onClick={() => importFileRef.current?.click()}>
                {importing ? t('loading') : t('import_csv')}
              </Button>
              <Button variant="text" disabled={importing} onClick={downloadRequisitionTemplate}>{t('download_csv_template')}</Button>
            </>}
            <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} disabled={exporting || loading} onClick={() => void exportRequisitions()}>
              {exporting ? t('loading') : t('export_csv')}
            </Button>
            {hasCreatePermission(PermissionEntity.PURCHASE_REQUISITIONS) && (
              <Button startIcon={<AddOutlinedIcon />} variant="contained" onClick={() => { setEditingRow(null); clearSourceWorkOrderContext(); setFormOpen(true); }}>
                {t('new_purchase_requisition')}
              </Button>
            )}
          </Stack>
        </Stack>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={statusFilter}
          onChange={(_, value) => {
            if (value) setStatusFilter(value);
          }}
          aria-label={t('requisition_status_filter')}
          sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { textTransform: 'none', px: { xs: 1, sm: 2 } } }}
        >
          <ToggleButton value="all">{t('all')}</ToggleButton>
          <ToggleButton value="pending">{t('requisition_status_filter_pending')}</ToggleButton>
          <ToggleButton value="draft">{t('requisition_status_filter_draft')}</ToggleButton>
          <ToggleButton value="approved">{t('requisition_status_filter_approved')}</ToggleButton>
        </ToggleButtonGroup>
        {loading && <Typography color="text.secondary">{t('loading')}</Typography>}
        {!loading && rows.length === 0 && (
          <Card variant="outlined"><CardContent>
            <Typography fontWeight={600}>{t('no_purchase_requisitions')}</Typography>
            <Typography color="text.secondary">{t('no_purchase_requisitions_hint')}</Typography>
          </CardContent></Card>
        )}
        <Grid container spacing={1.5}>
          {rows.map((row) => (
            <Grid item xs={12} md={6} xl={4} key={row.id}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'flex-start' }} spacing={1}>
                    <Box minWidth={0} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                      <Typography variant="h6" fontSize="1rem" sx={{ overflowWrap: 'anywhere' }}>{row.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('requisition_number', { id: row.id })} · {row.requesterName || '—'}
                      </Typography>
                    </Box>
                    <Chip size="small" color={statusColor(row.status)} label={statusLabel(row.status)} sx={{ maxWidth: '100%' }} />
                  </Stack>
                  {row.requiredDate && (
                    <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                      {t('required_date')}: {new Date(row.requiredDate).toLocaleDateString()}
                    </Typography>
                  )}
                  {row.sourceWorkOrderName && (
                    <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                      {t('requisition_source_work_order')}: {row.sourceWorkOrderName}
                    </Typography>
                  )}
                  {row.justification && <Typography variant="body2" sx={{ mt: 1 }}>{row.justification}</Typography>}
                  {row.decisionAt && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      {t('requisition_decided_on', { date: new Date(row.decisionAt).toLocaleDateString() })}
                    </Typography>
                  )}
                  {row.decisionNote && (
                    <Alert severity={row.status === 'REJECTED' ? 'warning' : 'info'} sx={{ mt: 1 }}>
                      <strong>{t('requisition_review_note')}:</strong> {row.decisionNote}
                    </Alert>
                  )}
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={1}>
                    {row.lines.map((line) => (
                      <Stack key={line.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={{ xs: 0.25, sm: 1 }}>
                        <Box minWidth={0}>
                          <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{line.partName}</Typography>
                          {line.siteName && <Typography variant="caption" color="text.secondary">{t('site')}: {line.siteName}</Typography>}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'left', sm: 'right' }, whiteSpace: { xs: 'normal', sm: 'nowrap' }, flexShrink: 0 }}>
                          {t('remaining')}: {line.quantity - line.orderedQuantity} / {line.quantity} {line.unit || ''}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
                    <ProcurementDocumentModal kind="purchase-requisitions" sourceId={row.id}
                      disabled={['REJECTED', 'CANCELLED'].includes(row.status)}
                      issueDisabled={row.requesterId !== user?.id && !canEditOther} />
                    {row.status === 'PENDING_APPROVAL' && Boolean(row.approvalLevelCount) && (
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, mr: 1, overflowWrap: 'anywhere' }}>
                        {t('approval_level')} {(row.approvalStep || 0) + 1}/{row.approvalLevelCount}
                        {row.currentApproverId === user?.id ? ` · ${t('your_approval')}` : ` · ${t('waiting_for_approver')}`}
                      </Typography>
                    )}
                    {row.status === 'DRAFT' && (row.requesterId === user?.id || canEditOther) && (
                      <>
                        <Button size="small" sx={{ minHeight: 40, justifyContent: 'flex-start' }} startIcon={<EditOutlinedIcon />} onClick={() => editDraft(row)}>
                          {t('edit')}
                        </Button>
                        {row.requesterId === user?.id && (
                        <Button size="small" sx={{ minHeight: 40, justifyContent: 'flex-start' }} startIcon={<SendOutlinedIcon />} onClick={() => void submitDraft(row)}>
                          {t('submit_for_approval')}
                        </Button>
                        )}
                      </>
                    )}
                    {row.status === 'PENDING_APPROVAL' && canApprove && row.requesterId !== user?.id &&
                      (!row.currentApproverId || row.currentApproverId === user?.id) && (
                      <Button size="small" sx={{ minHeight: 40, justifyContent: 'flex-start' }} startIcon={<CheckCircleOutlineIcon />} onClick={() => { setDecisionNote(''); setDecisionRow(row); }}>
                        {t('review_requisition')}
                      </Button>
                    )}
                    {row.status === 'PENDING_APPROVAL' && canManageApproval && row.currentApproverId !== user?.id && (
                      <>
                        <Button size="small" sx={{ minHeight: 40, justifyContent: 'flex-start' }}
                          startIcon={<CheckCircleOutlineIcon />} onClick={() => { setDecisionNote(''); setDecisionRow(row); }}>
                          {t('ap_manage_blocked')}
                        </Button>
                        {Boolean(row.approvalLevelCount) && <Button size="small" sx={{ minHeight: 40, justifyContent: 'flex-start' }}
                          onClick={() => void openLegacyReassignment(row)}>
                          {t('reassign_approver', 'Reassign approver')}
                        </Button>}
                      </>
                    )}
                    {['APPROVED', 'PARTIALLY_ORDERED'].includes(row.status) && canCreateOrder && (
                      <Button size="small" sx={{ minHeight: 40, justifyContent: 'flex-start' }} startIcon={<ShoppingCartCheckoutOutlinedIcon />} onClick={() => openConversion(row)}>
                        {t('convert_to_purchase_order')}
                      </Button>
                    )}
                    {row.status === 'DRAFT' && (canDelete || row.requesterId === user?.id) && (
                      <IconButton aria-label={t('delete')} size="small" onClick={() => setDeleteRow(row)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {hasMore && <Button variant="outlined" onClick={() => void loadMore()} disabled={loading} sx={{ alignSelf: 'center' }}>{t('load_more')}</Button>}
      </Stack>

      <Dialog open={formOpen} onClose={() => { setFormOpen(false); setEditingRow(null); clearSourceWorkOrderContext(); }} fullScreen={fullScreen} fullWidth maxWidth="md">
        <DialogTitle>{editingRow ? t('edit_purchase_requisition') : t('new_purchase_requisition')}</DialogTitle>
        <DialogContent dividers>
          {sourceWorkOrder && !editingRow && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  {t('requisition_from_work_order', { workOrder: sourceWorkOrder.name })}
                </Typography>
                <Typography variant="body2">
                  {t('requisition_from_work_order_parts_notice')}
                </Typography>
              </Stack>
            </Alert>
          )}
          {sourcePart && !editingRow && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('requisition_from_low_stock', {
                part: sourcePart.part.name,
                quantity: sourcePart.suggestedQuantity,
                unit: sourcePart.part.unit || ''
              })}
            </Alert>
          )}
          <Form
            fields={formFields}
            validation={Yup.object().shape({
              title: Yup.string().required(t('required_name')),
              partQuantities: Yup.array().min(1, t('requisition_needs_one_line')).required(t('requisition_needs_one_line'))
            })}
            submitText={t('save_draft')}
            enableReinitialize
            values={editingRow ? {
              title: editingRow.title,
              justification: editingRow.justification,
              requiredDate: editingRow.requiredDate ? new Date(editingRow.requiredDate) : null,
              partQuantities: editingRow.lines.map((line) => ({
                id: line.id,
                quantity: line.quantity,
                siteId: line.siteId,
                siteName: line.siteName,
                part: { id: line.partId, name: line.partName, description: '', cost: 0, unit: line.unit || '' }
              }))
            } : {
              title: sourceWorkOrder
                ? t('requisition_title_from_work_order', { workOrder: sourceWorkOrder.name })
                : sourcePart
                  ? t('requisition_title_from_part', {
                      part: sourcePart.part.name
                    })
                  : '',
              requiredDate: null,
              partQuantities: sourcePart
                ? [
                    {
                      part: sourcePart.part,
                      quantity: sourcePart.suggestedQuantity
                    }
                  ]
                : [],
              sourceWorkOrderId: sourceWorkOrder?.id
            }}
            onChange={() => {}}
            onSubmit={async (values) => {
              if (!values.partQuantities?.length) {
                showSnackBar(t('select_one_part'), 'error');
                return;
              }
              if (values.partQuantities.some((line) => !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0)) {
                showSnackBar(t('requisition_quantity_required'), 'error');
                return;
              }
              try {
                const payload = {
                  title: values.title,
                  justification: values.justification,
                  requiredDate: values.requiredDate,
                  sourceWorkOrderId: values.sourceWorkOrderId,
                  lines: values.partQuantities.map((line) => ({
                    partId: line.part?.id || line.part,
                    quantity: Number(line.quantity),
                    notes: line.notes,
                    siteId: line.siteId
                  }))
                };
                if (editingRow) await api.put(`purchase-requisitions/${editingRow.id}`, payload);
                else await api.post('purchase-requisitions', payload);
                showSnackBar(editingRow ? t('requisition_updated') : t('requisition_created'), 'success');
                setFormOpen(false);
                setEditingRow(null);
                clearSourceWorkOrderContext();
                await refresh();
              } catch (error) {
                showSnackBar(t(getErrorMessage(error, 'requisition_action_failed')), 'error');
              }
            }}
          />
        </DialogContent>
      <DialogActions><Button onClick={() => { setFormOpen(false); setEditingRow(null); clearSourceWorkOrderContext(); }}>{t('close')}</Button></DialogActions>
      </Dialog>

      <Dialog open={!!decisionRow} onClose={() => !deciding && setDecisionRow(null)} fullScreen={fullScreen} fullWidth maxWidth="xs">
        <DialogTitle>{t('review_requisition')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>{decisionRow?.title}</Typography>
            <ApprovalProgress state={approvalState} type="PR" documentId={decisionRow?.id} />
            {decisionRow?.justification && <Typography color="text.secondary">{decisionRow.justification}</Typography>}
            <Stack spacing={0.5}>
              {decisionRow?.lines.map((line) => (
                <Typography key={line.id} variant="body2">
                  {line.partName}: {line.quantity} {line.unit || ''}
                </Typography>
              ))}
            </Stack>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label={`${t('requisition_review_note')} (${t('rejection_note_required')})`}
              inputProps={{ maxLength: approvalState.summary ? 1000 : 2000 }}
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={deciding} onClick={() => setDecisionRow(null)}>{t('cancel')}</Button>
          <Button color="error" disabled={deciding || !decisionNote.trim() || !approvalState.ready || Boolean(approvalState.summary && !approvalState.summary.canDecide)} onClick={() => void decide(false)}>{t('reject')}</Button>
          <Button variant="contained" disabled={deciding || !approvalState.ready || Boolean(approvalState.summary && !approvalState.summary.canDecide)} onClick={() => void decide(true)}>{t('approve')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!reassignmentRow} onClose={() => !reassigning && setReassignmentRow(null)} fullScreen={fullScreen} fullWidth maxWidth="xs">
        <DialogTitle>{t('reassign_approver', 'Reassign approver')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">{reassignmentRow?.title}</Typography>
            {reassignmentTargets.length === 0 ? <Alert severity="warning">{t('no_eligible_approvers', 'No eligible approvers are available.')}</Alert> : (
              <TextField
                select
                fullWidth
                label={t('approver', 'Approver')}
                value={reassignmentTargetId}
                onChange={(event) => setReassignmentTargetId(Number(event.target.value))}>
                {reassignmentTargets.map((candidate) => <MenuItem key={candidate.id} value={candidate.id}>
                  {[candidate.firstName, candidate.lastName].filter(Boolean).join(' ')}
                </MenuItem>)}
              </TextField>
            )}
            <TextField
              fullWidth
              multiline
              minRows={2}
              label={t('reassignment_reason', 'Reason for reassignment')}
              value={reassignmentReason}
              inputProps={{ maxLength: 1000 }}
              onChange={(event) => setReassignmentReason(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={reassigning} onClick={() => setReassignmentRow(null)}>{t('cancel')}</Button>
          <Button variant="contained" disabled={reassigning || !reassignmentTargetId || !reassignmentReason.trim()}
            onClick={() => void submitLegacyReassignment()}>{t('confirm', 'Confirm')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteRow} onClose={() => setDeleteRow(null)} fullScreen={fullScreen} fullWidth maxWidth="xs">
        <DialogTitle>{t('delete_purchase_requisition')}</DialogTitle>
        <DialogContent>{t('confirm_delete_purchase_requisition', { title: deleteRow?.title })}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRow(null)}>{t('cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => deleteRow && void deleteDraft(deleteRow)}>
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!convertRow} onClose={() => setConvertRow(null)} fullScreen={fullScreen} fullWidth maxWidth="sm">
        <DialogTitle>{t('convert_to_purchase_order')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select fullWidth label={t('vendor')} value={vendorId || ''} onChange={(event) => setVendorId(Number(event.target.value))} SelectProps={{ native: true }}>
              <option value="">{t('select_vendor')}</option>
              {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.companyName}</option>)}
            </TextField>
            {convertRow?.lines.map((line) => {
              const remaining = line.quantity - line.orderedQuantity;
              if (remaining <= 0) return null;
              return <Stack key={line.id} spacing={1}>
                <TextField type="number" fullWidth label={`${line.partName} · ${t('remaining')}: ${remaining} ${line.unit || ''}`} value={quantities[line.id] ?? ''} inputProps={{ min: 0, max: remaining, step: line.unit ? 'any' : 1 }} onChange={(event) => setQuantities((current) => ({ ...current, [line.id]: Number(event.target.value) }))} />
                {(quantities[line.id] || 0) > 0 && <TextField type="number" fullWidth label={t('agreed_unit_price', 'Agreed unit price')} helperText={`${t('company_currency', 'Company currency')}${getCurrencyCode() ? ` · ${getCurrencyCode()}` : ''}`} value={unitPrices[line.id] ?? ''} inputProps={{ min: 0, step: '0.0001' }} onChange={(event) => setUnitPrices((current) => ({ ...current, [line.id]: event.target.value === '' ? '' : Number(event.target.value) }))} />}
              </Stack>;
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertRow(null)}>{t('cancel')}</Button>
          <Button variant="contained" disabled={converting || !vendorId || !Object.values(quantities).some((quantity) => quantity > 0)} onClick={() => void convert()}>
            {converting ? t('loading') : t('create_purchase_order')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default PurchaseRequisitions;
