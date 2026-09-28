import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Pagination,
  Stack,
  Typography
} from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import useAuth from '../../../../hooks/useAuth';
import { Page, SearchCriteria } from '../../../../models/owns/page';
import Request from '../../../../models/owns/request';
import { PermissionEntity } from '../../../../models/owns/role';
import api from '../../../../utils/api';
import { getRequestUrl, getWorkOrderUrl } from '../../../../utils/urlPaths';

export default function AssetRequestSummary({ assetId }: { assetId: number }) {
  const { t } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { hasViewPermission } = useAuth();
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<Page<Request>>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setResult(undefined);
    const criteria: SearchCriteria = {
      filterFields: [{ field: 'asset.id', operation: 'eq', value: assetId }],
      pageNum: page,
      pageSize: 4,
      sortField: 'createdAt',
      direction: 'DESC'
    };
    api
      .post<Page<Request>>('requests/search', criteria, {
        signal: controller.signal
      })
      .then((response) => {
        if (!controller.signal.aborted) setResult(response);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [assetId, page, attempt]);

  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="h5">{t('asset_requests')}</Typography>
        {result && <Chip size="small" label={result.totalElements} />}
      </Stack>
      {loading ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <CircularProgress size={28} aria-label={t('asset_requests')} />
        </Box>
      ) : failed ? (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              onClick={() => setAttempt((value) => value + 1)}
            >
              {t('asset_retry')}
            </Button>
          }
        >
          {t('an_error_occured')}
        </Alert>
      ) : result?.content.length ? (
        <>
          <Stack divider={<Divider />}>
            {result.content.map((request) => (
              <Box key={request.id} sx={{ py: 1.5 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Button
                    component={Link}
                    to={getRequestUrl(request.id)}
                    sx={{
                      px: 0,
                      textTransform: 'none',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      overflowWrap: 'anywhere',
                      minWidth: 0
                    }}
                  >
                    {request.title}
                  </Button>
                  <Chip
                    size="small"
                    label={t(
                      request.cancelled
                        ? 'rejected'
                        : request.workOrder
                        ? 'approved'
                        : 'pending'
                    )}
                    color={
                      request.cancelled
                        ? 'error'
                        : request.workOrder
                        ? 'success'
                        : 'warning'
                    }
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {request.customId || `#${request.id}`}
                  {request.createdAt
                    ? ` · ${getFormattedDate(request.createdAt)}`
                    : ''}
                </Typography>
                {request.workOrder &&
                  hasViewPermission(PermissionEntity.WORK_ORDERS) && (
                    <Box>
                      <Button
                        size="small"
                        component={Link}
                        to={getWorkOrderUrl(request.workOrder.id)}
                        sx={{ px: 0, textTransform: 'none', textAlign: 'left' }}
                      >
                        {t('asset_linked_work_order', {
                          id: request.workOrder.id
                        })}
                      </Button>
                    </Box>
                  )}
              </Box>
            ))}
          </Stack>
          {result.totalPages > 1 && (
            <Pagination
              count={result.totalPages}
              page={page + 1}
              onChange={(_, value) => setPage(value - 1)}
              size="small"
              siblingCount={0}
              sx={{ mt: 2 }}
            />
          )}
        </>
      ) : (
        <Typography color="text.secondary" sx={{ py: 3 }}>
          {t('asset_no_requests')}
        </Typography>
      )}
    </Card>
  );
}
