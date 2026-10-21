import {
  Alert,
  Button,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomDataGrid, {
  CustomDatagridColumn
} from '../../components/CustomDatagrid';
import { GridRenderCellParams, GridValueGetterParams } from '@mui/x-data-grid';
import NoRowsMessageWrapper from '../../components/NoRowsMessageWrapper';
import { GridEnrichedColDef } from '@mui/x-data-grid/models/colDef/gridColDef';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import PriorityWrapper from '../../components/PriorityWrapper';
import { UserMiniDTO } from '../../../../models/user';
import UserAvatars from '../../components/UserAvatars';
import { LocationMiniDTO } from '../../../../models/owns/location';
import WorkOrder from '../../../../models/owns/workOrder';
import Category from '../../../../models/owns/category';
import { AssetMiniDTO } from '../../../../models/owns/asset';
import { dayDiff } from '../../../../utils/dates';
import File from '../../../../models/owns/file';
import { useTranslation } from 'react-i18next';
import { useContext } from 'react';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import api, { getErrorMessage } from '../../../../utils/api';
import { Page } from '../../../../models/owns/page';
import { buildStatusWorkOrderCriteria } from './statusDrilldown';

export interface Filter {
  key: string;
  value: string | number | boolean;
}
interface WOModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  columns: string[];
  filters: Filter[];
  start?: Date;
  end?: Date;
  companyId?: number;
}
export default function WOModal({
  open,
  onClose,
  title,
  columns,
  filters,
  start,
  end,
  companyId
}: WOModalProps) {
  const { t }: { t: any } = useTranslation();
  const { getFormattedDate, getUserNameById } = useContext(
    CompanySettingsContext
  );
  const navigate = useNavigate();
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [retryCount, setRetryCount] = useState(0);
  const status = filters.find((filter) => filter.key === 'status')?.value;

  useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  useEffect(() => {
    if (!open || !start || !end || typeof status !== 'string') {
      setLoading(false);
      return;
    }
    const criteria = buildStatusWorkOrderCriteria(
      status,
      start,
      end,
      page,
      pageSize,
      companyId
    );
    if (!criteria) {
      setLoadError(t('no_wo_found'));
      setRows([]);
      setRowCount(0);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    api
      .post<Page<WorkOrder>>('work-orders/search', criteria, {
        signal: controller.signal
      })
      .then((result) => {
        setRows(result.content ?? []);
        setRowCount(result.totalElements ?? 0);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setRows([]);
        setRowCount(0);
        setLoadError(getErrorMessage(error, t('error')));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, status, start, end, companyId, page, pageSize, retryCount, t]);

  const defaultColumns: CustomDatagridColumn[] = [
    {
      field: 'customId',
      headerName: t('id'),
      description: t('id'),
      width: 140
    },
    {
      field: 'id',
      headerName: t('id'),
      description: t('id')
    },
    {
      field: 'status',
      headerName: t('status'),
      description: t('status'),
      width: 150,
      renderCell: (params: GridRenderCellParams<string>) => (
        <Box display="flex" flexDirection="row" justifyContent="center">
          <CircleOutlinedIcon
            fontSize="small"
            color={
              params.value === 'IN_PROGRESS'
                ? 'success'
                : params.value === 'ON_HOLD'
                ? 'warning'
                : params.value === 'COMPLETE'
                ? 'info'
                : 'secondary'
            }
          />
          <Typography sx={{ ml: 1 }}>{t(params.value)}</Typography>
        </Box>
      )
    },
    {
      field: 'title',
      headerName: t('title'),
      description: t('title'),
      width: 150,
      renderCell: (params: GridRenderCellParams<string>) => (
        <Box sx={{ fontWeight: 'bold' }}>{params.value}</Box>
      )
    },

    {
      field: 'priority',
      headerName: t('priority'),
      description: t('priority'),
      width: 150,
      renderCell: (params: GridRenderCellParams<string>) => (
        <PriorityWrapper priority={params.value} />
      )
    },
    {
      field: 'description',
      headerName: t('description'),
      description: t('description'),
      width: 300
    },
    {
      field: 'primaryUser',
      headerName: t('worker'),
      description: t('worker'),
      width: 150,
      renderCell: (params: GridRenderCellParams<UserMiniDTO>) =>
        params.value ? (
          <UserAvatars compact={false} users={[params.value]} />
        ) : null
    },
    {
      field: 'assignedTo',
      headerName: t('assigned_to'),
      description: t('assigned_to'),
      width: 170,
      renderCell: (params: GridRenderCellParams<UserMiniDTO[]>) => (
        <UserAvatars users={params.value} compact={false} />
      )
    },
    {
      field: 'location',
      headerName: t('location'),
      description: t('Location'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<LocationMiniDTO>) =>
        params.value?.name,
      uiConfigKey: 'locations'
    },
    {
      field: 'locationAddress',
      headerName: t('location_address'),
      description: t('location_address'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<null, WorkOrder>) =>
        params.row.location?.address,
      uiConfigKey: 'locations'
    },
    {
      field: 'category',
      headerName: t('category'),
      description: t('category'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<Category>) =>
        params.value?.name
    },
    {
      field: 'asset',
      headerName: t('asset'),
      description: t('asset'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<AssetMiniDTO>) =>
        params.value?.name
    },
    {
      field: 'daysSinceCreated',
      headerName: t('days_since_creation'),
      description: t('days_since_creation'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<null, WorkOrder>) =>
        dayDiff(new Date(), new Date(params.row.createdAt))
    },
    {
      field: 'files',
      headerName: t('files'),
      description: t('files'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<File[]>) =>
        params.value.length
    },
    {
      field: 'requestedBy',
      headerName: t('requested_by'),
      description: t('requested_by'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<null, WorkOrder>) =>
        getUserNameById(params.row.parentRequest?.createdBy)
    },
    {
      field: 'completedOn',
      headerName: t('completed_on'),
      description: t('completed_on'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<string>) =>
        getFormattedDate(params.value)
    },
    {
      field: 'updatedAt',
      headerName: t('updated_at'),
      description: t('updated_at'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<string>) =>
        getFormattedDate(params.value)
    },
    {
      field: 'createdAt',
      headerName: t('created_at'),
      description: t('created_at'),
      width: 150,
      valueGetter: (params: GridValueGetterParams<string>) =>
        getFormattedDate(params.value)
    }
  ];

  const getColumns = (): GridEnrichedColDef[] => {
    let result = [...defaultColumns];
    result = defaultColumns.filter((column) => columns.includes(column.field));
    return result;
  };
  return (
    <Dialog fullWidth maxWidth="lg" open={open} onClose={onClose}>
      <DialogTitle
        sx={{
          p: 3
        }}
      >
        <Typography variant="h4" gutterBottom>
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: 3
        }}
      >
        {loadError && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setRetryCount((count) => count + 1)}
              >
                {t('retry')}
              </Button>
            }
            sx={{ mb: 2 }}
          >
            {loadError}
          </Alert>
        )}
        <Box sx={{ width: '95%' }}>
          <CustomDataGrid
            columns={getColumns()}
            rows={rows}
            loading={loading}
            rowCount={rowCount}
            paginationMode="server"
            page={page}
            pageSize={pageSize}
            rowsPerPageOptions={[10, 25, 50]}
            onPageChange={(nextPage) => setPage(nextPage)}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(0);
            }}
            onRowClick={(params) => {
              onClose();
              navigate(`/app/work-orders/${params.row.id}`);
            }}
            components={{
              NoRowsOverlay: () => (
                <NoRowsMessageWrapper
                  message={t('no_wo_found')}
                  action={null}
                />
              )
            }}
            initialState={{
              columns: {
                columnVisibilityModel: {}
              }
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
