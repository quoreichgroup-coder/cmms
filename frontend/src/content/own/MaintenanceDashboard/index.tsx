import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  Skeleton,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { lighten } from '@mui/material/styles';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { TitleContext } from '../../../contexts/TitleContext';
import useAuth from '../../../hooks/useAuth';
import { useDispatch, useSelector } from '../../../store';
import {
  getCompleteCosts,
  getCompleteCostsByDate,
  getIncompleteStats,
  getOverviewStats,
  getStatusesByDate,
  getWOHours
} from '../../../slices/analytics/workOrder';
import CustomDateRangePicker from '../Analytics/CustomDateRangePicker';
import {
  agingBand,
  createDashboardCurrencyFormatter,
  formatAnalyticsDateLabel,
  percentageOrNull
} from './metricCalculations';
import { qpmWorkOrderStatusTokens } from 'src/theme/tokens';
import { getCapacityUtilizationPercent } from '../WorkOrders/WorkloadView/capacityUtilization';
import { PlanFeature } from '../../../models/owns/subscriptionPlan';
import { PermissionEntity } from '../../../models/owns/role';
import {
  PreventiveMaintenanceCallAnalyticsDTO,
  toPreventiveMaintenanceCallChartRows
} from '../../../models/owns/preventiveMaintenanceAnalytics';
import { getOverview as getWorkloadOverview } from '../../../slices/workload';
import api, { getErrorMessage } from '../../../utils/api';

const startOfIsoWeek = (date: Date): Date => {
  const result = new Date(date);
  const weekday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - weekday);
  result.setHours(0, 0, 0, 0);
  return result;
};

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;

function MetricCard({
  title,
  value,
  caption,
  icon,
  loading,
  onClick
}: {
  title: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
  loading: boolean;
  onClick?: () => void;
}) {
  const theme = useTheme();
  return (
    <Card
      onClick={onClick}
      role={onClick ? 'link' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      sx={{
        height: '100%',
        p: { xs: 2, md: 2.5 },
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: theme.transitions.create(['border-color', 'transform']),
        '&:hover': onClick
          ? {
              borderColor: theme.palette.primary.main,
              transform: 'translateY(-2px)'
            }
          : undefined,
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2
        }
      }}
    >
      <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Box minWidth={0}>
          <Typography color="text.secondary" variant="subtitle2" gutterBottom>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={96} height={42} />
          ) : (
            <Typography
              variant="h3"
              fontWeight={700}
              sx={{ fontSize: { xs: '1.35rem', sm: '1.7rem', md: '2rem' } }}
            >
              {value}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        </Box>
        <Box
          aria-hidden="true"
          sx={{
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            color: 'primary.main',
            backgroundColor: theme.palette.action.hover,
            '& svg': { fontSize: 23 }
          }}
        >
          {icon}
        </Box>
      </Stack>
    </Card>
  );
}

function ChartPanel({
  title,
  subtitle,
  loading,
  error,
  hasData,
  onRetry,
  chartDescription,
  children
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  error?: string;
  hasData: boolean;
  onRetry: () => void;
  chartDescription: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Card sx={{ height: '100%', p: { xs: 2, md: 2.5 }, boxShadow: 'none' }}>
      <Stack spacing={0.5} mb={2}>
        <Typography variant="h5">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>
      {loading ? (
        <Box height={280} display="grid" sx={{ placeItems: 'center' }}>
          <CircularProgress size={28} aria-label={t('loading')} />
        </Box>
      ) : error ? (
        <Stack
          minHeight={280}
          justifyContent="center"
          alignItems="center"
          spacing={1.5}
        >
          <Alert severity="error">{error}</Alert>
          <Button onClick={onRetry} variant="outlined" size="small">
            {t('retry')}
          </Button>
        </Stack>
      ) : hasData ? (
        <Box
          height={280}
          aria-label={`${title}. ${chartDescription}`}
          role="img"
        >
          {children}
        </Box>
      ) : (
        <Stack
          height={280}
          alignItems="center"
          justifyContent="center"
          color="text.secondary"
        >
          <Typography>{t('no_data_for_period')}</Typography>
        </Stack>
      )}
    </Card>
  );
}

export default function MaintenanceDashboard() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { setTitle } = useContext(TitleContext);
  const {
    user,
    companySettings,
    hasFeature,
    hasViewPermission,
    hasViewOtherPermission,
    hasEditOtherPermission
  } = useAuth();
  const analytics = useSelector((state) => state.woAnalytics);
  const workload = useSelector((state) => state.workload);
  const canViewCapacity =
    !!user &&
    user.superAccountRelations.length === 0 &&
    hasFeature(PlanFeature.RESOURCE_PLANNING) &&
    hasViewOtherPermission(PermissionEntity.WORK_ORDERS) &&
    hasEditOtherPermission(PermissionEntity.PEOPLE_AND_TEAMS);
  const canViewPmAnalytics =
    !!user &&
    user.superAccountRelations.length === 0 &&
    hasFeature(PlanFeature.PREVENTIVE_MAINTENANCE) &&
    hasViewPermission(PermissionEntity.PREVENTIVE_MAINTENANCES);
  const [pmCallStats, setPmCallStats] = useState<
    PreventiveMaintenanceCallAnalyticsDTO[]
  >([]);
  const [pmCallStatsError, setPmCallStatsError] = useState<string | null>(null);
  const [pmCallStatsLoading, setPmCallStatsLoading] = useState(false);
  const pmCallStatsRequestId = useRef(0);
  const [capacityView, setCapacityView] = useState<'day' | 'week' | 'month'>(
    'day'
  );
  const now = useMemo(() => new Date(), []);
  const [end, setEnd] = useState(now);
  const [start, setStart] = useState(() => {
    const date = new Date(now);
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [companyId, setCompanyId] = useState<number | undefined>(
    user?.superAccountRelations?.[0]?.childCompanyId ?? undefined
  );

  useEffect(() => {
    setTitle(t('maintenance_dashboard'));
  }, [setTitle, t]);

  const loadMetrics = useCallback(() => {
    dispatch(getOverviewStats(start, end, companyId));
    dispatch(getIncompleteStats(start, end, companyId));
    dispatch(getStatusesByDate(start, end, companyId));
    dispatch(getCompleteCosts(start, end, companyId));
    dispatch(getCompleteCostsByDate(start, end, companyId));
    dispatch(getWOHours(start, end, companyId));
  }, [dispatch, start, end, companyId]);

  const loadPmCallStats = useCallback((rangeStart: Date, rangeEnd: Date) => {
    const requestId = ++pmCallStatsRequestId.current;
    setPmCallStatsLoading(true);
    setPmCallStatsError(null);
    api
      .get<PreventiveMaintenanceCallAnalyticsDTO[]>(
        `preventive-maintenances/analytics/calls?startDate=${localDateKey(
          rangeStart
        )}&endDate=${localDateKey(rangeEnd)}`
      )
      .then((stats) => {
        if (pmCallStatsRequestId.current === requestId) {
          setPmCallStats(stats);
        }
      })
      .catch((error) => {
        if (pmCallStatsRequestId.current === requestId) {
          setPmCallStatsError(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (pmCallStatsRequestId.current === requestId) {
          setPmCallStatsLoading(false);
        }
      });
    return requestId;
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (!canViewCapacity) return;
    dispatch(getWorkloadOverview(localDateKey(start), localDateKey(end)));
  }, [canViewCapacity, dispatch, start, end]);

  useEffect(() => {
    if (!canViewPmAnalytics) return;
    loadPmCallStats(start, end);
    return () => {
      pmCallStatsRequestId.current += 1;
    };
  }, [canViewPmAnalytics, loadPmCallStats, start, end]);

  const closureRate = percentageOrNull(
    analytics.overview.complete,
    analytics.overview.total
  );
  const completedCompliance = percentageOrNull(
    analytics.overview.compliant,
    analytics.overview.complete
  );
  const ageBand = agingBand(analytics.incompleteOverview.averageAge);
  const statusRows = analytics.statusesByDate.map((row) => ({
    ...row,
    label: formatAnalyticsDateLabel(row.date, i18n.language)
  }));
  const costRows = analytics.completeCostsByDate.map((row) => ({
    ...row,
    label: formatAnalyticsDateLabel(row.date, i18n.language),
    total: row.laborCost + row.partCost + row.additionalCost
  }));
  const capacityRows = (workload.overview?.days ?? []).map((day) => ({
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
  const capacityChartRows: Array<{
    label: string;
    capacityHours: number;
    allocatedHours: number;
    utilizationPercent: number | null;
  }> =
    capacityView !== 'month'
      ? capacityRows
      : Array.from(
          capacityRows.reduce((weeks, row) => {
            const weekStart = startOfIsoWeek(new Date(`${row.date}T12:00:00`));
            const key = localDateKey(weekStart);
            const current = weeks.get(key) ?? {
              dates: [] as string[],
              capacityHours: 0,
              allocatedHours: 0
            };
            current.dates.push(row.date);
            current.capacityHours += row.capacityHours;
            current.allocatedHours += row.allocatedHours;
            weeks.set(key, current);
            return weeks;
          }, new Map<string, { dates: string[]; capacityHours: number; allocatedHours: number }>())
        ).map(([, week]) => ({
          ...week,
          label:
            week.dates.length === 1
              ? new Intl.DateTimeFormat(i18n.language, {
                  day: 'numeric',
                  month: 'short'
                }).format(new Date(`${week.dates[0]}T12:00:00`))
              : `${new Intl.DateTimeFormat(i18n.language, {
                  day: 'numeric'
                }).format(
                  new Date(`${week.dates[0]}T12:00:00`)
                )}–${new Intl.DateTimeFormat(i18n.language, {
                  day: 'numeric',
                  month: 'short'
                }).format(
                  new Date(`${week.dates[week.dates.length - 1]}T12:00:00`)
                )}`,
          utilizationPercent: getCapacityUtilizationPercent(
            week.allocatedHours * 60,
            week.capacityHours * 60
          )
        }));
  const pmCallRows = toPreventiveMaintenanceCallChartRows(pmCallStats).map(
    (row) => ({
      ...row,
      label: t(row.status)
    })
  );
  const currency = createDashboardCurrencyFormatter(
    i18n.language,
    companySettings?.generalPreferences?.currency?.code
  );
  const number = new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 1
  });
  const latestStatusRow = statusRows[statusRows.length - 1];
  const statusChartDescription = latestStatusRow
    ? t('dashboard_status_chart_accessible_summary', {
        date: latestStatusRow.label,
        open: number.format(latestStatusRow.open),
        inProgress: number.format(latestStatusRow.inProgress),
        onHold: number.format(latestStatusRow.onHold),
        complete: number.format(latestStatusRow.complete)
      })
    : t('no_data_for_period');
  const totalCostAcrossDates = costRows.reduce(
    (sum, row) => sum + row.total,
    0
  );
  const costChartDescription = t('dashboard_cost_chart_accessible_summary', {
    periodCount: number.format(costRows.length),
    total: currency.format(totalCostAcrossDates)
  });
  const tooltipContentStyle = {
    backgroundColor: theme.palette.background.paper,
    borderColor: theme.palette.divider,
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.text.primary
  };
  const tooltipLabelStyle = {
    color: theme.palette.text.primary,
    fontWeight: 600
  };
  const tooltipItemStyle = { color: theme.palette.text.secondary };
  const chartStatusColor = (status: keyof typeof qpmWorkOrderStatusTokens) => {
    const color = qpmWorkOrderStatusTokens[status].foreground;
    return theme.palette.mode === 'dark' ? lighten(color, 0.35) : color;
  };

  const setLast30Days = () => {
    const selectedEnd = new Date();
    const selectedStart = new Date(selectedEnd);
    selectedStart.setDate(selectedStart.getDate() - 29);
    selectedStart.setHours(0, 0, 0, 0);
    setStart(selectedStart);
    setEnd(selectedEnd);
    setCapacityView('day');
  };
  const setIsoWeek = () => {
    const selectedEnd = new Date();
    selectedEnd.setHours(23, 59, 59, 999);
    setStart(startOfIsoWeek(selectedEnd));
    setEnd(selectedEnd);
    setCapacityView('week');
  };
  const setCurrentMonth = () => {
    const selectedEnd = new Date();
    selectedEnd.setHours(23, 59, 59, 999);
    const selectedStart = new Date(
      selectedEnd.getFullYear(),
      selectedEnd.getMonth(),
      1
    );
    selectedStart.setHours(0, 0, 0, 0);
    setStart(selectedStart);
    setEnd(selectedEnd);
    setCapacityView('month');
  };

  const openWorkOrders = () => navigate('/app/work-orders');
  const dateRangeLabel = `${new Intl.DateTimeFormat(i18n.language).format(
    start
  )} – ${new Intl.DateTimeFormat(i18n.language).format(end)}`;

  return (
    <Box sx={{ p: { xs: 2, md: 3, xl: 4 }, maxWidth: 1600, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', xl: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', xl: 'flex-end' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h2" fontWeight={700}>
            {t('maintenance_dashboard')}
          </Typography>
          <Typography color="text.secondary" mt={0.5}>
            {t('maintenance_dashboard_subtitle')}
          </Typography>
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={1}
          sx={{
            '& .MuiCard-root': { p: 0, boxShadow: 'none', border: 0 },
            '& .MuiStack-root': { flexWrap: 'wrap' },
            '& .MuiTextField-root': { width: { xs: '100%', sm: 230 } }
          }}
        >
          <CustomDateRangePicker
            start={start}
            end={end}
            setStart={(value) => {
              setStart(value);
              setCapacityView('day');
            }}
            setEnd={(value) => {
              setEnd(value);
              setCapacityView('day');
            }}
            companyId={companyId}
            onCompanyChange={setCompanyId}
            months={1}
          />
          <Stack direction="row" spacing={1}>
            <Button
              variant={capacityView === 'week' ? 'contained' : 'outlined'}
              onClick={setIsoWeek}
            >
              {t('current_iso_week')}
            </Button>
            <Button
              variant={capacityView === 'month' ? 'contained' : 'outlined'}
              onClick={setCurrentMonth}
            >
              {t('current_month')}
            </Button>
            <Button
              variant={capacityView === 'day' ? 'contained' : 'outlined'}
              onClick={setLast30Days}
            >
              {t('last_30_days')}
            </Button>
          </Stack>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={dateRangeLabel}
        />
        <Typography variant="caption" color="text.secondary">
          {t('dashboard_data_scoped_to_permissions')}
        </Typography>
      </Stack>

      <Grid container spacing={2} mb={1}>
        <Grid item xs={6} sm={6} xl={3}>
          <MetricCard
            title={t('work_orders_in_period')}
            value={number.format(analytics.overview.total)}
            caption={t('created_in_selected_period')}
            icon={<QueryStatsOutlinedIcon />}
            loading={analytics.loading.overview}
            onClick={openWorkOrders}
          />
        </Grid>
        <Grid item xs={6} sm={6} xl={3}>
          <MetricCard
            title={t('work_order_completion_ratio')}
            value={closureRate === null ? '—' : `${closureRate.toFixed(1)}%`}
            caption={t('completed_over_created_in_period', {
              complete: analytics.overview.complete,
              total: analytics.overview.total
            })}
            icon={<AssignmentTurnedInOutlinedIcon />}
            loading={analytics.loading.overview}
            onClick={() => navigate('/app/analytics/work-orders/status')}
          />
        </Grid>
        <Grid item xs={6} sm={6} xl={3}>
          <MetricCard
            title={t('completed_work_order_compliance')}
            value={
              completedCompliance === null
                ? '—'
                : `${completedCompliance.toFixed(1)}%`
            }
            caption={t('compliant_orders_count', {
              compliant: analytics.overview.compliant,
              complete: analytics.overview.complete
            })}
            icon={<AssignmentTurnedInOutlinedIcon />}
            loading={analytics.loading.overview}
            onClick={() => navigate('/app/analytics/work-orders/status')}
          />
        </Grid>
        <Grid item xs={6} sm={6} xl={3}>
          <MetricCard
            title={t('open_work_order_backlog')}
            value={number.format(analytics.incompleteOverview.total)}
            caption={t('average_age_days', {
              age: number.format(analytics.incompleteOverview.averageAge)
            })}
            icon={<AssignmentLateOutlinedIcon />}
            loading={analytics.loading.incompleteOverview}
            onClick={openWorkOrders}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {canViewCapacity && (
          <Grid item xs={12}>
            <ChartPanel
              title={t('capacity_planned_vs_allocated')}
              subtitle={t(
                capacityView === 'month'
                  ? 'capacity_chart_month_subtitle'
                  : capacityView === 'week'
                  ? 'capacity_chart_week_subtitle'
                  : 'capacity_chart_period_subtitle'
              )}
              loading={workload.loadingOverview}
              error={workload.overviewError}
              hasData={capacityChartRows.length > 0}
              chartDescription={t('capacity_chart_accessible_summary', {
                days: capacityChartRows.length,
                capacity: number.format(
                  capacityChartRows.reduce(
                    (sum, row) => sum + row.capacityHours,
                    0
                  )
                ),
                allocated: number.format(
                  capacityChartRows.reduce(
                    (sum, row) => sum + row.allocatedHours,
                    0
                  )
                ),
                peak: number.format(
                  Math.max(
                    0,
                    ...capacityChartRows.map(
                      (row) => row.utilizationPercent ?? 0
                    )
                  )
                )
              })}
              onRetry={() =>
                dispatch(
                  getWorkloadOverview(localDateKey(start), localDateKey(end))
                )
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={capacityChartRows}
                  barGap={6}
                  margin={{ top: 12, right: 16, left: -12, bottom: 8 }}
                >
                  <CartesianGrid
                    stroke={theme.palette.divider}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    interval="preserveStartEnd"
                    tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="hours"
                    allowDecimals={false}
                    tickFormatter={(value) => `${value}h`}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="percent"
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${number.format(Number(value))}${
                        name === t('capacity_utilization_percent') ? '%' : ' h'
                      }`,
                      name
                    ]}
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={32}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Bar
                    yAxisId="hours"
                    dataKey="capacityHours"
                    name={t('available_capacity_hours')}
                    fill={theme.palette.info.light}
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    yAxisId="hours"
                    dataKey="allocatedHours"
                    name={t('allocated_work_hours')}
                    fill={theme.palette.primary.main}
                    radius={[5, 5, 0, 0]}
                  />
                  <Line
                    yAxisId="percent"
                    type="monotone"
                    dataKey="utilizationPercent"
                    name={t('capacity_utilization_percent')}
                    stroke={theme.palette.error.main}
                    strokeWidth={2.5}
                    connectNulls
                    dot={{ r: 2.5, fill: theme.palette.error.main }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <Button
              size="small"
              sx={{ mt: 1 }}
              onClick={() => navigate('/app/analytics/capacity')}
            >
              {t('open_capacity_analytics')}
            </Button>
          </Grid>
        )}
        {canViewPmAnalytics && (
          <Grid item xs={12} lg={6}>
            <ChartPanel
              title={t('preventive_maintenance_calls_by_status')}
              subtitle={t('preventive_maintenance_calls_period_subtitle')}
              loading={pmCallStatsLoading}
              error={pmCallStatsError}
              hasData={pmCallStats.some((row) => row.count > 0)}
              chartDescription={t(
                'preventive_maintenance_calls_accessible_summary',
                {
                  total: pmCallStats.reduce((sum, row) => sum + row.count, 0),
                  statuses: pmCallRows
                    .filter((row) => row.CALENDAR + row.METER > 0)
                    .map(
                      (row) =>
                        `${row.label}: ${number.format(
                          row.CALENDAR + row.METER
                        )}`
                    )
                    .join(', ')
                }
              )}
              onRetry={() => loadPmCallStats(start, end)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pmCallRows}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={theme.palette.divider}
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                  />
                  <Legend />
                  <Bar
                    dataKey="CALENDAR"
                    name={t('calendar_trigger')}
                    fill={theme.palette.primary.main}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="METER"
                    name={t('meter_trigger')}
                    fill={theme.palette.warning.main}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </Grid>
        )}
        <Grid item xs={12} lg={8}>
          <ChartPanel
            title={t('work_order_status_trend')}
            subtitle={t('status_trend_selected_period')}
            loading={analytics.loading.statusesByDate}
            error={analytics.errors.statusesByDate}
            hasData={statusRows.length > 0}
            chartDescription={statusChartDescription}
            onRetry={() => dispatch(getStatusesByDate(start, end, companyId))}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={statusRows}
                margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  stroke={theme.palette.divider}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="open"
                  name={t('OPEN')}
                  stroke={chartStatusColor('OPEN')}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="inProgress"
                  name={t('IN_PROGRESS')}
                  stroke={chartStatusColor('IN_PROGRESS')}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="onHold"
                  name={t('ON_HOLD')}
                  stroke={chartStatusColor('ON_HOLD')}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="complete"
                  name={t('COMPLETE')}
                  stroke={chartStatusColor('COMPLETE')}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card
            sx={{ height: '100%', p: { xs: 2, md: 2.5 }, boxShadow: 'none' }}
          >
            <Typography variant="h5" mb={0.5}>
              {t('maintenance_cost')}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('completed_work_orders_created_in_period')}
            </Typography>
            {analytics.loading.completeCosts ? (
              <Skeleton width={150} height={56} />
            ) : analytics.errors.completeCosts ? (
              <Stack minHeight={220} justifyContent="center" spacing={1}>
                <Alert severity="error">{analytics.errors.completeCosts}</Alert>
                <Button
                  onClick={() =>
                    dispatch(getCompleteCosts(start, end, companyId))
                  }
                >
                  {t('retry')}
                </Button>
              </Stack>
            ) : (
              <>
                <Typography variant="h2" fontWeight={700}>
                  {currency.format(analytics.completeCosts.total)}
                </Typography>
                <Stack spacing={1.5} mt={3}>
                  {[
                    [t('labor_cost'), analytics.completeCosts.laborCost],
                    [t('parts_cost'), analytics.completeCosts.partCost],
                    [
                      t('additional_cost'),
                      analytics.completeCosts.additionalCost
                    ]
                  ].map(([label, value]) => (
                    <Stack
                      key={String(label)}
                      direction="row"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography color="text.secondary">{label}</Typography>
                      <Typography fontWeight={600}>
                        {currency.format(Number(value))}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <ChartPanel
            title={t('maintenance_cost_trend')}
            subtitle={t('completed_work_orders_by_completion_date')}
            loading={analytics.loading.completeCostsByDate}
            error={analytics.errors.completeCostsByDate}
            hasData={costRows.length > 0}
            chartDescription={costChartDescription}
            onRetry={() =>
              dispatch(getCompleteCostsByDate(start, end, companyId))
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={costRows}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke={theme.palette.divider}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => currency.format(value)}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Legend />
                <Bar
                  dataKey="laborCost"
                  name={t('labor_cost')}
                  stackId="cost"
                  fill={theme.colors.primary.main}
                />
                <Bar
                  dataKey="partCost"
                  name={t('parts_cost')}
                  stackId="cost"
                  fill={theme.colors.secondary.main}
                />
                <Bar
                  dataKey="additionalCost"
                  name={t('additional_cost')}
                  stackId="cost"
                  fill={theme.colors.warning.main}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card
            sx={{ height: '100%', p: { xs: 2, md: 2.5 }, boxShadow: 'none' }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
              <AccessTimeOutlinedIcon color="primary" />
              <Typography variant="h5">{t('labor_hours')}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('estimated_vs_recorded_hours')}
            </Typography>
            {analytics.loading.hours ? (
              <CircularProgress size={26} />
            ) : analytics.errors.hours ? (
              <Stack minHeight={180} justifyContent="center" spacing={1}>
                <Alert severity="error">{analytics.errors.hours}</Alert>
                <Button
                  onClick={() => dispatch(getWOHours(start, end, companyId))}
                >
                  {t('retry')}
                </Button>
              </Stack>
            ) : (
              <Stack spacing={2} mt={3}>
                {[
                  [t('estimated_hours'), analytics.hours.estimated],
                  [t('recorded_hours'), analytics.hours.actual]
                ].map(([label, value]) => (
                  <Stack
                    key={String(label)}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="baseline"
                  >
                    <Typography color="text.secondary">{label}</Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {number.format(Number(value))} h
                    </Typography>
                  </Stack>
                ))}
                <Typography variant="caption" color="text.secondary">
                  {t('not_capacity_utilization_note')}
                </Typography>
              </Stack>
            )}
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography fontWeight={700}>
          {t('dashboard_data_boundaries_title')}
        </Typography>
        <Typography variant="body2">
          {t('dashboard_data_boundaries_body', {
            aging: t(
              ageBand === 'critical'
                ? 'critical'
                : ageBand === 'attention'
                ? 'attention'
                : 'within_target'
            )
          })}
        </Typography>
        <Button
          size="small"
          sx={{ mt: 1 }}
          onClick={() => navigate('/app/analytics/work-orders/status')}
        >
          {t('open_work_order_analytics')}
        </Button>
      </Alert>
    </Box>
  );
}
