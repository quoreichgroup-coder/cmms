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
import { getIncompleteByPriority } from '../../../../../slices/analytics/workOrder';
import Loading from '../../Loading';
import { qpmPriorityTokens } from '../../../../../theme/tokens';
import { getPriorityLabel } from '../../../../../utils/formatters';

interface WOStatusIncompleteProps {
  handleOpenModal: (
    columns: string[],
    filters: Filter[],
    title: string
  ) => void;
  start: Date;
  end: Date;
  companyId?: number;
}

function IncompleteWO({
  handleOpenModal,
  start,
  end,
  companyId
}: WOStatusIncompleteProps) {
  const { t }: { t: any } = useTranslation();
  const { incompleteByPriority, loading, errors } = useSelector(
    (state) => state.woAnalytics
  );
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getIncompleteByPriority(start, end, companyId));
  }, [start, end, companyId]);

  const columns: string[] = ['id'];

  const formattedData: {
    label: string;
    count: number;
    color: string;
    estimatedHours: number;
    filters: Filter[];
  }[] = [
    {
      label: getPriorityLabel('HIGH', t),
      count: incompleteByPriority.high.count,
      color: qpmPriorityTokens.HIGH.foreground,
      estimatedHours: incompleteByPriority.high.estimatedHours,
      filters: [{ key: 'fs', value: false }]
    },
    {
      label: getPriorityLabel('MEDIUM', t),
      count: incompleteByPriority.medium.count,
      color: qpmPriorityTokens.MEDIUM.foreground,
      estimatedHours: incompleteByPriority.medium.estimatedHours,
      filters: [{ key: 'fs', value: false }]
    },
    {
      label: getPriorityLabel('LOW', t),
      count: incompleteByPriority.low.count,
      color: qpmPriorityTokens.LOW.foreground,
      estimatedHours: incompleteByPriority.low.estimatedHours,
      filters: [{ key: 'fs', value: false }]
    },
    {
      label: getPriorityLabel('NONE', t),
      count: incompleteByPriority.none.count,
      color: qpmPriorityTokens.DEFAULT.foreground,
      estimatedHours: incompleteByPriority.none.estimatedHours,
      filters: [{ key: 'fs', value: false }]
    }
  ];
  const title = t('work_remaining');
  return (
    <AnalyticsCard title={title} description="work_remaining_description">
      {loading.incompleteByPriority || errors.incompleteByPriority ? (
        <Loading
          error={errors.incompleteByPriority}
          onRetry={() =>
            dispatch(getIncompleteByPriority(start, end, companyId))
          }
        />
      ) : (
        <ComposedChart width={508} height={508} data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis yAxisId="left-axis" />
          <YAxis yAxisId="right-axis" orientation="right" unit={t('hours')} />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="count"
            fill="#8884d8"
            name={t('work_orders')}
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
            name={t('estimated_duration')}
            type="monotone"
            dataKey="estimatedHours"
            stroke="#ff7300"
            yAxisId="right-axis"
          />
        </ComposedChart>
      )}
    </AnalyticsCard>
  );
}

export default IncompleteWO;
