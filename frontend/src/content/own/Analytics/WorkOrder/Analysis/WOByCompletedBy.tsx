import { useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';
import AnalyticsCard from '../../AnalyticsCard';
import { Filter } from '../WOModal';
import { useDispatch, useSelector } from '../../../../../store';
import { useEffect } from 'react';
import { getCompleteByCompletedBy } from '../../../../../slices/analytics/workOrder';
import { getQpmChartColor } from '../../../../../utils/chartColors';
import Loading from '../../Loading';

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

function WOByCompletedBy({
  handleOpenModal,
  start,
  end,
  companyId
}: WOByPrimaryUserProps) {
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { completeByCompletedBy, loading, errors } = useSelector(
    (state) => state.woAnalytics
  );

  useEffect(() => {
    dispatch(getCompleteByCompletedBy(start, end, companyId));
  }, [start, end, companyId]);

  const columns = ['id'];

  const formattedData = completeByCompletedBy.map((user) => {
    return {
      label: `${user.firstName} ${user.lastName}`,
      value: user.count,
      color: getQpmChartColor(`user-${user.id}`),
      filters: [{ key: 'completedBy', value: user.id }]
    };
  });
  const title = t('grouped_by_completed_by');
  return (
    <AnalyticsCard title={title}>
      {loading.completeByCompletedBy || errors.completeByCompletedBy ? (
        <Loading
          error={errors.completeByCompletedBy}
          onRetry={() =>
            dispatch(getCompleteByCompletedBy(start, end, companyId))
          }
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
            fill={theme.palette.primary.main}
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
        </PieChart>
      )}
    </AnalyticsCard>
  );
}

export default WOByCompletedBy;
