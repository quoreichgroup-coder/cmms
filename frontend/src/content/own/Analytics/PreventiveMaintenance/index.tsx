import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Grid,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { useTranslation } from 'react-i18next';
import AnalyticsLayout from '../AnalyticsLayout';
import useAuth from '../../../../hooks/useAuth';
import { PermissionEntity } from '../../../../models/owns/role';
import { PlanFeature } from '../../../../models/owns/subscriptionPlan';
import {
  PreventiveMaintenanceCallAnalyticsDTO,
  preventiveMaintenanceCallStatuses,
  toPreventiveMaintenanceCallChartRows
} from '../../../../models/owns/preventiveMaintenanceAnalytics';
import api, { getErrorMessage } from '../../../../utils/api';
import AnalyticsPeriodSelector from '../AnalyticsPeriodSelector';

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;

export default function PreventiveMaintenanceAnalytics() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, hasFeature, hasViewPermission } = useAuth();
  const allowed =
    !!user &&
    user.superAccountRelations.length === 0 &&
    hasFeature(PlanFeature.PREVENTIVE_MAINTENANCE) &&
    hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES);
  const [periodDays, setPeriodDays] = useState(30);
  const end = useMemo(() => new Date(), []);
  const start = useMemo(() => {
    const value = new Date(end);
    value.setDate(value.getDate() - (periodDays - 1));
    return value;
  }, [end, periodDays]);
  const [stats, setStats] = useState<PreventiveMaintenanceCallAnalyticsDTO[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const from = dateKey(start);
  const to = dateKey(end);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<PreventiveMaintenanceCallAnalyticsDTO[]>(
        `preventive-maintenances/analytics/calls?startDate=${from}&endDate=${to}`
      )
      .then(setStats)
      .catch((reason) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false));
  }, [from, to]);
  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const rows = useMemo(
    () =>
      toPreventiveMaintenanceCallChartRows(stats)
        .map((row) => ({
          status: row.status,
          name: t(row.status),
          value: row.CALENDAR + row.METER
        }))
        .filter((row) => row.value > 0),
    [stats, t]
  );
  const statusColors: Record<
    typeof preventiveMaintenanceCallStatuses[number],
    string
  > = {
    PLANNED: theme.palette.info.main,
    DUE: theme.palette.warning.main,
    RESCHEDULED: theme.palette.secondary.main,
    GENERATED: theme.palette.primary.dark,
    COMPLETED: theme.palette.success.main,
    IGNORED: theme.palette.grey[500]
  };

  return (
    <AnalyticsLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        <Typography variant="h2" fontWeight={700}>
          {t('preventive_maintenance_analytics')}
        </Typography>
        <Typography color="text.secondary" mb={2}>
          {t('preventive_maintenance_analytics_subtitle')}
        </Typography>
        <Stack direction="row" justifyContent="flex-end" mb={2}>
          <AnalyticsPeriodSelector days={periodDays} onChange={setPeriodDays} />
        </Stack>
        {!allowed ? (
          <Alert severity="info">
            {t('preventive_maintenance_analytics_access_required')}
          </Alert>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card sx={{ p: { xs: 2, md: 3 }, boxShadow: 'none' }}>
                <Typography variant="h5">
                  {t('preventive_maintenance_calls_by_status')}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {t('preventive_maintenance_calls_period_subtitle')}
                </Typography>
                {loading ? (
                  <Stack alignItems="center" py={8}>
                    <CircularProgress />
                  </Stack>
                ) : error ? (
                  <Stack spacing={2}>
                    <Alert severity="error">{error}</Alert>
                    <Button onClick={load}>{t('retry')}</Button>
                  </Stack>
                ) : rows.length === 0 ? (
                  <Alert severity="info">{t('no_data_for_period')}</Alert>
                ) : (
                  <Box
                    role="img"
                    aria-label={t(
                      'preventive_maintenance_calls_accessible_summary',
                      {
                        total: rows.reduce((sum, row) => sum + row.value, 0),
                        statuses: rows
                          .map((row) => `${row.name}: ${row.value}`)
                          .join(', ')
                      }
                    )}
                    sx={{ height: 390 }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={rows}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="48%"
                          outerRadius="72%"
                        >
                          {rows.map((row) => (
                            <Cell
                              key={row.name}
                              fill={statusColors[row.status]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          iconType="circle"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  {t('preventive_maintenance_analytics_data_note')}
                </Typography>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </AnalyticsLayout>
  );
}
