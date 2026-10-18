import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

const startOfIsoWeek = (date: Date): Date => {
  const result = new Date(date);
  const weekday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - weekday);
  result.setHours(0, 0, 0, 0);
  return result;
};

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
  const { user, companySettings } = useAuth();
  const analytics = useSelector((state) => state.woAnalytics);
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

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

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
  };
  const setIsoWeek = () => {
    const selectedEnd = new Date();
    selectedEnd.setHours(23, 59, 59, 999);
    setStart(startOfIsoWeek(selectedEnd));
    setEnd(selectedEnd);
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
            setStart={setStart}
            setEnd={setEnd}
            companyId={companyId}
            onCompanyChange={setCompanyId}
            months={1}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={setIsoWeek}>
              {t('current_iso_week')}
            </Button>
            <Button variant="outlined" onClick={setLast30Days}>
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
