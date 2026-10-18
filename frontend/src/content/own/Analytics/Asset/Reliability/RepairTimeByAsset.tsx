import { useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
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
import Loading from '../../Loading';
import { getRepairTimeByAsset } from '../../../../../slices/analytics/asset';
import { getRandomColor } from '../../../../../utils/overall';

interface WOStatusPieProps {
  handleOpenModal: (
    columns: string[],
    filters: Filter[],
    title: string
  ) => void;
  start: Date;
  end: Date;
  assetColors: { color: string; id: number }[];
  companyId?: number;
}

function RepairTimeByAsset({
  handleOpenModal,
  start,
  end,
  assetColors,
  companyId
}: WOStatusPieProps) {
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { repairTimeByAsset, loading, errors } = useSelector(
    (state) => state.assetAnalytics
  );

  useEffect(() => {
    dispatch(getRepairTimeByAsset(start, end, companyId));
  }, [start, end, companyId]);
  const columns: string[] = ['id'];

  const formattedData: {
    label: string;
    duration: number;
    color: string;
    filters: Filter[];
  }[] = repairTimeByAsset.map((asset, index, arr) => {
    return {
      label: asset.name,
      duration: asset.duration,
      average: (
        arr.reduce((prev, curr) => prev + curr.duration, 0) / arr.length
      ).toFixed(2),
      color: assetColors.find((assetColor) => assetColor.id === asset.id)
        ?.color,
      filters: [{ key: 'asset', value: asset.id }]
    };
  });

  const title = t('MTTR');
  return (
    <AnalyticsCard title={title}>
      {loading.repairTimeByAsset || errors.repairTimeByAsset ? (
        <Loading
          error={errors.repairTimeByAsset}
          onRetry={() => dispatch(getRepairTimeByAsset(start, end, companyId))}
        />
      ) : (
        <ComposedChart width={508} height={508} data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" hide />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="duration"
            fill={theme.palette.primary.main}
            name={t('mean_time_to_repair_in_hours')}
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
            name={t('average')}
            type="monotone"
            dataKey="average"
            stroke={theme.palette.warning.main}
          />
        </ComposedChart>
      )}
    </AnalyticsCard>
  );
}

export default RepairTimeByAsset;
