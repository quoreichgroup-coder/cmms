import { useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import AnalyticsCard from '../../AnalyticsCard';
import { Filter } from '../WOModal';
import { useDispatch, useSelector } from '../../../../../store';
import { useEffect } from 'react';
import { getQpmChartColor } from '../../../../../utils/chartColors';
import Loading from '../../Loading';
import { getDowntimesAndCostsByAsset } from '../../../../../slices/analytics/asset';

interface WOByPrimaryUserProps {
  handleOpenModal: (
    columns: string[],
    filters: Filter[],
    title: string
  ) => void;
  start: Date;
  end: Date;
  companyId?: number;
}

function DowntimesAndCosts({
  handleOpenModal,
  start,
  end,
  companyId
}: WOByPrimaryUserProps) {
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { downtimesAndCostsByAsset, loading, errors } = useSelector(
    (state) => state.assetAnalytics
  );

  useEffect(() => {
    dispatch(getDowntimesAndCostsByAsset(start, end, companyId));
  }, [start, end, companyId]);

  const columns: string[] = ['id'];

  const formattedData: {
    label: string;
    duration: number;
    cost: number;
    color: string;
    filters: Filter[];
  }[] = downtimesAndCostsByAsset.map((asset) => {
    return {
      label: asset.name,
      duration: Number((asset.duration / 3600).toFixed(2)),
      cost: Number(asset.workOrdersCosts.toFixed(2)),
      color: getQpmChartColor(`asset-${asset.id}`),
      filters: [{ key: 'asset', value: asset.id }]
    };
  });
  const title = t('downtime_and_costs');
  return (
    <AnalyticsCard title={title}>
      {loading.downtimesAndCostsByAsset || errors.downtimesAndCostsByAsset ? (
        <Loading
          error={errors.downtimesAndCostsByAsset}
          onRetry={() =>
            dispatch(getDowntimesAndCostsByAsset(start, end, companyId))
          }
        />
      ) : (
        <ComposedChart width={508} height={508} data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" hide />
          <YAxis yAxisId="left-axis" unit={t('hours')} />
          <YAxis yAxisId="right-axis" orientation="right" />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="duration"
            fill={theme.palette.primary.main}
            name={t('total_downtime_in_hours')}
            yAxisId="left-axis"
          >
            {formattedData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.color}
                onClick={() => {
                  handleOpenModal(columns, entry.filters, t(title));
                }}
              />
            ))}
          </Bar>
          <Line
            name={t('cost')}
            type="monotone"
            dataKey="cost"
            stroke={theme.palette.warning.main}
            yAxisId="right-axis"
          />
        </ComposedChart>
      )}
    </AnalyticsCard>
  );
}

export default DowntimesAndCosts;
