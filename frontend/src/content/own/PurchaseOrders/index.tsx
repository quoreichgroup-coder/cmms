import { Helmet } from 'react-helmet-async';
import {
  Box,
  Button,
  Card,
  Chip,
  debounce,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { TitleContext } from '../../../contexts/TitleContext';
import { GridEnrichedColDef } from '@mui/x-data-grid/models/colDef/gridColDef';
import CustomDataGrid from '../components/CustomDatagrid';
import { GridRenderCellParams, GridToolbar } from '@mui/x-data-grid';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import PurchaseOrder from '../../../models/owns/purchaseOrder';
import { useDispatch, useSelector } from '../../../store';
import {
  clearSinglePurchaseOrder,
  deletePurchaseOrder,
  editPurchaseOrderWithLines,
  getPurchaseOrders,
  getPurchaseOrdersToReceive,
  getSinglePurchaseOrder
} from '../../../slices/purchaseOrder';
import ConfirmDialog from '../components/ConfirmDialog';
import { useNavigate, useParams } from 'react-router-dom';
import PurchaseOrderDetails from './PurchaseOrderDetails';
import { IField, getCustomFieldsIFields } from '../type';
import Form from '../components/form';
import * as Yup from 'yup';
import { isNumeric } from '../../../utils/validators';
import { formatSelect, formatCustomFields } from '../../../utils/formatters';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';
import PermissionErrorMessage from '../components/PermissionErrorMessage';
import { PlanFeature } from '../../../models/owns/subscriptionPlan';
import FeatureErrorMessage from '../components/FeatureErrorMessage';
import NoRowsMessageWrapper from '../components/NoRowsMessageWrapper';
import { getPartQuantitiesByPurchaseOrder } from '../../../slices/partQuantity';
import Category from '../../../models/owns/category';
import { SearchCriteria } from '../../../models/owns/page';
import { onSearchQueryChange } from '../../../utils/overall';
import SearchInput from '../components/SearchInput';
import { getCustomFields } from '../../../slices/customField';
import { CustomFieldEntityType } from '../../../models/owns/customField';
import { getCustomFieldsRequiredShape } from '../type';
import { getErrorMessage } from '../../../utils/api';
import api from '../../../utils/api';
import { downloadCsv } from '../../../utils/csv';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import { Page } from '../../../models/owns/page';

function PurchaseOrders() {
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { setTitle } = useContext(TitleContext);
  const { getFormattedDate, getUserNameById } =
    useContext(CompanySettingsContext);
  const navigate = useNavigate();
  const [openDrawer, setOpenDrawer] = useState<boolean>(false);
  const [openUpdateModal, setOpenUpdateModal] = useState<boolean>(false);
  const { partQuantitiesByPurchaseOrder } = useSelector(
    (state) => state.partQuantities
  );
  const { purchaseOrderId } = useParams();
  const { hasViewPermission, hasCreatePermission, hasFeature } = useAuth();
  const dispatch = useDispatch();
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const { purchaseOrders, loadingGet, singlePurchaseOrder } = useSelector(
    (state) => state.purchaseOrders
  );
  const { customFields } = useSelector((state) => state.customFields);
  const [openDrawerFromUrl, setOpenDrawerFromUrl] = useState<boolean>(false);
  const [showReceivingQueue, setShowReceivingQueue] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileRef = React.useRef<HTMLInputElement>(null);
  const [receivingQueue, setReceivingQueue] = useState({ page: 0, query: '', receiptState: 'ALL' });
  const [criteria, setCriteria] = useState<SearchCriteria>({
    filterFields: [],
    pageSize: 10,
    pageNum: 0,
    direction: 'DESC'
  });

  const [currentPurchaseOrder, setCurrentPurchaseOrder] =
    useState<PurchaseOrder>();
  const partQuantities =
    partQuantitiesByPurchaseOrder[currentPurchaseOrder?.id] ?? [];
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const onQueryChange = (event) => {
    onSearchQueryChange<PurchaseOrder>(event, criteria, setCriteria, [
      'name',
      'shippingAdditionalDetail',
      'shippingShipToName',
      'shippingCompanyName',
      'shippingAddress',
      'shippingCity',
      'shippingState',
      'additionalInfoRequisitionedName',
      'additionalInfoShippingOrderCategory',
      'additionalInfoTerm',
      'additionalInfoNotes'
    ]);
  };
  const debouncedQueryChange = useMemo(() => debounce(onQueryChange, 1300), []);
  useEffect(() => () => debouncedQueryChange.clear(), [debouncedQueryChange]);
  const debouncedReceivingQueueSearch = useMemo(
    () =>
      debounce((query: string) => {
        setReceivingQueue((current) => ({ ...current, page: 0, query }));
      }, 500),
    []
  );
  useEffect(
    () => () => debouncedReceivingQueueSearch.clear(),
    [debouncedReceivingQueueSearch]
  );

  const handleOpenDrawer = (purchaseOrder: PurchaseOrder) => {
    setCurrentPurchaseOrder(purchaseOrder);
    window.history.replaceState(
      null,
      'PurchaseOrder details',
      `/app/purchase-orders/${purchaseOrder.id}`
    );
    setOpenDrawer(true);
  };
  const handleOpenUpdate = () => {
    setOpenUpdateModal(true);
  };
  const handleOpenDetails = (id: number) => {
    const foundPurchaseOrder = purchaseOrders.content.find(
      (purchaseOrder) => purchaseOrder.id === id
    );
    if (foundPurchaseOrder) {
      handleOpenDrawer(foundPurchaseOrder);
    }
  };
  useEffect(() => {
    setTitle(t('purchase_orders'));
  }, []);

  useEffect(() => {
    if (purchaseOrderId && isNumeric(purchaseOrderId)) {
      dispatch(getSinglePurchaseOrder(Number(purchaseOrderId)));
    }
  }, [purchaseOrderId]);

  useEffect(() => {
    if (hasViewPermission(PermissionEntity.PURCHASE_ORDERS)) {
      if (showReceivingQueue) {
        dispatch(
          getPurchaseOrdersToReceive(
            receivingQueue.page,
            criteria.pageSize,
            receivingQueue.query,
            receivingQueue.receiptState
          )
        );
      } else {
        dispatch(getPurchaseOrders(criteria));
      }
    }
  }, [criteria, showReceivingQueue, receivingQueue]);

  //see changes in ui on edit
  useEffect(() => {
    if (singlePurchaseOrder || purchaseOrders.content.length) {
      const currentInContent = purchaseOrders.content.find(
        (purchaseOrder) => purchaseOrder.id === currentPurchaseOrder?.id
      );
      const updatedPurchaseOrder = currentInContent ?? singlePurchaseOrder;
      if (updatedPurchaseOrder) {
        if (openDrawerFromUrl) {
          setCurrentPurchaseOrder(updatedPurchaseOrder);
        } else {
          handleOpenDrawer(updatedPurchaseOrder);
          setOpenDrawerFromUrl(true);
        }
      }
    }
    return () => {
      dispatch(clearSinglePurchaseOrder());
    };
  }, [singlePurchaseOrder, purchaseOrders]);

  const onPageSizeChange = (size: number) => {
    if (showReceivingQueue) {
      setCriteria({ ...criteria, pageSize: size });
      setReceivingQueue((current) => ({ ...current, page: 0 }));
    } else {
      setCriteria({ ...criteria, pageSize: size });
    }
  };
  const onPageChange = (number: number) => {
    if (showReceivingQueue) {
      setReceivingQueue((current) => ({ ...current, page: number }));
    } else {
      setCriteria({ ...criteria, pageNum: number });
    }
  };

  const exportPurchaseOrders = async () => {
    if (exporting || showReceivingQueue) return;
    setExporting(true);
    try {
      const all: PurchaseOrder[] = [];
      let page = 0;
      let last = false;
      while (!last && all.length < 10000) {
        const result = await api.post<Page<PurchaseOrder>>('purchase-orders/search', {
          ...criteria, pageNum: page, pageSize: 100
        });
        all.push(...result.content);
        last = result.last;
        page += 1;
      }
      if (!last) throw new Error('export_limit_reached');
      downloadCsv(`purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`,
        ['purchaseOrderKey', 'name', 'vendorId', 'categoryId', 'shippingDueDate', 'additionalInfoNotes', 'partId', 'quantity', 'purchaseUnitPrice', 'purchasePriceCurrency', 'unitCostSnapshot', 'costCurrencySnapshot', 'siteId', 'siteName', 'status', 'vendor', 'category', 'shipToName', 'companyName', 'address', 'city', 'state', 'zipCode', 'itemName', 'receivedQuantity'],
        all.flatMap((order) => (order.partQuantities ?? []).map((line) => [order.id, order.name,
          order.vendor?.id, order.category?.id, order.shippingDueDate, order.additionalInfoNotes,
          line.part?.id, line.quantity, line.purchaseUnitPrice, line.purchasePriceCurrency, line.purchaseUnitCostSnapshot, line.purchaseCurrencySnapshot, line.siteId, line.siteName,
          order.status, order.vendor?.companyName, order.category?.name,
          order.shippingShipToName, order.shippingCompanyName, order.shippingAddress,
          order.shippingCity, order.shippingState, order.shippingZipCode, line.part?.name,
          line.receivedQuantity])));
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'purchase_export_failed')), 'error');
    } finally {
      setExporting(false);
    }
  };

  const importPurchaseOrders = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const result = await api.post<{ importedPurchaseOrders: number; createdAs: string }>(
        'purchase-orders/import', form,
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` } }, true
      );
      showSnackBar(t('purchase_order_imported', result), 'success');
      dispatch(getPurchaseOrders(criteria));
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'purchase_import_failed')), 'error');
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const downloadPurchaseOrderTemplate = () => downloadCsv('purchase-orders-template.csv',
    ['purchaseOrderKey', 'name', 'vendorId', 'categoryId', 'shippingDueDate', 'additionalInfoNotes', 'partId', 'quantity', 'purchaseUnitPrice', 'siteId'], []);

  useEffect(() => {
    if (currentPurchaseOrder)
      dispatch(getPartQuantitiesByPurchaseOrder(currentPurchaseOrder.id));
  }, [currentPurchaseOrder?.id]);

  useEffect(() => {
    if (openUpdateModal && !customFields.length) {
      dispatch(getCustomFields());
    }
  }, [openUpdateModal]);

  const handleDelete = async (id: number) => {
    try {
      const deleted = await dispatch(deletePurchaseOrder(id));
      setOpenDelete(false);
      if (deleted) {
        handleCloseDetails();
        onDeleteSuccess();
      } else {
        setOpenDrawer(true);
        onDeleteFailure(new Error());
      }
    } catch (error) {
      setOpenDelete(false);
      setOpenDrawer(true);
      onDeleteFailure(error);
    }
  };
  const handleCloseDetails = () => {
    window.history.replaceState(null, 'PurchaseOrder', `/app/purchase-orders`);
    setOpenDrawer(false);
  };
  const onEditSuccess = () => {
    setOpenUpdateModal(false);
    showSnackBar(t('changes_saved_success'), 'success');
  };
  const onEditFailure = (err) =>
    showSnackBar(t(getErrorMessage(err, 'po_edit_failure')), 'error');
  const onDeleteSuccess = () => {
    showSnackBar(t('po_delete_success'), 'success');
  };
  const onDeleteFailure = (err) =>
    showSnackBar(t(getErrorMessage(err, 'po_delete_failure')), 'error');
  const columns: GridEnrichedColDef[] = [
    {
      field: 'id',
      headerName: t('id'),
      description: t('id'),
      width: 150
    },
    {
      field: 'name',
      headerName: t('name'),
      description: t('name'),
      width: 150,
      renderCell: (params: GridRenderCellParams<string>) => (
        <Box sx={{ fontWeight: 'bold' }}>{params.value}</Box>
      )
    },
    {
      field: 'itemsNumber',
      headerName: t('number_of_items'),
      description: t('number_of_items'),
      width: 150,
      valueGetter: (params: GridRenderCellParams<null, PurchaseOrder>) =>
        params.row.partQuantities.length
    },
    {
      field: 'totalCost',
      headerName: t('purchase_order_agreed_total', 'Agreed total'),
      description: t('purchase_order_agreed_total_note', 'Based on supplier agreed unit prices'),
      width: 150,
      valueGetter: (params: GridRenderCellParams<null, PurchaseOrder>) => {
        const partQuantities = params.row.partQuantities ?? [];
        if (
          partQuantities.length === 0 ||
          partQuantities.some(
            (partQuantity) => !Number.isFinite(partQuantity.purchaseUnitPrice)
          )
        ) {
          return '—';
        }
        const currency = partQuantities[0].purchasePriceCurrency;
        if (!currency || partQuantities.some((line) => line.purchasePriceCurrency !== currency)) return '—';
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
          partQuantities.reduce((acc, line) => acc + line.purchaseUnitPrice! * line.quantity, 0)
        );
      }
    },
    {
      field: 'totalQuantity',
      headerName: t('ordered_quantity_by_unit'),
      description: t('ordered_quantity_by_unit'),
      width: 210,
      valueGetter: (params: GridRenderCellParams<null, PurchaseOrder>) => {
        const totalsByUnit = new Map<
          string,
          { label: string; total: number }
        >();
        params.row.partQuantities.forEach((partQuantity) => {
          const unit = partQuantity.part.unit?.trim() || t('unit_unspecified');
          const unitKey = unit.toLowerCase();
          const current = totalsByUnit.get(unitKey);
          totalsByUnit.set(unitKey, {
            label: current?.label ?? unit,
            total: (current?.total ?? 0) + partQuantity.quantity
          });
        });
        return Array.from(totalsByUnit.entries())
          .map(([, { label, total }]) => `${total.toLocaleString()} ${label}`)
          .join(' · ');
      },
      renderCell: (params: GridRenderCellParams<string>) => (
        <Box
          title={params.value}
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {params.value || '—'}
        </Box>
      )
    },
    {
      field: 'remainingToReceive',
      headerName: t('remaining_to_receive'),
      description: t('remaining_to_receive'),
      width: 210,
      valueGetter: (params: GridRenderCellParams<null, PurchaseOrder>) => {
        if (!params.row.receivingWorkflowEnabled) return '—';
        const totalsByUnit = new Map<
          string,
          { label: string; total: number }
        >();
        (params.row.partQuantities ?? []).forEach((line) => {
          const unit = line.part.unit?.trim() || t('unit_unspecified');
          const key = unit.toLowerCase();
          const current = totalsByUnit.get(key);
          totalsByUnit.set(key, {
            label: current?.label ?? unit,
            total:
              (current?.total ?? 0) + (line.remainingToReceive ?? line.quantity)
          });
        });
        return (
          Array.from(totalsByUnit.values())
            .map(({ label, total }) => `${total.toLocaleString()} ${label}`)
            .join(' · ') || '—'
        );
      },
      renderCell: (params: GridRenderCellParams<string>) => (
        <Box
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={params.value}
        >
          {params.value || '—'}
        </Box>
      )
    },
    {
      field: 'vendor',
      headerName: t('vendors'),
      description: t('vendors'),
      width: 180,
      valueGetter: (params: GridRenderCellParams<null, PurchaseOrder>) =>
        params.row.vendor?.companyName || '—'
    },
    {
      field: 'receivingOwner',
      headerName: t('requisitioner_or_creator'),
      description: t('requisitioner_or_creator'),
      width: 190,
      valueGetter: (params: GridRenderCellParams<null, PurchaseOrder>) =>
        params.row.additionalInfoRequisitionedName?.trim() ||
        getUserNameById(params.row.createdBy) ||
        '—'
    },
    {
      field: 'nextReceiptAction',
      headerName: t('next_action'),
      description: t('next_action'),
      width: 220,
      sortable: false,
      renderCell: (params: GridRenderCellParams<null, PurchaseOrder>) => {
        const dueDate = params.row.shippingDueDate
          ? new Date(params.row.shippingDueDate)
          : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDay = dueDate ? new Date(dueDate) : null;
        dueDay?.setHours(0, 0, 0, 0);
        const isOverdue = Boolean(
          dueDay && !Number.isNaN(dueDay.getTime()) && dueDay < today
        );
        const isPartiallyReceived = (params.row.partQuantities ?? []).some(
          (line) => (line.receivedQuantity ?? 0) > 0
        );
        return (
          <Stack spacing={0.5} sx={{ py: 0.5, overflow: 'hidden' }}>
            <Chip
              size="small"
              color={isOverdue ? 'error' : 'default'}
              label={
                !dueDate || Number.isNaN(dueDate.getTime())
                  ? t('no_due_date')
                  : isOverdue
                  ? t('delivery_overdue')
                  : `${t('due_date')}: ${getFormattedDate(
                      params.row.shippingDueDate
                    )}`
              }
              sx={{ maxWidth: '100%', alignSelf: 'flex-start' }}
            />
            <Typography variant="caption" noWrap>
              {isPartiallyReceived
                ? t('continue_receiving')
                : t('record_receipt')}
            </Typography>
          </Stack>
        );
      }
    },
    {
      field: 'category',
      headerName: t('category'),
      description: t('category'),
      width: 150,
      valueGetter: (params: GridRenderCellParams<Category>) =>
        params.value?.name
    },
    {
      field: 'status',
      headerName: t('status'),
      description: t('status'),
      width: 150,
      valueGetter: (params: GridRenderCellParams<string>) => t(params.value)
    },
    {
      field: 'shippingShipToName',
      headerName: t('shipping_to'),
      description: t('shipping_to'),
      width: 150
    },
    {
      field: 'shippingAddress',
      headerName: t('shipping_address'),
      description: t('shipping_address'),
      width: 150
    },
    {
      field: 'shippingPhone',
      headerName: t('phone'),
      description: t('phone'),
      width: 150
    },
    {
      field: 'createdBy',
      headerName: t('created_by'),
      description: t('created_by'),
      width: 150,
      valueGetter: (params) => getUserNameById(params.value)
    },
    {
      field: 'createdAt',
      headerName: t('created_at'),
      description: t('created_at'),
      width: 150,
      valueGetter: (params) => getFormattedDate(params.row.createdAt)
    }
  ];
  const receivingQueueColumns = columns.filter((column) =>
    [
      'id',
      'name',
      'vendor',
      'remainingToReceive',
      'receivingOwner',
      'nextReceiptAction'
    ].includes(column.field)
  );
  const fields: Array<IField> = [
    {
      name: 'purchaseOrderDetails',
      type: 'titleGroupField',
      label: t('po_details')
    },
    {
      name: 'name',
      type: 'text',
      label: t('name'),
      placeholder: t('enter_po_name'),
      required: true,
      midWidth: true
    },
    {
      name: 'category',
      type: 'select',
      label: t('category'),
      type2: 'category',
      category: 'purchase-order-categories',
      placeholder: t('category'),
      midWidth: true
    },
    {
      name: 'shippingDueDate',
      type: 'date',
      label: t('due_date'),
      midWidth: true
    },
    {
      name: 'shippingAdditionalDetail',
      type: 'text',
      label: t('additional_details'),
      midWidth: true,
      multiple: true
    },
    {
      name: 'vendor',
      type: 'select',
      type2: 'vendor',
      label: t('vendor'),
      midWidth: true
    },
    {
      name: 'partQuantities',
      type: 'partQuantity',
      label: t('parts'),
      midWidth: true,
      purchaseUnitPriceInput: true,
      siteSelectionEnabled: true,
      siteSelectionRequired: true
    },
    {
      name: 'shippingInformation',
      type: 'titleGroupField',
      label: t('shipping_information')
    },
    {
      name: 'shippingCompanyName',
      type: 'text',
      label: t('company_name'),
      placeholder: t('company_name'),
      midWidth: true
    },
    {
      name: 'shippingShipToName',
      type: 'text',
      label: t('ship_to'),
      placeholder: t('ship_to'),
      midWidth: true
    },
    {
      name: 'shippingAddress',
      type: 'text',
      label: t('address'),
      placeholder: t('address'),
      midWidth: true
    },
    {
      name: 'shippingCity',
      type: 'text',
      label: t('city'),
      placeholder: t('city'),
      midWidth: true
    },
    {
      name: 'shippingState',
      type: 'text',
      label: t('state'),
      placeholder: t('state'),
      midWidth: true
    },
    {
      name: 'shippingZipCode',
      type: 'number',
      label: t('zip_code'),
      placeholder: t('zip_code'),
      midWidth: true
    },
    {
      name: 'shippingPhone',
      type: 'text',
      label: t('phone'),
      placeholder: t('phone'),
      midWidth: true
    },
    {
      name: 'shippingFax',
      type: 'text',
      label: t('fax_number'),
      placeholder: t('fax_number'),
      midWidth: true
    },
    {
      name: 'additionalInformation',
      type: 'titleGroupField',
      label: t('additional_information')
    },
    {
      name: 'additionalInfoDate',
      type: 'date',
      label: t('po_date'),
      placeholder: t('po_date'),
      midWidth: true
    },
    {
      name: 'additionalInfoNotes',
      type: 'text',
      label: t('notes'),
      placeholder: t('add_notes'),
      midWidth: true,
      multiple: true
    },
    {
      name: 'additionalInfoRequisitionedName',
      type: 'text',
      label: t('requisitioner'),
      placeholder: t('requisitioner'),
      midWidth: true
    },
    {
      name: 'additionalInfoTerm',
      type: 'text',
      label: t('terms'),
      placeholder: t('terms'),
      midWidth: true
    },
    {
      name: 'additionalInfoShippingOrderCategory',
      type: 'text',
      label: t('shipping_method'),
      placeholder: t('shipping_method'),
      midWidth: true
    },
    ...getCustomFieldsIFields(
      customFields,
      CustomFieldEntityType.PURCHASE_REQUEST
    )
  ];
  const shape = {
    name: Yup.string().required(t('required_name')),
    ...getCustomFieldsRequiredShape(
      customFields,
      CustomFieldEntityType.PURCHASE_REQUEST,
      t
    )
  };
  const renderUpdateModal = () => (
    <Dialog
      fullWidth
      maxWidth="md"
      open={openUpdateModal}
      onClose={() => setOpenUpdateModal(false)}
    >
      <DialogTitle
        sx={{
          p: 3
        }}
      >
        <Typography variant="h4" gutterBottom>
          {t('edit_po')}
        </Typography>
        <Typography variant="subtitle2">{t('edit_po_description')}</Typography>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 3
        }}
      >
        <Box>
          <Form
            fields={fields}
            validation={Yup.object().shape(shape)}
            submitText={t('save')}
            values={{
              ...currentPurchaseOrder,
              vendor: currentPurchaseOrder?.vendor
                ? {
                    label: currentPurchaseOrder.vendor.name,
                    value: currentPurchaseOrder.vendor.id.toString()
                  }
                : null,
              category: currentPurchaseOrder?.category
                ? {
                    label: currentPurchaseOrder.category.name,
                    values: currentPurchaseOrder?.category.id
                  }
                : null,
              partQuantities
            }}
            onChange={({ field, e }) => {}}
            onSubmit={async (values) => {
              const existingPartIds = new Set((partQuantities ?? []).map((line) => line.part.id));
              if ((values.partQuantities ?? []).some((line) => !existingPartIds.has(line.part.id)
                && (line.purchaseUnitPrice == null || !Number.isFinite(line.purchaseUnitPrice) || line.purchaseUnitPrice < 0))) {
                showSnackBar(t('enter_supplier_price', 'Enter the agreed supplier price for each new line'), 'error');
                return;
              }
              values.vendor = formatSelect(values.vendor);
              values.category = formatSelect(values.category);
              values = formatCustomFields(values);
              try {
                await dispatch(
                  editPurchaseOrderWithLines(currentPurchaseOrder.id, values)
                );
                onEditSuccess();
              } catch (err) {
                onEditFailure(err);
                throw err;
              }
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
  if (hasFeature(PlanFeature.PURCHASE_ORDER)) {
    if (hasViewPermission(PermissionEntity.PURCHASE_ORDERS))
      return (
        <>
          <Helmet>
            <title>{t('purchase_orders')}</title>
          </Helmet>
          <Box justifyContent="center" alignItems="stretch" paddingX={4}>
            <Stack
              my={1}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                {showReceivingQueue ? (
                  <SearchInput
                    onChange={(event) =>
                      debouncedReceivingQueueSearch(event.target.value)
                    }
                  />
                ) : (
                  <SearchInput onChange={debouncedQueryChange} />
                )}
                {showReceivingQueue && (
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 190 } }}>
                    <InputLabel id="receipt-state-label">{t('receipt_status_filter')}</InputLabel>
                    <Select
                      labelId="receipt-state-label"
                      value={receivingQueue.receiptState}
                      label={t('receipt_status_filter')}
                      onChange={(event) => setReceivingQueue({ ...receivingQueue, page: 0, receiptState: event.target.value })}
                    >
                      {['ALL', 'NOT_STARTED', 'PARTIAL'].map((state) => (
                        <MenuItem key={state} value={state}>{t(`receipt_filter_${state.toLowerCase()}`)}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <Button
                  variant={showReceivingQueue ? 'contained' : 'outlined'}
                  onClick={() => {
                    setCriteria({ ...criteria, pageNum: 0 });
                    setReceivingQueue({ page: 0, query: '', receiptState: 'ALL' });
                    setShowReceivingQueue(!showReceivingQueue);
                  }}
                >
                  {showReceivingQueue
                    ? t('all_purchase_orders')
                    : t('purchase_orders_to_receive')}
                </Button>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <input ref={importFileRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => void importPurchaseOrders(event.target.files?.[0])} />
                {hasCreatePermission(PermissionEntity.PURCHASE_ORDERS) && <>
                  <Button variant="outlined" disabled={importing || loadingGet} onClick={() => importFileRef.current?.click()}>
                    {importing ? t('loading') : t('import_csv')}
                  </Button>
                  <Button variant="text" disabled={importing} onClick={downloadPurchaseOrderTemplate}>{t('download_csv_template')}</Button>
                </>}
                {!showReceivingQueue && hasViewPermission(PermissionEntity.PURCHASE_ORDERS) && (
                  <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} disabled={exporting || loadingGet} onClick={() => void exportPurchaseOrders()}>
                    {exporting ? t('loading') : t('export_csv')}
                  </Button>
                )}
                {hasCreatePermission(PermissionEntity.PURCHASE_ORDERS) && (
                  <Button
                    onClick={() => navigate('/app/purchase-orders/create')}
                    startIcon={<AddOutlinedIcon />}
                    variant="contained"
                  >
                    {t('purchase_order')}
                  </Button>
                )}
              </Stack>
            </Stack>
            <Card
              sx={{
                py: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ width: '95%' }}>
                <CustomDataGrid
                  columns={showReceivingQueue ? receivingQueueColumns : columns}
                  pageSize={criteria.pageSize}
                  page={
                    showReceivingQueue ? receivingQueue.page : criteria.pageNum
                  }
                  rows={purchaseOrders.content}
                  rowCount={purchaseOrders.totalElements}
                  pagination
                  paginationMode="server"
                  onPageSizeChange={onPageSizeChange}
                  onPageChange={onPageChange}
                  rowsPerPageOptions={[10, 20, 50]}
                  loading={loadingGet}
                  components={{
                    NoRowsOverlay: () => (
                      <NoRowsMessageWrapper
                        message={t('noRows.po.message')}
                        action={t('noRows.po.action')}
                      />
                    )
                  }}
                  onRowClick={(params) => handleOpenDetails(Number(params.id))}
                  initialState={{
                    columns: {
                      columnVisibilityModel: {}
                    }
                  }}
                  columnVisibilityModel={
                    showReceivingQueue && isMobile ? { id: false } : undefined
                  }
                />
              </Box>
            </Card>
          </Box>
          <Drawer
            anchor="right"
            open={openDrawer}
            onClose={handleCloseDetails}
            PaperProps={{
              sx: { width: { xs: '90%', sm: '70%', md: '50%' } }
            }}
          >
            <PurchaseOrderDetails
              purchaseOrder={currentPurchaseOrder}
              handleOpenUpdate={handleOpenUpdate}
              handleDelete={() => setOpenDelete(true)}
              partQuantities={partQuantities}
              onReceiptCreated={() =>
                dispatch(
                  getPartQuantitiesByPurchaseOrder(currentPurchaseOrder.id)
                )
              }
            />
          </Drawer>
          {renderUpdateModal()}
          <ConfirmDialog
            open={openDelete}
            onCancel={() => {
              setOpenDelete(false);
              setOpenDrawer(true);
            }}
            onConfirm={() => handleDelete(currentPurchaseOrder?.id)}
            confirmText={t('to_delete')}
            question={t('confirm_delete_po')}
          />
        </>
      );
    else
      return <PermissionErrorMessage message={'no_access_purchase_orders'} />;
  } else return <FeatureErrorMessage message={'upgrade_po'} />;
}

export default PurchaseOrders;
