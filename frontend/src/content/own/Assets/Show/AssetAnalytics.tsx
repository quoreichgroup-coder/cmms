import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from '../../../../store';
import { useContext, useEffect, useState } from 'react';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import { getAssetDetailsOverview } from '../../../../slices/analytics/asset';
import Loading from '../../Analytics/Loading';
import DateRangePicker from '../../components/form/DateRangePicker';
import ContentState from '../../components/ContentState';

interface PropsType {
  id: number;
}

const AssetDowntimes = ({ id }: PropsType) => {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { getFormattedCurrency } = useContext(CompanySettingsContext);
  const { assetDetailsOverview, loading, errors } = useSelector(
    (state) => state.assetAnalytics
  );
  const [end, setEnd] = useState(new Date());
  const nowMinusMonth = new Date();
  nowMinusMonth.setMonth(nowMinusMonth.getMonth() - 1);
  const [start, setStart] = useState(nowMinusMonth);
  const queryKey = `${id}:${start?.getTime() ?? ''}:${end?.getTime() ?? ''}`;
  const [loadedQueryKey, setLoadedQueryKey] = useState<string>();

  useEffect(() => {
    if (!id || !start || !end) return undefined;

    let isCurrentRequest = true;
    setLoadedQueryKey(undefined);
    Promise.resolve(dispatch(getAssetDetailsOverview(id, start, end))).finally(
      () => {
        if (isCurrentRequest) setLoadedQueryKey(queryKey);
      }
    );

    return () => {
      isCurrentRequest = false;
    };
  }, [dispatch, end, id, queryKey, start]);
  const datas: {
    label: string;
    value: string;
  }[] = [
    {
      label: t('MTBF'),
      value: assetDetailsOverview.mtbf.toString()
    },
    {
      label: t('MTTR'),
      value: assetDetailsOverview.mttr.toString()
    },
    {
      label: t('downtime_hours'),
      value: (assetDetailsOverview.downtime / 3600).toFixed(2)
    },
    {
      label: t('uptime_hours'),
      value: (assetDetailsOverview.uptime / 3600).toFixed(2)
    },
    {
      label: t('total_cost'),
      value: getFormattedCurrency(assetDetailsOverview.totalCost.toString())
    }
  ];
  return (
    <Box sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ py: 1, mb: 2 }}
        >
          <Typography variant="h5">{t('analytics_and_reporting')}</Typography>
          <DateRangePicker
            value={[start, end]}
            onChange={(newValue) => {
              const [internalStart, internalEnd] = newValue;
              setStart(internalStart);
              setEnd(internalEnd);
            }}
          />
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Card variant="outlined">
          <CardContent>
            {loading.assetDetailsOverview || loadedQueryKey !== queryKey ? (
              <Loading />
            ) : errors.assetDetailsOverview ? (
              <ContentState
                variant="error"
                message={errors.assetDetailsOverview}
                actionLabel={t('retry')}
                onAction={() =>
                  dispatch(getAssetDetailsOverview(id, start, end))
                }
              />
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: { xs: 2, sm: 3 },
                  py: 1
                }}
              >
                {datas.map((data) => (
                  <Stack key={data.label} alignItems="center" spacing={0.5}>
                    <Typography
                      variant="h4"
                      component="p"
                      fontWeight="bold"
                      textAlign="center"
                    >
                      {data.value}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                    >
                      {data.label}
                    </Typography>
                  </Stack>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Card>
    </Box>
  );
};

export default AssetDowntimes;
