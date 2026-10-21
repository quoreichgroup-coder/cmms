import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material';
import { GridRenderCellParams, GridValueGetterParams } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { useContext } from 'react';
import Request from '../../../../models/owns/request';
import { Page } from '../../../../models/owns/page';
import api, { getErrorMessage } from '../../../../utils/api';
import CustomDataGrid, {
  CustomDatagridColumn
} from '../../components/CustomDatagrid';
import NoRowsMessageWrapper from '../../components/NoRowsMessageWrapper';
import PriorityWrapper from '../../components/PriorityWrapper';
import RequestStatusChip from '../../Requests/RequestStatusChip';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import { Filter } from './WOModal';
import { buildRequestAnalyticsCriteria } from './requestDrilldown';

interface RequestAnalyticsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  filters: Filter[];
  start: Date;
  end: Date;
  companyId?: number;
}

export default function RequestAnalyticsModal({
  open,
  onClose,
  title,
  filters,
  start,
  end,
  companyId
}: RequestAnalyticsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const [rows, setRows] = useState<Request[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [retryCount, setRetryCount] = useState(0);
  const criteria = useMemo(
    () =>
      buildRequestAnalyticsCriteria(
        filters,
        start,
        end,
        page,
        pageSize,
        companyId
      ),
    [filters, start, end, page, pageSize, companyId]
  );

  useEffect(() => {
    if (open) setPage(0);
  }, [open, filters]);

  useEffect(() => {
    if (!open || !criteria) {
      setRows([]);
      setRowCount(0);
      setLoading(false);
      setLoadError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    api
      .post<Page<Request>>('requests/search', criteria, {
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
  }, [open, criteria, retryCount, t]);

  const columns: CustomDatagridColumn[] = [
    {
      field: 'customId',
      headerName: t('id'),
      width: 140
    },
    {
      field: 'title',
      headerName: t('title'),
      minWidth: 180,
      flex: 1
    },
    {
      field: 'requestStatus',
      headerName: t('status'),
      width: 145,
      valueGetter: (params: GridValueGetterParams<null, Request>) =>
        params.row.cancelled
          ? 'CANCELLED'
          : params.row.workOrder
          ? 'APPROVED'
          : 'PENDING',
      renderCell: (params: GridRenderCellParams<string>) => (
        <RequestStatusChip status={params.value} />
      )
    },
    {
      field: 'priority',
      headerName: t('priority'),
      width: 130,
      renderCell: (params: GridRenderCellParams<string>) => (
        <PriorityWrapper priority={params.value} />
      )
    },
    {
      field: 'category',
      headerName: t('category'),
      width: 160,
      valueGetter: (params: GridValueGetterParams<Request['category']>) =>
        params.value?.name ?? '—'
    },
    {
      field: 'asset',
      headerName: t('asset'),
      width: 170,
      valueGetter: (params: GridValueGetterParams<Request['asset']>) =>
        params.value?.name ?? '—'
    },
    {
      field: 'createdAt',
      headerName: t('created_at'),
      width: 160,
      valueGetter: (params: GridValueGetterParams<string>) =>
        params.value ? getFormattedDate(params.value) : '—'
    }
  ];

  return (
    <Dialog fullWidth maxWidth="lg" open={open} onClose={onClose}>
      <DialogTitle sx={{ p: 3 }}>
        <Typography variant="h4">{title}</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
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
        <Box sx={{ width: '100%' }}>
          <CustomDataGrid
            columns={columns}
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
              navigate(`/app/requests/${params.row.id}`);
            }}
            components={{
              NoRowsOverlay: () => (
                <NoRowsMessageWrapper message={t('no_content')} action={null} />
              )
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
