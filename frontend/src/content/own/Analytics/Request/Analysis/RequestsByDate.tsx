import { useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import AnalyticsCard from '../../AnalyticsCard';
import { useDispatch, useSelector } from '../../../../../store';
import { useEffect } from 'react';
import Loading from '../../Loading';
import { getRequestsByDate } from '../../../../../slices/analytics/request';
import { getDayAndMonth } from '../../../../../utils/dates';

interface OwnProps {
  start: Date;
  end: Date;
  companyId?: number;
}

function RequestsByDate({ start, end, companyId }: OwnProps) {
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { requestsByDate, loading, errors } = useSelector(
    (state) => state.requestAnalytics
  );

  useEffect(() => {
    dispatch(getRequestsByDate(start, end, companyId));
  }, [start, end, companyId]);

  const formattedData: {
    label: string;
    cycleTime: string;
    date: string;
  }[] = requestsByDate.map((data) => {
    return {
      cycleTime: data.cycleTime.toFixed(2),
      label: getDayAndMonth(data.date),
      date: data.date
    };
  });
  const lines: { label: string; dataKey: string; color: string }[] = [
    {
      label: t('average_cycle_time_in_days'),
      dataKey: 'cycleTime',
      color: theme.colors.info.main
    }
  ];
  const title = t('requests_trends');
  return (
    <AnalyticsCard title={title}>
      {loading.requestsByDate || errors.requestsByDate ? (
        <Loading
          error={errors.requestsByDate}
          onRetry={() => dispatch(getRequestsByDate(start, end, companyId))}
        />
      ) : (
        <LineChart width={900} height={508} data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              name={line.label}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              dot={{
                r: 4,
                fill: line.color,
                stroke: theme.palette.background.paper,
                strokeWidth: 2
              }}
            />
          ))}
        </LineChart>
      )}
    </AnalyticsCard>
  );
}

export default RequestsByDate;
