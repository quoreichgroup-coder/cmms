import {
  Box,
  Button,
  CircularProgress,
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
  Tab,
  Tabs,
  Typography,
  useTheme
} from '@mui/material';
import { ChangeEvent, useContext, useMemo, useState } from 'react';
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
import PartQuantity from 'src/models/owns/partQuantity';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import { respondPurchaseOrder } from '../../../slices/purchaseOrder';
import BasicField from '../components/BasicField';
import { getErrorMessage } from '../../../utils/api';
import Alert from '@mui/material/Alert';
import { canRespondToPurchaseOrders } from './purchaseOrderPermissions';

interface PurchaseOrderDetailsProps {
  purchaseOrder: PurchaseOrder;
  handleOpenUpdate: () => void;
  handleDelete: () => void;
  partQuantities: PartQuantity[];
}
export default function PurchaseOrderDetails(props: PurchaseOrderDetailsProps) {
  const { purchaseOrder, handleOpenUpdate, handleDelete, partQuantities } =
    props;
  const { t }: { t: any } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const [approving, setApproving] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const { hasEditPermission, hasDeletePermission, user } = useAuth();
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState<string>('details');
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
          {hasDeletePermission(
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
            {t('purchase_order_approval_effect_hint')}
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
          <PartQuantitiesList
            partQuantities={partQuantities}
            disabled={
              !hasEditPermission(
                PermissionEntity.PURCHASE_ORDERS,
                purchaseOrder
              ) || purchaseOrder.status !== 'PENDING'
            }
            deleteDisabled={partQuantities.length === 1}
            onChange={debouncedPartQuantityChange}
          />
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
