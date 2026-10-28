import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
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
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Yup from 'yup';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { TitleContext } from '../../../contexts/TitleContext';
import useAuth from '../../../hooks/useAuth';
import { PurchaseRequisition } from '../../../models/owns/purchaseRequisition';
import { Page } from '../../../models/owns/page';
import { VendorMiniDTO } from '../../../models/owns/vendor';
import { PermissionEntity } from '../../../models/owns/role';
import { PlanFeature } from '../../../models/owns/subscriptionPlan';
import api from '../../../utils/api';
import Form from '../components/form';
import FeatureErrorMessage from '../components/FeatureErrorMessage';
import PermissionErrorMessage from '../components/PermissionErrorMessage';
import { IField } from '../type';

function PurchaseRequisitions() {
  const { t }: { t: any } = useTranslation();
  const { setTitle } = useContext(TitleContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    hasFeature,
    hasViewPermission,
    hasViewOtherPermission,
    hasCreatePermission
  } = useAuth();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [rows, setRows] = useState<PurchaseRequisition[]>([]);
  const [vendors, setVendors] = useState<VendorMiniDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [pageNumber, setPageNumber] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PurchaseRequisition | null>(null);
  const [sourceWorkOrder, setSourceWorkOrder] = useState<{ id: number; name: string } | null>(null);
  const [decisionRow, setDecisionRow] = useState<PurchaseRequisition | null>(null);
  const [deleteRow, setDeleteRow] = useState<PurchaseRequisition | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [convertRow, setConvertRow] = useState<PurchaseRequisition | null>(null);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  // The decision endpoint requires edit-other plus visibility of other users' requests.
  const canApprove =
    user?.role?.editOtherPermissions?.includes(
      PermissionEntity.PURCHASE_REQUISITION_APPROVAL
    ) &&
    hasViewPermission(PermissionEntity.PURCHASE_REQUISITIONS) &&
    hasViewOtherPermission(PermissionEntity.PURCHASE_REQUISITIONS);
  const canEditOther = canApprove;
  const canDelete = user?.role?.deleteOtherPermissions?.includes(
    PermissionEntity.PURCHASE_REQUISITIONS
  );
  const canCreateOrder = user?.role?.createPermissions?.includes(
    PermissionEntity.PURCHASE_ORDERS
  );
  const canTrackOwnRequests =
    hasViewPermission(PermissionEntity.PURCHASE_REQUISITIONS) ||
    hasCreatePermission(PermissionEntity.PURCHASE_REQUISITIONS);

  const clearSourceWorkOrderContext = () => {
    setSourceWorkOrder(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('sourceWorkOrderId');
    nextParams.delete('sourceWorkOrderName');
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    setTitle(t('purchase_requisitions'));
  }, [setTitle, t]);

  useEffect(() => {
    const id = Number(searchParams.get('sourceWorkOrderId'));
    if (!Number.isSafeInteger(id) || id <= 0) return;
    setSourceWorkOrder({
      id,
      name: searchParams.get('sourceWorkOrderName') || `WO-${id}`
    });
    setEditingRow(null);
    setFormOpen(true);
  }, [searchParams]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.post<Page<PurchaseRequisition>>(
        'purchase-requisitions/search',
        { pageNum: 0, pageSize: 30 }
      );
      setRows(result.content);
      setPageNumber(0);
      setHasMore(!result.last);
    } catch {
      showSnackBar(t('purchase_requisitions_load_failed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackBar, t]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    const next = pageNumber + 1;
    setLoading(true);
    try {
      const result = await api.post<Page<PurchaseRequisition>>(
        'purchase-requisitions/search',
        { pageNum: next, pageSize: 30 }
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
        multiple: true
      }
    ],
    [t]
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
    } catch {
      showSnackBar(t('requisition_action_failed'), 'error');
    }
  };

  const decide = async (approved: boolean) => {
    if (!decisionRow) return;
    try {
      await api.post(`purchase-requisitions/${decisionRow.id}/decision`, {
        approved,
        note: decisionNote.trim() || null
      });
      showSnackBar(
        approved ? t('requisition_approved') : t('requisition_rejected'),
        'success'
      );
      setDecisionRow(null);
      setDecisionNote('');
      await refresh();
    } catch {
      showSnackBar(t('requisition_action_failed'), 'error');
    }
  };

  const deleteDraft = async (row: PurchaseRequisition) => {
    try {
      await api.deletes(`purchase-requisitions/${row.id}`);
      showSnackBar(t('requisition_deleted'), 'success');
      setDeleteRow(null);
      await refresh();
    } catch {
      showSnackBar(t('requisition_action_failed'), 'error');
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
  };

  const convert = async () => {
    if (!convertRow || !vendorId || converting) return;
    setConverting(true);
    try {
      const lines = convertRow.lines
        .map((line) => ({ requisitionLineId: line.id, quantity: quantities[line.id] || 0 }))
        .filter((line) => line.quantity > 0);
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
    } catch {
      showSnackBar(t('requisition_action_failed'), 'error');
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
          {hasCreatePermission(PermissionEntity.PURCHASE_REQUISITIONS) && (
            <Button startIcon={<AddOutlinedIcon />} variant="contained" onClick={() => { setEditingRow(null); clearSourceWorkOrderContext(); setFormOpen(true); }}>
              {t('new_purchase_requisition')}
            </Button>
          )}
        </Stack>
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
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box minWidth={0}>
                      <Typography variant="h6" fontSize="1rem" noWrap>{row.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('requisition_number', { id: row.id })} · {row.requesterName || '—'}
                      </Typography>
                    </Box>
                    <Chip size="small" color={statusColor(row.status)} label={statusLabel(row.status)} />
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
                      <Stack key={line.id} direction="row" justifyContent="space-between" spacing={1}>
                        <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{line.partName}</Typography>
                        <Typography variant="body2" sx={{ textAlign: 'right', whiteSpace: { xs: 'normal', sm: 'nowrap' }, flexShrink: 0 }}>
                          {t('remaining')}: {line.quantity - line.orderedQuantity} / {line.quantity} {line.unit || ''}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
                    {row.status === 'DRAFT' && (row.requesterId === user?.id || canEditOther) && (
                      <>
                        <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => editDraft(row)}>
                          {t('edit')}
                        </Button>
                        {row.requesterId === user?.id && (
                        <Button size="small" startIcon={<SendOutlinedIcon />} onClick={() => void submitDraft(row)}>
                          {t('submit_for_approval')}
                        </Button>
                        )}
                      </>
                    )}
                    {row.status === 'PENDING_APPROVAL' && canApprove && row.requesterId !== user?.id && (
                      <Button size="small" startIcon={<CheckCircleOutlineIcon />} onClick={() => { setDecisionNote(''); setDecisionRow(row); }}>
                        {t('review_requisition')}
                      </Button>
                    )}
                    {['APPROVED', 'PARTIALLY_ORDERED'].includes(row.status) && canCreateOrder && (
                      <Button size="small" startIcon={<ShoppingCartCheckoutOutlinedIcon />} onClick={() => openConversion(row)}>
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
                part: { id: line.partId, name: line.partName, description: '', cost: 0, unit: line.unit || '' }
              }))
            } : {
              title: sourceWorkOrder
                ? t('requisition_title_from_work_order', { workOrder: sourceWorkOrder.name })
                : '',
              requiredDate: null,
              partQuantities: [],
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
                    notes: line.notes
                  }))
                };
                if (editingRow) await api.put(`purchase-requisitions/${editingRow.id}`, payload);
                else await api.post('purchase-requisitions', payload);
                showSnackBar(editingRow ? t('requisition_updated') : t('requisition_created'), 'success');
                setFormOpen(false);
                setEditingRow(null);
                clearSourceWorkOrderContext();
                await refresh();
              } catch {
                showSnackBar(t('requisition_action_failed'), 'error');
              }
            }}
          />
        </DialogContent>
      <DialogActions><Button onClick={() => { setFormOpen(false); setEditingRow(null); clearSourceWorkOrderContext(); }}>{t('close')}</Button></DialogActions>
      </Dialog>

      <Dialog open={!!decisionRow} onClose={() => setDecisionRow(null)} fullScreen={fullScreen} fullWidth maxWidth="xs">
        <DialogTitle>{t('review_requisition')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>{decisionRow?.title}</Typography>
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
              inputProps={{ maxLength: 2000 }}
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="error" disabled={!decisionNote.trim()} onClick={() => void decide(false)}>{t('reject')}</Button>
          <Button variant="contained" onClick={() => void decide(true)}>{t('approve')}</Button>
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
              return <TextField key={line.id} type="number" fullWidth label={`${line.partName} · ${t('remaining')}: ${remaining} ${line.unit || ''}`} value={quantities[line.id] ?? ''} inputProps={{ min: 0, max: remaining, step: line.unit ? 'any' : 1 }} onChange={(event) => setQuantities((current) => ({ ...current, [line.id]: Number(event.target.value) }))} />;
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
