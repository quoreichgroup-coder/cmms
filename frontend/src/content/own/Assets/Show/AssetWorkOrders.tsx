import Asset from '../../../../models/owns/asset';
import type WorkOrder from '../../../../models/owns/workOrder';
import {
  Box,
  Card,
  CardActionArea,
  FormControl,
  Grid,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from '../../../../store';
import { useContext, useEffect, useMemo, useState } from 'react';
import { getAssetWorkOrders } from '../../../../slices/asset';
import { useNavigate } from 'react-router-dom';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import WorkOrderStatusChip from '../../WorkOrders/WorkOrderStatusChip';
import { isDueDateBeforeDay } from '../../WorkOrders/dueDate';
import ContentState from '../../components/ContentState';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import InputAdornment from '@mui/material/InputAdornment';
import { plannedLaborHours, plannedMaterialCost, workCenters } from './assetHistoryUtils';

interface PropsType {
  asset: Asset;
}

const AssetWorkOrders = ({ asset }: PropsType) => {
  const { t }: { t: any } = useTranslation();
  const { getFormattedDate, getFormattedCurrency } = useContext(CompanySettingsContext);
  const { assetInfos } = useSelector((state) => state.assets);
  const workOrders = assetInfos[asset?.id]?.workOrders;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadIndex, setReloadIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filteredWorkOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return (workOrders ?? []).filter((workOrder) => {
      const searchText = [
        workOrder.title,
        workOrder.customId,
        workOrder.description,
        workOrder.category?.name,
        workOrder.parentRequest?.customId,
        workOrder.parentRequest?.title
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      return (
        searchText.includes(normalizedQuery) &&
        (statusFilter === '__all__' || workOrder.status === statusFilter)
      );
    })
    .sort((a, b) => {
      const dateA = Date.parse(a.completedOn || a.estimatedStartDate || a.dueDate || a.createdAt);
      const dateB = Date.parse(b.completedOn || b.estimatedStartDate || b.dueDate || b.createdAt);
      return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
    });
  }, [workOrders, query, statusFilter]);
  const pageCount = Math.ceil(filteredWorkOrders.length / pageSize);
  const safePage = Math.min(page, Math.max(pageCount, 1));
  const visibleWorkOrders = filteredWorkOrders.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );
  const formatHours = (value: number | null): string => value === null
    ? t('data_not_available')
    : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} h`;

  useEffect(() => {
    setPage((current) => Math.min(current, safePage));
  }, [safePage]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    if (asset) {
      Promise.resolve(dispatch(getAssetWorkOrders(asset.id)))
        .catch(() => {
          if (active) setLoadError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [asset?.id, dispatch, reloadIndex]);

  if (loading)
    return (
      <ContentState variant="loading" message={t('loading')} minHeight={240} />
    );
  if (loadError)
    return (
      <ContentState
        variant="error"
        message={t('an_error_occured')}
        actionLabel={t('retry')}
        onAction={() => setReloadIndex((index) => index + 1)}
        minHeight={240}
      />
    );
  const statuses = Array.from(new Set((workOrders ?? []).map((item) => item.status).filter(Boolean)));
  return (
    <Box sx={{ px: { xs: 0, sm: 1, md: 2 } }}>
      <Grid container spacing={2}>
        {!!workOrders?.length && (
          <Grid item xs={12}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={t('asset_history_search_placeholder')}
                inputProps={{ 'aria-label': t('asset_history_search_placeholder') }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
              />
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                <Select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  inputProps={{ 'aria-label': t('asset_history_filter_status') }}
                >
                  <MenuItem value="__all__">{t('asset_history_all_statuses')}</MenuItem>
                  {statuses.map((status) => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Grid>
        )}
        {visibleWorkOrders.length ? (
          visibleWorkOrders.map((workOrder) => (
            <Grid key={workOrder.id} item xs={12}>
              <Card variant="outlined">
                <CardActionArea
                  onClick={() => navigate(`/app/work-orders/${workOrder.id}`)}
                  sx={{ p: { xs: 1.5, sm: 2 } }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'minmax(0, 1fr) auto'
                      },
                      gap: { xs: 1.5, sm: 2 },
                      alignItems: { sm: 'center' }
                    }}
                  >
                    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                      <Typography
                        variant="h5"
                        sx={{ overflowWrap: 'anywhere' }}
                      >
                        {workOrder.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {workOrder.customId || `#${workOrder.id}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('asset_history_order_type')}: {workOrder.parentPreventiveMaintenance ? t('asset_history_preventive') : t('asset_history_corrective')}
                        {workOrder.category?.name ? ` · ${workOrder.category.name}` : ''}
                      </Typography>
                    </Stack>
                    <Stack
                      direction={{ xs: 'row', sm: 'column' }}
                      spacing={{ xs: 1, sm: 0.75 }}
                      alignItems={{ xs: 'center', sm: 'flex-end' }}
                      justifyContent="space-between"
                    >
                      <WorkOrderStatusChip status={workOrder.status} />
                      <Typography
                        variant="body2"
                        color={
                          workOrder.dueDate &&
                          workOrder.status !== 'COMPLETE' &&
                          isDueDateBeforeDay(workOrder.dueDate, new Date())
                            ? 'error.main'
                            : 'text.secondary'
                        }
                      >
                        {workOrder.dueDate
                          ? t('due_at_date', {
                              date: getFormattedDate(workOrder.dueDate)
                            })
                          : t('no_due_date')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {workOrder.primaryUser
                          ? `${workOrder.primaryUser.firstName} ${workOrder.primaryUser.lastName}`
                          : t('no_primary_worker')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('asset_history_planned_start')}: {workOrder.estimatedStartDate ? getFormattedDate(workOrder.estimatedStartDate) : t('data_not_available')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('asset_history_actual_start')}: {workOrder.actualStartAt ? getFormattedDate(workOrder.actualStartAt) : t('data_not_available')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('asset_history_completed')}: {workOrder.completedOn ? getFormattedDate(workOrder.completedOn) : t('data_not_available')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('asset_history_planned_hours')}: {formatHours(plannedLaborHours(workOrder))}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('asset_history_work_center')}: {workCenters(workOrder) || t('data_not_available')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('asset_history_planned_cost')}: {plannedMaterialCost(workOrder) != null
                          ? getFormattedCurrency(plannedMaterialCost(workOrder)!)
                          : t('data_not_available')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('asset_history_related_notification')}: {workOrder.parentRequest?.customId || workOrder.parentRequest?.title || t('data_not_available')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('asset_history_actual_hours')}: {formatHours(workOrder.actualLaborSeconds != null ? workOrder.actualLaborSeconds / 3600 : null)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('asset_history_actual_cost')}: {workOrder.actualTotalCost != null ? getFormattedCurrency(workOrder.actualTotalCost) : t('data_not_available')}
                      </Typography>
                      {workOrder.team?.name && (
                        <Typography variant="body2" color="text.secondary">
                          {t('team')}: {workOrder.team.name}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Card variant="outlined">
              <ContentState
                variant="empty"
                message={workOrders?.length ? t('asset_history_no_matching_orders') : t('no_wo_linked_asset')}
                minHeight={220}
              />
            </Card>
          </Grid>
        )}
        {pageCount > 1 && (
          <Grid item xs={12} display="flex" justifyContent="center">
            <Pagination
              count={pageCount}
              page={safePage}
              onChange={(_event, value) => setPage(value)}
              color="primary"
              aria-label={t('asset_history_pagination')}
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AssetWorkOrders;
