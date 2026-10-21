import { Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import AnalyticsCard from '../../AnalyticsCard';
import { Filter } from '../WOModal';
import { useDispatch, useSelector } from '../../../../../store';
import { useEffect } from 'react';
import Loading from '../../Loading';
import { getRequestOverview } from '../../../../../slices/analytics/request';

interface WOStatusNumbersProps {
  handleOpenModal: (
    columns: string[],
    filters: Filter[],
    title: string
  ) => void;
  start: Date;
  end: Date;
  companyId?: number;
}

function Overview({
  handleOpenModal,
  start,
  end,
  companyId
}: WOStatusNumbersProps) {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { overview, loading, errors } = useSelector(
    (state) => state.requestAnalytics
  );
  useEffect(() => {
    dispatch(getRequestOverview(start, end, companyId));
  }, [start, end, companyId]);

  const totalCount = overview.approved + overview.pending + overview.cancelled;
  const getPercentage = (value: number) =>
    totalCount ? `${((value * 100) / totalCount).toFixed(0)}%` : '0%';

  const formattedData: {
    label: string;
    value: number | string;
    config?: {
      columns: string[];
      filters: Filter[];
    };
  }[] = [
    {
      label: t('approved_requests') + ` (${getPercentage(overview.approved)})`,
      value: overview.approved,
      config: {
        columns: ['id'],
        filters: [{ key: 'status', value: 'APPROVED' }]
      }
    },
    {
      label: t('pending_requests') + ` (${getPercentage(overview.pending)})`,
      value: overview.pending,
      config: {
        columns: ['id'],
        filters: [{ key: 'status', value: 'PENDING' }]
      }
    },
    {
      label:
        t('cancelled_requests') + ` (${getPercentage(overview.cancelled)})`,
      value: overview.cancelled,
      config: {
        columns: ['id'],
        filters: [{ key: 'status', value: 'CANCELLED' }]
      }
    },
    {
      label: t('average_cycle_time'),
      value: overview.cycleTime
    },
    {
      label: t('total'),
      value: totalCount
    }
  ];
  return (
    <AnalyticsCard title={t('the_numbers')} height={200}>
      <Stack sx={{ height: '100%', justifyContent: 'center' }}>
        {loading.overview || errors.overview ? (
          <Loading
            error={errors.overview}
            onRetry={() => dispatch(getRequestOverview(start, end, companyId))}
          />
        ) : (
          <Stack direction="row" spacing={2}>
            {formattedData.map((data) => (
              <Stack key={data.label} alignItems="center">
                <Typography
                  variant="h2"
                  fontWeight="bold"
                  style={{ cursor: data.config ? 'pointer' : 'auto' }}
                  role={data.config ? 'button' : undefined}
                  tabIndex={data.config ? 0 : undefined}
                  onClick={() =>
                    data.config &&
                    handleOpenModal(
                      data.config.columns,
                      data.config.filters,
                      t('the_numbers')
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      data.config &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      handleOpenModal(
                        data.config.columns,
                        data.config.filters,
                        t('the_numbers')
                      );
                    }
                  }}
                >
                  {data.value}
                </Typography>
                <Typography>{data.label}</Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </AnalyticsCard>
  );
}

export default Overview;
