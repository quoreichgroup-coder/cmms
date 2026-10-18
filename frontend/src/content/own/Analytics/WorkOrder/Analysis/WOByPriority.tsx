import { useTranslation } from 'react-i18next';
import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';
import AnalyticsCard from '../../AnalyticsCard';
import { Filter } from '../WOModal';
import { useDispatch, useSelector } from '../../../../../store';
import { useEffect } from 'react';
import { getCompleteByPriority } from '../../../../../slices/analytics/workOrder';
import { getPriorityLabel } from '../../../../../utils/formatters';
import Loading from '../../Loading';
import { qpmPriorityTokens } from '../../../../../theme/tokens';

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

function WOByPriority({
  handleOpenModal,
  start,
  end,
  companyId
}: WOByPrimaryUserProps) {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { completeByPriority, loading, errors } = useSelector(
    (state) => state.woAnalytics
  );

  useEffect(() => {
    dispatch(getCompleteByPriority(start, end, companyId));
  }, [start, end, companyId]);

  const columns = ['id'];

  const formattedData = Object.entries(completeByPriority).map(
    ([priority, count]) => {
      return {
        label: getPriorityLabel(priority, t),
        value: count,
        color:
          qpmPriorityTokens[priority]?.foreground ??
          qpmPriorityTokens.DEFAULT.foreground,
        filters: [{ key: 'priority', value: priority }]
      };
    }
  );
  const title = t('grouped_by_priority');
  return (
    <AnalyticsCard title={title}>
      {loading.completeByPriority || errors.completeByPriority ? (
        <Loading
          error={errors.completeByPriority}
          onRetry={() => dispatch(getCompleteByPriority(start, end, companyId))}
        />
      ) : (
        <PieChart width={200} height={300}>
          <Pie
            data={formattedData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={50}
            fill="#8884d8"
          >
            {formattedData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.color}
                onClick={() => {
                  handleOpenModal(columns, entry.filters, title);
                }}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      )}
    </AnalyticsCard>
  );
}

export default WOByPriority;
