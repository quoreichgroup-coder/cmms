import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Pagination,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import React, { useContext, useEffect, useState } from 'react';
import { getWorkOrderUrl } from '../../../utils/urlPaths';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import api from '../../../utils/api';
import { useNavigate } from 'react-router-dom';
import { WorkOrderMini } from '../../../models/owns/workOrder';
import { Page } from '../../../models/owns/page';
import MeterCallRegister from './MeterCallRegister';

const RecentWorkOrders = ({ pmId, showMeterCalls = false }: { pmId: number; showMeterCalls?: boolean }) => {
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const [workOrders, setWorkOrders] = useState<Page<WorkOrderMini> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const fetchRecentWorkOrders = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await api.get<Page<WorkOrderMini>>(
          `preventive-maintenances/${pmId}/work-order-history?page=${page}&size=10`
        );
        if (!cancelled) setWorkOrders(response);
      } catch (error) {
        console.error('Failed to fetch preventive maintenance work-order history:', error);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (pmId) {
      fetchRecentWorkOrders();
    }
    return () => {
      cancelled = true;
    };
  }, [pmId, page, reloadKey]);

  return (
    <Stack spacing={1}>
      <Typography variant="h6">{t('recent_work_orders')}</Typography>
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => setReloadKey((current) => current + 1)}>{t('retry')}</Button>}
        >
          {t('pm_work_order_history_load_error')}
        </Alert>
      )}
      {!loading && !error && workOrders && workOrders.content.length > 0 ? (
        <List sx={{ width: '100%' }}>
          {workOrders.content.map((workOrder) => (
            <ListItemButton
              key={workOrder.id}
              onClick={() => navigate(getWorkOrderUrl(workOrder.id))}
              sx={{ px: 1 }}
            >
              <ListItemText
                primary={`${workOrder.customId ? `${workOrder.customId} · ` : ''}${workOrder.title}`}
                secondary={
                  <>
                    {t('created')}: {getFormattedDate(workOrder.createdAt)}
                    {workOrder.dueDate && ` · ${t('due_date')}: ${getFormattedDate(workOrder.dueDate)}`}
                  </>
                }
              />
              <Box
                sx={{
                  backgroundColor:
                    workOrder.status === 'IN_PROGRESS'
                      ? theme.colors.success.main
                      : workOrder.status === 'ON_HOLD'
                      ? theme.colors.warning.main
                      : theme.colors.alpha.black[30],
                  color: 'white',
                  width: 'fit-content',
                  height: 'fit-content',
                  py: 0.5,
                  px: 1,
                  borderRadius: 1
                }}
              >
                <Typography variant="body2">{t(workOrder.status)}</Typography>
              </Box>
            </ListItemButton>
          ))}
        </List>
      ) : !loading && !error ? <Typography color="text.secondary">{t('no_recent_work_orders')}</Typography> : null}
      {!loading && !error && workOrders && workOrders.totalPages > 1 && (
        <Pagination
          count={workOrders.totalPages}
          page={page + 1}
          onChange={(_event, value) => setPage(value - 1)}
          color="primary"
          sx={{ alignSelf: 'center' }}
        />
      )}
      {showMeterCalls && <MeterCallRegister pmId={pmId} />}
    </Stack>
  );
};

export default RecentWorkOrders;
