import Asset from '../../../../models/owns/asset';
import {
  Box,
  Card,
  CardActionArea,
  Grid,
  Stack,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from '../../../../store';
import { useContext, useEffect, useState } from 'react';
import { getAssetWorkOrders } from '../../../../slices/asset';
import { useNavigate } from 'react-router-dom';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import WorkOrderStatusChip from '../../WorkOrders/WorkOrderStatusChip';
import { isDueDateBeforeDay } from '../../WorkOrders/dueDate';
import ContentState from '../../components/ContentState';

interface PropsType {
  asset: Asset;
}

const AssetWorkOrders = ({ asset }: PropsType) => {
  const { t }: { t: any } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { assetInfos } = useSelector((state) => state.assets);
  const workOrders = assetInfos[asset?.id]?.workOrders;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadIndex, setReloadIndex] = useState(0);

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
  return (
    <Box sx={{ px: { xs: 0, sm: 1, md: 2 } }}>
      <Grid container spacing={2}>
        {workOrders?.length ? (
          workOrders.map((workOrder) => (
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
                message={t('no_wo_linked_asset')}
                minHeight={220}
              />
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AssetWorkOrders;
