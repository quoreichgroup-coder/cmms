import { Helmet } from 'react-helmet-async';
import {
  Box,
  Button,
  Card,
  debounce,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  Alert,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useContext, useEffect, useMemo, useState } from 'react';
import { TitleContext } from '../../../contexts/TitleContext';
import {
  addRequest,
  clearSingleRequest,
  deleteRequest,
  editRequest,
  getRequests,
  getSingleRequest
} from '../../../slices/request';
import { useDispatch, useSelector } from '../../../store';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomDatagrid2, {
  CustomDatagridColumn2
} from '../components/CustomDatagrid2';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import Request from '../../../models/owns/request';
import Form from '../components/form';
import * as Yup from 'yup';
import { IField } from '../type';
import RequestDetails from './RequestDetails';
import { useNavigate, useParams } from 'react-router-dom';
import { isNumeric } from '../../../utils/validators';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import PriorityWrapper from '../components/PriorityWrapper';
import {
  formatSelect,
  formatSelectMultiple,
  formatCustomFields
} from '../../../utils/formatters';
import useAuth from '../../../hooks/useAuth';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import { getWOBaseFields, getWOBaseValues } from '../../../utils/woBase';
import { PermissionEntity } from '../../../models/owns/role';
import { getCustomFields } from '../../../slices/customField';
import { CustomFieldEntityType } from '../../../models/owns/customField';
import { getCustomFieldsRequiredShape } from '../type';
import PermissionErrorMessage from '../components/PermissionErrorMessage';
import NoRowsMessageWrapper from '../components/NoRowsMessageWrapper';
import { handleFileUpload, getImageAndFiles } from '../../../utils/overall';
import { buildFirstPageSearchCriteria } from '../../../utils/listSearch';
import {
  FilterField,
  SearchCriteria,
  SortDirection
} from '../../../models/owns/page';
import { loadFilterFields, saveFilterFields } from '../../../utils/filter';
import { createColumnHelper } from '@tanstack/react-table';
import useTableState from '../../../hooks/useTableState';
import _ from 'lodash';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import CompanyFilter from '../WorkOrders/Filters/CompanyFilter';
import EnumFilter from '../WorkOrders/Filters/EnumFilter';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import SignalCellularAltOutlinedIcon from '@mui/icons-material/SignalCellularAltOutlined';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import SearchInput from '../components/SearchInput';
import * as React from 'react';
import RequestStatusChip from './RequestStatusChip';
import ContentState from '../components/ContentState';

const QUERY_SEARCH_FIELDS = new Set<keyof Request>([
  'title',
  'description',
  'customId'
]);

const FILTERS_STORAGE_KEY = 'request_filters';
const DEFAULT_FILTER_FIELDS: FilterField[] = [
  {
    field: 'priority',
    operation: 'in',
    values: [],
    value: '',
    enumName: 'PRIORITY'
  },
  {
    field: 'status',
    operation: 'in',
    values: ['APPROVED', 'CANCELLED', 'PENDING'],
    value: '',
    enumName: 'STATUS'
  }
];

const getInitialFilterFields = (): FilterField[] =>
  loadFilterFields(FILTERS_STORAGE_KEY, DEFAULT_FILTER_FIELDS);

function Requests() {
  const { t }: { t: any } = useTranslation();
  const { setTitle } = useContext(TitleContext);
  const [openAddModal, setOpenAddModal] = useState<boolean>(false);
  const [openDiscardDialog, setOpenDiscardDialog] = useState<boolean>(false);
  const [isFormDirty, setIsFormDirty] = useState<boolean>(false);
  const [openUpdateModal, setOpenUpdateModal] = useState<boolean>(false);
  const [openDrawer, setOpenDrawer] = useState<boolean>(false);
  const {
    companySettings,
    hasViewPermission,
    hasCreatePermission,
    getFilteredFields,
    user
  } = useAuth();
  const { workOrderRequestConfiguration } = companySettings;
  const [currentRequest, setCurrentRequest] = useState<Request>();
  const { uploadFiles, getFormattedDate } = useContext(CompanySettingsContext);
  const { requestId } = useParams();
  const dispatch = useDispatch();
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const {
    requests,
    loadingGet,
    singleRequest,
    requestsError,
    singleRequestLoading,
    singleRequestError
  } = useSelector((state) => state.requests);
  const { customFields } = useSelector((state) => state.customFields);
  const [requestedRequestId, setRequestedRequestId] = useState<number>();
  const [criteria, setCriteria] = useState<SearchCriteria>({
    filterFields: getInitialFilterFields(),
    pageSize: 10,
    pageNum: 0,
    direction: 'DESC'
  });

  // Mapping for column fields to API field names for sorting
  const fieldMapping: Record<string, string> = {
    customId: 'customId',
    title: 'title',
    description: 'description',
    priority: 'priority',
    createdAt: 'createdAt',
    dueDate: 'dueDate'
  };

  // Use the table state hook for TanStack Table
  const {
    sorting,
    setSorting,
    pagination,
    setPagination,
    columnOrder,
    setColumnOrder,
    columnSizing,
    setColumnSizing,
    columnVisibility,
    setColumnVisibility,
    pinnedColumns,
    setPinnedColumns
  } = useTableState({
    prefix: 'requests',
    initialSorting: [],
    initialPagination: {
      pageSize: criteria.pageSize,
      pageIndex: criteria.pageNum
    },
    setCriteria,
    fieldMapping
  });
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const navigate = useNavigate();
  const handleOpenDrawer = (request: Request) => {
    setCurrentRequest(request);
    setRequestedRequestId(undefined);
    window.history.replaceState(
      null,
      'Request details',
      `/app/requests/${request.id}`
    );
    setOpenDrawer(true);
  };
  useEffect(() => {
    setTitle(t('requests'));
  }, []);
  useEffect(() => {
    if (requestId && isNumeric(requestId)) {
      setRequestedRequestId(Number(requestId));
      setCurrentRequest(undefined);
      setOpenDrawer(true);
      dispatch(getSingleRequest(Number(requestId)));
    }
  }, [requestId]);

  useEffect(() => {
    if (hasViewPermission(PermissionEntity.REQUESTS))
      dispatch(getRequests(criteria));
  }, [criteria]);

  //see changes in ui on edit
  useEffect(() => {
    if (currentRequest) {
      const currentInContent = requests.content.find(
        (request) => request.id === currentRequest.id
      );
      const updatedRequest =
        currentInContent ??
        (singleRequest?.id === currentRequest.id ? singleRequest : null);
      if (updatedRequest && updatedRequest !== currentRequest)
        setCurrentRequest(updatedRequest);
      return;
    }
    if (
      requestedRequestId != null &&
      singleRequest?.id === requestedRequestId
    ) {
      setCurrentRequest(singleRequest);
      window.history.replaceState(
        null,
        'Request details',
        `/app/requests/${singleRequest.id}`
      );
      setOpenDrawer(true);
    }
  }, [singleRequest, requests.content, currentRequest, requestedRequestId]);

  useEffect(() => {
    if ((openAddModal || openUpdateModal) && !customFields.length) {
      dispatch(getCustomFields());
    }
  }, [openAddModal, openUpdateModal]);

  const handleDelete = async (id: number) => {
    try {
      const deleted = await dispatch(deleteRequest(id));
      setOpenDelete(false);
      if (deleted) {
        handleCloseDetails();
        onDeleteSuccess();
      } else {
        onDeleteFailure(new Error('Request deletion was not confirmed'));
      }
    } catch (error) {
      setOpenDelete(false);
      onDeleteFailure(error);
    }
  };
  const handleOpenUpdate = () => {
    setOpenUpdateModal(true);
  };
  const onCreationSuccess = () => {
    setOpenAddModal(false);
    showSnackBar(t('request_create_success'), 'success');
  };
  const onCreationFailure = (err) =>
    showSnackBar(t('request_create_failure'), 'error');
  const onEditSuccess = () => {
    setOpenUpdateModal(false);
    showSnackBar(t('changes_saved_success'), 'success');
  };
  const onEditFailure = (err) =>
    showSnackBar(t('request_edit_failure'), 'error');
  const onDeleteSuccess = () => {
    showSnackBar(t('request_delete_success'), 'success');
  };
  const onDeleteFailure = (err) =>
    showSnackBar(t('request_delete_failure'), 'error');

  const handleOpenDetails = (id: number) => {
    const foundRequest = requests.content.find((request) => request.id === id);
    if (foundRequest) {
      if (foundRequest.workOrder) {
        navigate(`/app/work-orders/${foundRequest.workOrder.id}`);
      } else {
        handleOpenDrawer(foundRequest);
      }
    }
  };
  const handleCloseDetails = () => {
    window.history.replaceState(null, 'Request', `/app/requests`);
    setOpenDrawer(false);
    setRequestedRequestId(undefined);
    setCurrentRequest(undefined);
    dispatch(clearSingleRequest());
  };
  const formatValues = (values) => {
    const newValues = { ...values };
    newValues.primaryUser = formatSelect(newValues.primaryUser);
    newValues.location = formatSelect(newValues.location);
    newValues.team = formatSelect(newValues.team);
    newValues.asset = formatSelect(newValues.asset);
    newValues.assignedTo = formatSelectMultiple(newValues.assignedTo);
    newValues.priority = newValues.priority?.value;
    newValues.category = formatSelect(newValues.category);
    return formatCustomFields(newValues);
  };

  const columnHelper = createColumnHelper<Request>();

  const columns: CustomDatagridColumn2<Request>[] = [
    columnHelper.accessor('customId', {
      id: 'customId',
      header: () => t('id'),
      cell: (info) => info.getValue() || '',
      size: 80
    }),
    columnHelper.accessor('title', {
      id: 'title',
      header: () => t('title'),
      cell: (info) => <Box sx={{ fontWeight: 'bold' }}>{info.getValue()}</Box>,
      size: 150
    }),
    columnHelper.accessor('description', {
      id: 'description',
      header: () => t('description'),
      cell: (info) => info.getValue() || '',
      size: 300
    }),
    columnHelper.accessor('priority', {
      id: 'priority',
      header: () => t('priority'),
      cell: (info) => <PriorityWrapper priority={info.getValue()} />,
      size: 150
    }),
    columnHelper.display({
      id: 'status',
      header: () => t('status'),
      cell: (info) => {
        const row = info.row.original;
        const status = row.cancelled
          ? 'CANCELLED'
          : row.workOrder
          ? 'APPROVED'
          : 'PENDING';
        const labelKey = row.cancelled
          ? 'rejected'
          : row.workOrder
          ? 'approved'
          : 'pending';
        return <RequestStatusChip status={status} labelKey={labelKey} />;
      },
      size: 150
    }),
    columnHelper.accessor('dueDate', {
      id: 'dueDate',
      header: () => t('due_date'),
      cell: (info) => getFormattedDate(info.getValue()),
      size: 150
    }),
    columnHelper.accessor((row) => row.asset?.name, {
      id: 'asset',
      header: () => t('asset'),
      cell: (info) => info.getValue() || '',
      size: 150
    }),
    columnHelper.accessor((row) => row.location?.name, {
      id: 'location',
      header: () => t('location'),
      cell: (info) => info.getValue() || '',
      size: 150
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: () => t('created_at'),
      cell: (info) => getFormattedDate(info.getValue()),
      size: 150
    })
  ];
  const defaultFields: Array<IField> = [...getWOBaseFields(t, customFields)];
  const defaultShape = {
    title: Yup.string().required(t('required_request_name')),
    ...getCustomFieldsRequiredShape(
      customFields,
      CustomFieldEntityType.WORK_ORDER,
      t
    )
  };
  const getFieldsAndShapes = (): [Array<IField>, { [key: string]: any }] => {
    let fields = [...getFilteredFields(defaultFields)];
    let shape = { ...defaultShape };
    const fieldsToConfigure = [
      'asset',
      'location',
      'primaryUser',
      'category',
      'dueDate',
      'team'
    ];
    fieldsToConfigure.forEach((name) => {
      const fieldConfig =
        workOrderRequestConfiguration.fieldConfigurations.find(
          (fc) => fc.fieldName === name
        );
      const fieldIndexInFields = fields.findIndex(
        (field) => field.name === name
      );
      if (fieldConfig.fieldType === 'REQUIRED') {
        fields[fieldIndexInFields] = {
          ...fields[fieldIndexInFields],
          required: true
        };
        const requiredMessage = t('required_field');
        let yupSchema;
        switch (fields[fieldIndexInFields].type) {
          case 'text':
            yupSchema = Yup.string().required(requiredMessage);
            break;
          case 'date':
            yupSchema = Yup.string().required(requiredMessage);
            break;
          case 'number':
            yupSchema = Yup.number().required(requiredMessage);
            break;
          default:
            yupSchema = Yup.object().required(requiredMessage).nullable();
            break;
        }
        shape[name] = yupSchema;
      } else if (fieldConfig.fieldType === 'HIDDEN') {
        fields.splice(fieldIndexInFields, 1);
      }
    });

    return [fields, shape];
  };
  const onQueryChange = (event) => {
    const query = event.target.value;
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    setCriteria((current) =>
      buildFirstPageSearchCriteria(current, query, [
        'title',
        'description',
        'customId',
        'customFieldValues.value'
      ])
    );
  };
  const debouncedQueryChange = useMemo(() => debounce(onQueryChange, 1300), []);

  const onFilterChange = (newFilters: FilterField[]) => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    setCriteria((current) => ({
      ...current,
      filterFields: newFilters,
      pageNum: 0
    }));
    saveFilterFields(FILTERS_STORAGE_KEY, newFilters, QUERY_SEARCH_FIELDS);
  };
  const renderAddModal = () => (
    <Dialog
      fullWidth
      maxWidth="md"
      open={openAddModal}
      onClose={() => {
        if (isFormDirty) {
          setOpenDiscardDialog(true);
        } else {
          setOpenAddModal(false);
        }
      }}
    >
      <DialogTitle
        sx={{
          p: 3
        }}
      >
        <Typography variant="h4" gutterBottom>
          {t('add_request')}
        </Typography>
        <Typography variant="subtitle2">
          {t('add_request_description')}
        </Typography>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 3
        }}
      >
        <Box>
          <Form
            fields={getFieldsAndShapes()[0]}
            validation={Yup.object().shape(getFieldsAndShapes()[1])}
            submitText={t('add')}
            values={{}}
            onChange={() => setIsFormDirty(true)}
            onSubmit={async (values) => {
              setIsFormDirty(false);
              let formattedValues = formatValues(values);
              try {
                const uploadedFiles = await uploadFiles(
                  formattedValues.files,
                  formattedValues.image
                );

                const imageAndFiles = getImageAndFiles(uploadedFiles);
                formattedValues = {
                  ...formattedValues,
                  image: imageAndFiles.image,
                  files: imageAndFiles.files
                };

                await dispatch(addRequest(formattedValues));
                onCreationSuccess();
              } catch (err) {
                onCreationFailure(err);
                throw err;
              }
            }}
          />
        </Box>
      </DialogContent>
      <ConfirmDialog
        open={openDiscardDialog}
        onCancel={() => setOpenDiscardDialog(false)}
        onConfirm={() => {
          setOpenDiscardDialog(false);
          setOpenAddModal(false);
          setIsFormDirty(false);
        }}
        confirmText={t('discard_changes')}
        question={t('discard_changes_question')}
      />
    </Dialog>
  );
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
          {t('edit_request')}
        </Typography>
        <Typography variant="subtitle2">
          {t('edit_request_description')}
        </Typography>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 3
        }}
      >
        <Box>
          <Form
            fields={getFieldsAndShapes()[0]}
            validation={Yup.object().shape(getFieldsAndShapes()[1])}
            submitText={t('save')}
            values={{
              ...currentRequest,
              ...getWOBaseValues(t, currentRequest)
            }}
            onChange={({ field, e }) => {}}
            onSubmit={async (values) => {
              let formattedValues = formatValues(values);
              try {
                const imageAndFiles = await handleFileUpload(
                  {
                    files: formattedValues.files,
                    image: formattedValues.image
                  },
                  uploadFiles
                );

                formattedValues = {
                  ...formattedValues,
                  image: imageAndFiles.image,
                  files: imageAndFiles.files
                };

                await dispatch(
                  editRequest(currentRequest?.id, formattedValues)
                );
                await onEditSuccess();
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
  if (hasViewPermission(PermissionEntity.REQUESTS))
    return (
      <>
        <Helmet>
          <title>{t('requests')}</title>
        </Helmet>
        {renderAddModal()}
        {renderUpdateModal()}
        <Box
          justifyContent="center"
          alignItems="stretch"
          sx={{ px: { xs: 1.5, sm: 2.5, xl: 4 }, pb: 3 }}
        >
          {hasCreatePermission(PermissionEntity.REQUESTS) && (
            <Box
              display="flex"
              flexDirection={{ xs: 'column', sm: 'row' }}
              justifyContent="flex-end"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ my: 1.5 }}
            >
              <Button
                startIcon={<AddOutlinedIcon />}
                sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none' }}
                variant="contained"
                onClick={() => setOpenAddModal(true)}
              >
                {t('request')}
              </Button>
            </Box>
          )}
          <Card
            sx={{
              py: { xs: 1, sm: 2 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              boxShadow: 'none',
              overflow: 'hidden'
            }}
          >
            <Box
              component="section"
              aria-label={t('filters')}
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: 1,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1,
                '& .MuiButton-root': {
                  minHeight: 40,
                  borderRadius: 2,
                  textTransform: 'none'
                }
              }}
            >
              <EnumFilter
                filterFields={criteria.filterFields}
                onChange={onFilterChange}
                completeOptions={['NONE', 'LOW', 'MEDIUM', 'HIGH']}
                fieldName="priority"
                icon={<SignalCellularAltOutlinedIcon />}
              />
              <EnumFilter
                filterFields={criteria.filterFields}
                onChange={onFilterChange}
                completeOptions={['APPROVED', 'CANCELLED', 'PENDING']}
                fieldName="status"
                icon={<CircleOutlinedIcon />}
              />
              {user?.superAccountRelations?.length > 0 && (
                <CompanyFilter
                  filterFields={criteria.filterFields}
                  onChange={onFilterChange}
                  superAccountRelations={user.superAccountRelations}
                  icon={<BusinessOutlinedIcon />}
                />
              )}
              <Box
                sx={{
                  flex: { xs: '1 1 100%', md: '0 1 280px' },
                  minWidth: { xs: '100%', md: 220 },
                  ml: { md: 'auto' },
                  '& .MuiFormControl-root': { width: '100%' },
                  '& .MuiOutlinedInput-root': { borderRadius: 2 }
                }}
              >
                <SearchInput onChange={debouncedQueryChange} />
              </Box>
            </Box>
            <Divider />
            <Box sx={{ width: '100%', minWidth: 0 }}>
              {requestsError && requests.content.length > 0 && (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => dispatch(getRequests(criteria))}
                    >
                      {t('retry')}
                    </Button>
                  }
                >
                  {requestsError}
                </Alert>
              )}
              {requestsError && requests.content.length === 0 ? (
                <ContentState
                  variant="error"
                  message={requestsError}
                  actionLabel={t('retry')}
                  onAction={() => dispatch(getRequests(criteria))}
                />
              ) : (
                <CustomDatagrid2
                  columns={columns}
                  data={requests.content}
                  loading={loadingGet}
                  pagination={pagination}
                  onPaginationChange={setPagination}
                  totalRows={requests.totalElements}
                  pageSizeOptions={[10, 20, 50]}
                  sorting={sorting}
                  onSortingChange={setSorting}
                  columnOrder={columnOrder}
                  onColumnOrderChange={setColumnOrder}
                  columnSizing={columnSizing}
                  onColumnSizingChange={setColumnSizing}
                  columnVisibility={columnVisibility}
                  onColumnVisibilityChange={setColumnVisibility}
                  onRowClick={(row) => handleOpenDetails(row.id)}
                  noRowsMessage={t('noRows.request.message')}
                  noRowsAction={t('noRows.request.action')}
                  enableColumnReordering
                  enableColumnResizing
                  pinnedColumns={pinnedColumns}
                  onPinnedColumnsChange={setPinnedColumns}
                />
              )}
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
          {currentRequest ? (
            <RequestDetails
              onClose={handleCloseDetails}
              request={currentRequest}
              handleOpenUpdate={handleOpenUpdate}
              handleOpenDelete={() => setOpenDelete(true)}
            />
          ) : singleRequestLoading ? (
            <ContentState variant="loading" message={t('loading')} />
          ) : singleRequestError ? (
            <ContentState
              variant="error"
              message={singleRequestError}
              actionLabel={t('retry')}
              onAction={() => {
                if (requestedRequestId != null)
                  dispatch(getSingleRequest(requestedRequestId));
              }}
            />
          ) : (
            <ContentState variant="loading" message={t('loading')} />
          )}
        </Drawer>
        <ConfirmDialog
          open={openDelete}
          onCancel={() => {
            setOpenDelete(false);
            setOpenDrawer(true);
          }}
          onConfirm={() => handleDelete(currentRequest?.id)}
          confirmText={t('to_delete')}
          question={t('confirm_delete_request')}
        />
      </>
    );
  else return <PermissionErrorMessage message={'no_access_requests'} />;
}

export default Requests;
