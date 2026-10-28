import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  debounce,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Link,
  Stack,
  TextField,
  Tab,
  Tabs,
  Typography,
  useTheme
} from '@mui/material';
import { ChangeEvent, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import PurchaseOrder from '../../../models/owns/purchaseOrder';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';
import { editPartQuantity } from '../../../slices/partQuantity';
import { useDispatch } from '../../../store';
import PartQuantitiesList from '../components/PartQuantitiesList';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { PartQuantityMiniDTO } from '../../../models/owns/partQuantity';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import { respondPurchaseOrder } from '../../../slices/purchaseOrder';
import BasicField from '../components/BasicField';
import { getErrorMessage } from '../../../utils/api';
import Alert from '@mui/material/Alert';
import { canRespondToPurchaseOrders } from './purchaseOrderPermissions';
import { PurchaseOrderReceipt } from '../../../models/owns/purchaseOrderReceipt';
import api from '../../../utils/api';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { useMediaQuery } from '@mui/material';

interface PurchaseOrderDetailsProps {
  purchaseOrder: PurchaseOrder;
  handleOpenUpdate: () => void;
  handleDelete: () => void;
  partQuantities: PartQuantityMiniDTO[];
  onReceiptCreated: () => void;
}
const newReceiptIdempotencyKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function PurchaseOrderDetails(props: PurchaseOrderDetailsProps) {
  const { purchaseOrder, handleOpenUpdate, handleDelete, partQuantities, onReceiptCreated } =
    props;
  const { t }: { t: any } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const [approving, setApproving] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptSubmitting, setReceiptSubmitting] = useState(false);
  const [receiptReference, setReceiptReference] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptIdempotencyKey, setReceiptIdempotencyKey] = useState('');
  const [receiptQuantities, setReceiptQuantities] = useState<Record<number, string>>({});
  const [receipts, setReceipts] = useState<PurchaseOrderReceipt[]>([]);
  const { hasEditPermission, hasDeletePermission, user } = useAuth();
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentTab, setCurrentTab] = useState<string>('details');
  const canReceive = Boolean(
    purchaseOrder.receivingWorkflowEnabled && purchaseOrder.status === 'APPROVED' &&
    user?.role?.editOtherPermissions?.includes(PermissionEntity.PURCHASE_RECEIPTS)
  );
  const canViewReceipts = Boolean(
    user?.role?.viewPermissions?.includes(PermissionEntity.PURCHASE_RECEIPTS)
  );
  const receiptProgressKey = purchaseOrder.status !== 'APPROVED'
    ? null
    : partQuantities.length === 0
      ? 'receipt_pending'
      : partQuantities.every((line) => (line.remainingToReceive ?? line.quantity) <= 0)
      ? 'receipt_complete'
      : partQuantities.some((line) => (line.receivedQuantity ?? 0) > 0)
        ? 'receipt_partial'
        : 'receipt_pending';

  useEffect(() => {
    if (!purchaseOrder.receivingWorkflowEnabled || !canViewReceipts) {
      setReceipts([]);
      return;
    }
    api.get<PurchaseOrderReceipt[]>(`purchase-orders/${purchaseOrder.id}/receipts`)
      .then(setReceipts)
      .catch((error) => showSnackBar(getErrorMessage(error), 'error'));
  }, [purchaseOrder.id, purchaseOrder.receivingWorkflowEnabled, canViewReceipts, showSnackBar]);

  const openReceipt = () => {
    setReceiptQuantities(Object.fromEntries(partQuantities
      .filter((line) => (line.remainingToReceive ?? line.quantity) > 0)
      .map((line) => [line.id, String(line.remainingToReceive ?? line.quantity)])));
    setReceiptReference('');
    setReceiptNotes('');
    setReceiptIdempotencyKey(newReceiptIdempotencyKey());
    setReceiptDialogOpen(true);
  };

  const submitReceipt = async () => {
    if (receiptSubmitting) return;
    const lines = partQuantities.map((line) => ({
      purchaseOrderLineId: line.id,
      quantity: Number(receiptQuantities[line.id] || 0)
    })).filter((line) => line.quantity > 0);
    if (lines.length === 0) return;
    setReceiptSubmitting(true);
    try {
      await api.post(`purchase-orders/${purchaseOrder.id}/receipts`, {
        idempotencyKey: receiptIdempotencyKey,
        reference: receiptReference.trim() || null,
        notes: receiptNotes.trim() || null,
        lines
      });
      if (canViewReceipts) {
        const updated = await api.get<PurchaseOrderReceipt[]>(`purchase-orders/${purchaseOrder.id}/receipts`);
        setReceipts(updated);
      }
      setReceiptDialogOpen(false);
      setReceiptIdempotencyKey('');
      onReceiptCreated();
      showSnackBar(t('receipt_saved'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error), 'error');
    } finally {
      setReceiptSubmitting(false);
    }
  };
  const tabs = [
    { value: 'details', label: t('details') },
    { value: 'parts', label: t('parts') },
    { value: 'shipping', label: t('shipping_information') },
    { value: 'additionalInfos', label: t('additional_information') }
  ];

  const handleTabsChange = (_event: ChangeEvent<{}>, value: string): void => {
    setCurrentTab(value);
  };
  const onPartQuantityChange = (value: string, partQuantity) => {
    dispatch(
      editPartQuantity(purchaseOrder.id, partQuantity.id, Number(value), true)
    )
      .then(() => showSnackBar(t('quantity_edit_success'), 'success'))
      .catch((err) => showSnackBar(t('quantity_edit_failure'), 'error'));
  };
  const debouncedPartQuantityChange = useMemo(
    () => debounce(onPartQuantityChange, 1500),
    []
  );
  const onRespond = async (approved: boolean): Promise<boolean> => {
    if (approving || cancelling) return false;
    if (approved) {
      setApproving(true);
    } else {
      setCancelling(true);
    }
    try {
      await dispatch(respondPurchaseOrder(purchaseOrder.id, approved));
      showSnackBar(
        t(approved ? 'purchase_order_approved' : 'purchase_order_rejected'),
        'success'
      );
      return true;
    } catch (error) {
      showSnackBar(getErrorMessage(error), 'error');
      return false;
    } finally {
      setApproving(false);
      setCancelling(false);
    }
  };
  const detailsFieldsToRender = (
    purchaseOrder1: PurchaseOrder
  ): {
    label: string;
    value: string | number;
    type?: 'vendor';
    id?: number;
  }[] => [
    {
      label: t('name'),
      value: purchaseOrder1.name
    },
    {
      label: t('id'),
      value: purchaseOrder1.id
    },
    {
      label: t('due_date'),
      value: getFormattedDate(purchaseOrder1.shippingDueDate)
    },
    {
      label: t('category'),
      value: purchaseOrder1.category?.name
    },
    {
      label: t('created_at'),
      value: getFormattedDate(purchaseOrder1.createdAt)
    },
    {
      label: t('vendor'),
      type: 'vendor',
      value: purchaseOrder1.vendor?.companyName,
      id: purchaseOrder1.vendor?.id
    }
  ];
  const shippingFieldsToRender = (
    purchaseOrder1: PurchaseOrder
  ): { label: string; value: any }[] => [
    {
      label: t('Company Name'),
      value: purchaseOrder1.shippingCompanyName
    },
    {
      label: t('address'),
      value: purchaseOrder1.shippingAddress
    },
    {
      label: t('city'),
      value: purchaseOrder1.shippingCity
    },
    {
      label: t('state'),
      value: purchaseOrder1.shippingState
    },
    {
      label: t('phone'),
      value: purchaseOrder1.shippingPhone
    },
    {
      label: t('fax_number'),
      value: purchaseOrder1.shippingFax
    },
    {
      label: t('ship_to'),
      value: purchaseOrder1.shippingShipToName
    },
    {
      label: t('additional_details'),
      value: purchaseOrder1.shippingAdditionalDetail
    }
  ];
  const additionalInfosFieldsToRender = (
    purchaseOrder1: PurchaseOrder
  ): { label: string; value: any }[] => [
    {
      label: t('requisitioner'),
      value: purchaseOrder1.additionalInfoRequisitionedName
    },
    {
      label: t('shipping_method'),
      value: purchaseOrder1.additionalInfoShippingMethod
    },
    {
      label: t('notes'),
      value: purchaseOrder1.additionalInfoNotes
    },
    {
      label: t('terms'),
      value: purchaseOrder1.additionalInfoTerm
    }
  ];
  return (
    <Grid
      container
      justifyContent="center"
      alignItems="stretch"
      spacing={2}
      padding={4}
    >
      <Grid
        item
        xs={12}
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h2">{purchaseOrder?.name}</Typography>
          <Typography variant="h6">{purchaseOrder?.shippingAddress}</Typography>
          <Typography variant="h6">{t(purchaseOrder?.status)}</Typography>
          {purchaseOrder.receivingWorkflowEnabled && canViewReceipts && receiptProgressKey && (
            <Chip size="small" sx={{ mt: 1 }} color={receiptProgressKey === 'receipt_complete' ? 'success' : receiptProgressKey === 'receipt_partial' ? 'warning' : 'default'} label={t(receiptProgressKey)} />
          )}
        </Box>
        <Box>
          {hasEditPermission(
            PermissionEntity.PURCHASE_ORDERS,
            purchaseOrder
          ) && (
            <IconButton onClick={handleOpenUpdate} style={{ marginRight: 10 }}>
              <EditOutlinedIcon color="primary" />
            </IconButton>
          )}
          {purchaseOrder.status !== 'APPROVED' && hasDeletePermission(
            PermissionEntity.PURCHASE_ORDERS,
            purchaseOrder
          ) && (
            <IconButton onClick={handleDelete}>
              <DeleteOutlinedIcon color="error" />
            </IconButton>
          )}
        </Box>
      </Grid>
      <Divider />
      {purchaseOrder.status === 'PENDING' &&
        canRespondToPurchaseOrders(user?.role) && (
          <>
            <Grid
              item
              xs={12}
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around'
              }}
            >
              <Button
                startIcon={
                  cancelling ? (
                    <CircularProgress size="1rem" />
                  ) : (
                    <ClearOutlinedIcon />
                  )
                }
                onClick={() => onRespond(false)}
                disabled={approving || cancelling}
                variant="outlined"
              >
                {t('reject')}
              </Button>
              <Button
                startIcon={
                  approving ? (
                    <CircularProgress size="1rem" sx={{ color: 'white' }} />
                  ) : (
                    <CheckOutlinedIcon />
                  )
                }
                onClick={() => setApprovalDialogOpen(true)}
                disabled={approving || cancelling}
                variant="contained"
              >
                {t('approve')}
              </Button>
            </Grid>
            <Divider />
          </>
        )}
      <Dialog
        open={approvalDialogOpen}
        onClose={() => {
          if (!approving) setApprovalDialogOpen(false);
        }}
        aria-labelledby="purchase-order-approval-title"
        aria-describedby="purchase-order-approval-description"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="purchase-order-approval-title">
          {t('purchase_order_approval_confirmation_title')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="purchase-order-approval-description"
            sx={{ mb: 2 }}
          >
            {t('purchase_order_approval_confirmation_body')}
          </DialogContentText>
          <Alert severity="warning">
            {purchaseOrder.receivingWorkflowEnabled
              ? t('approval_does_not_receive_stock')
              : t('purchase_order_approval_effect_hint')}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setApprovalDialogOpen(false)}
            disabled={approving}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              const approved = await onRespond(true);
              if (approved) setApprovalDialogOpen(false);
            }}
            disabled={approving || cancelling}
            startIcon={
              approving ? (
                <CircularProgress size="1rem" />
              ) : (
                <CheckOutlinedIcon />
              )
            }
          >
            {t('approve')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={receiptDialogOpen} onClose={() => !receiptSubmitting && setReceiptDialogOpen(false)} fullScreen={fullScreen} fullWidth maxWidth="sm">
        <DialogTitle>{t('record_receipt')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">{t('receipt_workflow_hint')}</Alert>
            <TextField fullWidth label={t('delivery_reference')} value={receiptReference} inputProps={{ maxLength: 100 }} onChange={(event) => { setReceiptReference(event.target.value); setReceiptIdempotencyKey(newReceiptIdempotencyKey()); }} />
            {partQuantities.filter((line) => (line.remainingToReceive ?? line.quantity) > 0).map((line) => {
              const remaining = line.remainingToReceive ?? line.quantity;
              return (
                <TextField
                  key={line.id}
                  type="number"
                  fullWidth
                  label={`${line.part.name} · ${t('remaining')}: ${remaining} ${line.part.unit || ''}`}
                  value={receiptQuantities[line.id] ?? ''}
                  inputProps={{ min: 0, max: remaining, step: line.part.unit ? 'any' : 1, inputMode: 'decimal' }}
                  onChange={(event) => { setReceiptQuantities((current) => ({ ...current, [line.id]: event.target.value })); setReceiptIdempotencyKey(newReceiptIdempotencyKey()); }}
                />
              );
            })}
            <TextField fullWidth multiline minRows={2} label={t('notes')} value={receiptNotes} inputProps={{ maxLength: 2000 }} onChange={(event) => { setReceiptNotes(event.target.value); setReceiptIdempotencyKey(newReceiptIdempotencyKey()); }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptDialogOpen(false)} disabled={receiptSubmitting}>{t('cancel')}</Button>
          <Button variant="contained" onClick={() => void submitReceipt()} disabled={receiptSubmitting || !partQuantities.some((line) => Number(receiptQuantities[line.id]) > 0)} startIcon={receiptSubmitting ? <CircularProgress size="1rem" /> : <LocalShippingOutlinedIcon />}>
            {t('record_receipt')}
          </Button>
        </DialogActions>
      </Dialog>
      <Grid item xs={12}>
        <Tabs
          onChange={handleTabsChange}
          value={currentTab}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          {tabs.map((tab) => (
            <Tab key={tab.value} label={tab.label} value={tab.value} />
          ))}
        </Tabs>
      </Grid>
      <Grid item xs={12}>
        {currentTab === 'details' && (
          <Grid container spacing={2}>
            {detailsFieldsToRender(purchaseOrder).map((field) => (
              <BasicField
                key={field.id}
                label={field.label}
                value={field.value}
                type={field.type}
                id={field.id}
              />
            ))}
          </Grid>
        )}
        {currentTab === 'parts' && (
          <Stack spacing={2}>
            {purchaseOrder.receivingWorkflowEnabled && (
              <Card variant="outlined">
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1}>
                    <Box>
                      <Typography variant="h6">{t('receiving')}</Typography>
                      <Typography variant="body2" color="text.secondary">{t('receipt_workflow_hint')}</Typography>
                    </Box>
                    {canReceive && partQuantities.some((line) => (line.remainingToReceive ?? line.quantity) > 0) && (
                      <Button variant="contained" startIcon={<LocalShippingOutlinedIcon />} onClick={openReceipt}>
                        {t('record_receipt')}
                      </Button>
                    )}
                  </Stack>
                  {canViewReceipts && (receipts.length > 0 ? (
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      {receipts.map((receipt) => (
                        <Card key={receipt.id} variant="outlined" sx={{ bgcolor: 'background.default' }}>
                          <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.5}>
                              <Typography fontWeight={600}>{receipt.reference || `${t('receipt')} #${receipt.id}`}</Typography>
                              <Typography variant="body2" color="text.secondary">{getFormattedDate(receipt.receivedAt)} · {receipt.receivedByName}</Typography>
                            </Stack>
                            <Stack spacing={0.5} sx={{ mt: 1 }}>
                              {receipt.lines.map((line) => (
                                <Typography key={line.id} variant="body2">{line.partName}: {line.quantity} {line.unit || ''}</Typography>
                              ))}
                            </Stack>
                            {receipt.notes && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{receipt.notes}</Typography>}
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('no_receipts_yet')}</Typography>
                  ))}
                </CardContent>
              </Card>
            )}
            <PartQuantitiesList
              partQuantities={partQuantities}
              disabled={
                !hasEditPermission(PermissionEntity.PURCHASE_ORDERS, purchaseOrder) ||
                purchaseOrder.status !== 'PENDING'
              }
              deleteDisabled={partQuantities.length === 1}
              onChange={debouncedPartQuantityChange}
              showReceiptProgress={purchaseOrder.receivingWorkflowEnabled && canViewReceipts}
            />
          </Stack>
        )}
        {currentTab === 'shipping' && (
          <Grid container spacing={2}>
            {shippingFieldsToRender(purchaseOrder).map((field) => (
              <BasicField
                key={field.label}
                label={field.label}
                value={field.value}
              />
            ))}
          </Grid>
        )}
        {currentTab === 'additionalInfos' && (
          <Grid container spacing={2}>
            {additionalInfosFieldsToRender(purchaseOrder).map((field) => (
              <BasicField
                key={field.label}
                label={field.label}
                value={field.value}
              />
            ))}
          </Grid>
        )}
      </Grid>
    </Grid>
  );
}
