import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Stack,
  Typography
} from '@mui/material';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import useAuth from '../../../../hooks/useAuth';
import { Page, SearchCriteria } from '../../../../models/owns/page';
import { PermissionEntity } from '../../../../models/owns/role';
import PreventiveMaintenance from '../../../../models/owns/preventiveMaintenance';
import { PlanFeature } from '../../../../models/owns/subscriptionPlan';
import api from '../../../../utils/api';
import { getPreventiveMaintenanceUrl } from '../../../../utils/urlPaths';
import { isCloudVersion } from '../../../../config';

export default function AssetMaintenanceSummary({
  assetId
}: {
  assetId: number;
}) {
  const { t, i18n } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const navigate = useNavigate();
  const { hasViewPermission, hasCreatePermission, hasFeature, user } =
    useAuth();
  const canView = hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES);
  const available = hasFeature(PlanFeature.PREVENTIVE_MAINTENANCE);
  const [items, setItems] = useState<PreventiveMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    if (!canView || !available) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    setFailed(false);
    setItems([]);
    const criteria: SearchCriteria = {
      filterFields: [{ field: 'asset.id', operation: 'eq', value: assetId }],
      pageNum: 0,
      pageSize: 20,
      sortField: 'nextWorkOrderDate',
      direction: 'ASC'
    };
    api
      .post<Page<PreventiveMaintenance>>(
        'preventive-maintenances/search',
        criteria,
        { signal: controller.signal }
      )
      .then((result) => {
        if (!controller.signal.aborted) setItems(result.content);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [assetId, attempt, available, canView]);

  const upcoming = useMemo(
    () =>
      items
        .filter((item) => !item.schedule?.disabled && item.nextWorkOrderDate)
        .sort(
          (first, second) =>
            new Date(first.nextWorkOrderDate).getTime() -
            new Date(second.nextWorkOrderDate).getTime()
        ),
    [items]
  );

  if (!canView) return null;

  if (!available) {
    const upgradeUrl = isCloudVersion
      ? '/app/subscription/plans'
      : '/app/account/company-profile';
    return (
      <Card sx={{ p: 2.5, height: '100%' }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          {t('preventive_maintenance')}
        </Typography>
        <Alert
          severity="info"
          action={
            user.ownsCompany ? (
              <Button
                component={Link}
                to={upgradeUrl}
                color="inherit"
              >
                {t('upgrade_now')}
              </Button>
            ) : undefined
          }
        >
          {t('upgrade_preventive_maintenance')}
        </Alert>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1 }}
      >
        <Typography variant="h5">{t('preventive_maintenance')}</Typography>
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/app/preventive-maintenances">
            {t('view_all')}
          </Button>
          {hasCreatePermission(PermissionEntity.PREVENTIVE_MAINTENANCES) && (
            <Button
              size="small"
              variant="contained"
              onClick={() =>
                navigate(
                  `/app/preventive-maintenances?new=true&asset=${assetId}`
                )
              }
            >
              {t('schedule_wo')}
            </Button>
          )}
        </Stack>
      </Stack>
      {loading ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <CircularProgress
            size={28}
            aria-label={t('preventive_maintenance')}
          />
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
      ) : upcoming.length ? (
        <Stack spacing={1.5}>
          {upcoming.slice(0, 4).map((item) => {
            const overdue =
              new Date(item.nextWorkOrderDate).getTime() < Date.now();
            return (
              <Box key={item.id}>
                <Button
                  component={Link}
                  to={getPreventiveMaintenanceUrl(item.id)}
                  sx={{
                    px: 0,
                    textTransform: 'none',
                    textAlign: 'left',
                    overflowWrap: 'anywhere'
                  }}
                >
                  {item.name || item.title}
                </Button>
                <Typography
                  variant="body2"
                  color={overdue ? 'error.main' : 'text.secondary'}
                >
                  {overdue ? `${t('overdue')} · ` : ''}
                  {getFormattedDate(item.nextWorkOrderDate)}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Typography color="text.secondary" sx={{ py: 3 }}>
          {t('asset_no_preventive_maintenance')}
        </Typography>
      )}
    </Card>
  );
}
