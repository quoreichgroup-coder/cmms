import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme
} from '@mui/material';
import { startOfWeek } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useTranslation } from 'react-i18next';
import AnalyticsLayout from '../AnalyticsLayout';
import useAuth from '../../../../hooks/useAuth';
import { useDispatch, useSelector } from '../../../../store';
import { PlanFeature } from '../../../../models/owns/subscriptionPlan';
import { PermissionEntity } from '../../../../models/owns/role';
import { getOverview } from '../../../../slices/workload';
import { getCapacityUtilizationPercent } from '../../WorkOrders/WorkloadView/capacityUtilization';
import AnalyticsPeriodSelector from '../AnalyticsPeriodSelector';

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;

export default function CapacityAnalytics() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user, hasFeature, hasViewOtherPermission, hasEditOtherPermission } =
    useAuth();
  const { overview, loadingOverview, overviewError } = useSelector(
    (state) => state.workload
  );
  const allowed =
    !!user &&
    user.superAccountRelations.length === 0 &&
    hasFeature(PlanFeature.RESOURCE_PLANNING) &&
    hasViewOtherPermission(PermissionEntity.WORK_ORDERS) &&
    hasEditOtherPermission(PermissionEntity.PEOPLE_AND_TEAMS);
  const [periodDays, setPeriodDays] = useState(30);
  const [grouping, setGrouping] = useState<'day' | 'week' | 'month'>('week');
  const end = useMemo(() => new Date(), []);
  const start = useMemo(() => {
    const value = new Date(end);
    value.setDate(value.getDate() - (periodDays - 1));
    return value;
  }, [end, periodDays]);
  const from = dateKey(start);
  const to = dateKey(end);

  useEffect(() => {
    if (allowed) dispatch(getOverview(from, to));
  }, [allowed, dispatch, from, to]);

  const rows = useMemo(() => {
    const days = overview?.days ?? [];
    if (grouping === 'day') {
      return days.map((day) => ({
        ...day,
        label: new Intl.DateTimeFormat(i18n.language, {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        }).format(new Date(`${day.date}T12:00:00`)),
        capacityHours: day.teamCapacityMinutes / 60,
        allocatedHours: day.teamAllocatedMinutes / 60,
        utilizationPercent: getCapacityUtilizationPercent(
          day.teamAllocatedMinutes,
          day.teamCapacityMinutes
        )
      }));
    }

    const buckets = new Map<
      string,
      { dates: string[]; capacityMinutes: number; allocatedMinutes: number }
    >();
    days.forEach((day) => {
      const date = new Date(`${day.date}T12:00:00`);
      const bucketDate =
        grouping === 'week'
          ? startOfWeek(date, { weekStartsOn: 1 })
          : new Date(date.getFullYear(), date.getMonth(), 1, 12);
      const key = dateKey(bucketDate);
      const bucket = buckets.get(key) ?? {
        dates: [],
        capacityMinutes: 0,
        allocatedMinutes: 0
      };
      bucket.dates.push(day.date);
      bucket.capacityMinutes += day.teamCapacityMinutes;
      bucket.allocatedMinutes += day.teamAllocatedMinutes;
      buckets.set(key, bucket);
    });

    return Array.from(buckets.entries()).map(([key, bucket]) => {
      const bucketDate = new Date(`${key}T12:00:00`);
      let label: string;
      if (grouping === 'month') {
        label = new Intl.DateTimeFormat(i18n.language, {
          month: 'short',
          year: 'numeric'
        }).format(bucketDate);
      } else {
        const firstDate = new Date(`${bucket.dates[0]}T12:00:00`);
        const lastDate = new Date(
          `${bucket.dates[bucket.dates.length - 1]}T12:00:00`
        );
        const dayFormatter = new Intl.DateTimeFormat(i18n.language, {
          day: 'numeric'
        });
        const endFormatter = new Intl.DateTimeFormat(i18n.language, {
          day: 'numeric',
          month: 'short'
        });
        label = `${dayFormatter.format(firstDate)}–${endFormatter.format(
          lastDate
        )}`;
      }
      return {
        date: key,
        label,
        capacityHours: bucket.capacityMinutes / 60,
        allocatedHours: bucket.allocatedMinutes / 60,
        utilizationPercent: getCapacityUtilizationPercent(
          bucket.allocatedMinutes,
          bucket.capacityMinutes
        )
      };
    });
  }, [grouping, i18n.language, overview]);

  return (
    <AnalyticsLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        <Typography variant="h2" fontWeight={700}>
          {t('capacity_planned_vs_allocated')}
        </Typography>
        <Typography color="text.secondary" mb={2}>
          {t('capacity_analytics_subtitle')}
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="flex-end"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={1}
          mb={2}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={grouping}
            aria-label={t('analytics_grouping')}
            onChange={(_event, value: 'day' | 'week' | 'month' | null) => {
              if (value) setGrouping(value);
            }}
          >
            <ToggleButton value="day">{t('analytics_group_day')}</ToggleButton>
            <ToggleButton value="week">
              {t('analytics_group_week')}
            </ToggleButton>
            <ToggleButton value="month">
              {t('analytics_group_month')}
            </ToggleButton>
          </ToggleButtonGroup>
          <AnalyticsPeriodSelector days={periodDays} onChange={setPeriodDays} />
        </Stack>
        {!allowed ? (
          <Alert severity="info">
            {t('capacity_analytics_access_required')}
          </Alert>
        ) : (
          <Card sx={{ p: { xs: 2, md: 3 }, boxShadow: 'none' }}>
            {loadingOverview ? (
              <Stack alignItems="center" py={8}>
                <CircularProgress />
              </Stack>
            ) : overviewError ? (
              <Stack spacing={2}>
                <Alert severity="error">{overviewError}</Alert>
                <Button onClick={() => dispatch(getOverview(from, to))}>
                  {t('retry')}
                </Button>
              </Stack>
            ) : rows.length === 0 ? (
              <Alert severity="info">{t('no_data_for_period')}</Alert>
            ) : (
              <Box
                role="img"
                aria-label={t('capacity_chart_accessible_summary', {
                  periods: rows.length,
                  capacity: rows
                    .reduce((sum, row) => sum + row.capacityHours, 0)
                    .toFixed(1),
                  allocated: rows
                    .reduce((sum, row) => sum + row.allocatedHours, 0)
                    .toFixed(1),
                  peak: rows
                    .reduce(
                      (peak, row) =>
                        Math.max(peak, row.utilizationPercent ?? 0),
                      0
                    )
                    .toFixed(1)
                })}
                sx={{ height: 420 }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rows}
                    margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
                  >
                    <CartesianGrid
                      stroke={theme.palette.divider}
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fill: theme.palette.text.secondary,
                        fontSize: 11
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="hours"
                      allowDecimals={false}
                      tick={{ fill: theme.palette.text.secondary }}
                    />
                    <YAxis
                      yAxisId="percent"
                      orientation="right"
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fill: theme.palette.text.secondary }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        `${Number(value).toFixed(1)}${
                          name === t('capacity_utilization_percent')
                            ? '%'
                            : ' h'
                        }`,
                        name
                      ]}
                    />
                    <Legend />
                    <Bar
                      yAxisId="hours"
                      dataKey="capacityHours"
                      name={t('available_capacity_hours')}
                      fill={theme.palette.info.main}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="hours"
                      dataKey="allocatedHours"
                      name={t('allocated_work_hours')}
                      fill={theme.palette.primary.main}
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="percent"
                      type="monotone"
                      dataKey="utilizationPercent"
                      name={t('capacity_utilization_percent')}
                      stroke={theme.palette.error.main}
                      strokeWidth={2}
                      connectNulls
                      dot={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary">
              {t('capacity_analytics_data_note')}
            </Typography>
          </Card>
        )}
      </Box>
    </AnalyticsLayout>
  );
}
