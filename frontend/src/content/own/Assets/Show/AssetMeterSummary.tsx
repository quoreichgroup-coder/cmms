import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  Stack,
  Typography
} from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import Meter from '../../../../models/owns/meter';
import Reading from '../../../../models/owns/reading';
import { PlanFeature } from '../../../../models/owns/subscriptionPlan';
import api from '../../../../utils/api';
import { getMeterUrl } from '../../../../utils/urlPaths';
import { isCloudVersion } from '../../../../config';
import useAuth from '../../../../hooks/useAuth';

const LatestReading = ({ meter }: { meter: Meter }) => {
  const { t } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const [reading, setReading] = useState<Reading>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    setReading(undefined);
    api
      .get<Reading[]>(`readings/meter/${meter.id}`)
      .then((readings) => {
        if (active)
          setReading(
            readings.reduce<Reading | undefined>(
              (latest, item) =>
                !latest ||
                new Date(item.createdAt).getTime() >
                  new Date(latest.createdAt).getTime()
                  ? item
                  : latest,
              undefined
            )
          );
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [meter.id]);

  return (
    <Box sx={{ py: 1.5 }}>
      <Button
        component={Link}
        to={getMeterUrl(meter.id)}
        sx={{ px: 0, textTransform: 'none', overflowWrap: 'anywhere' }}
      >
        {meter.name}
      </Button>
      {loading ? (
        <CircularProgress size={18} aria-label={t('last_reading')} />
      ) : failed ? (
        <Typography color="error">{t('an_error_occured')}</Typography>
      ) : (
        <Typography variant="body2">
          {t('last_reading')}:{' '}
          {reading
            ? `${reading.value} ${meter.unit} · ${getFormattedDate(
                reading.createdAt
              )}`
            : t('asset_no_readings')}
        </Typography>
      )}
      {meter.nextReading && (
        <Typography
          variant="body2"
          color={
            new Date(meter.nextReading).getTime() < Date.now()
              ? 'error'
              : 'text.secondary'
          }
        >
          {t('next_reading_due')}: {getFormattedDate(meter.nextReading)}
        </Typography>
      )}
    </Box>
  );
};

export default function AssetMeterSummary({ assetId }: { assetId: number }) {
  const { t, i18n } = useTranslation();
  const { hasFeature, user } = useAuth();
  const available = hasFeature(PlanFeature.METER);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!available) {
      setLoading(false);
      setMeters([]);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setFailed(false);
    setMeters([]);
    api
      .get<Meter[]>(`meters/asset/${assetId}`)
      .then((items) => {
        if (active) setMeters(items);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [assetId, attempt, available]);

  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
      >
        <Typography variant="h5">{t('meters')}</Typography>
        <Button component={Link} to={`/app/assets/${assetId}/meters`}>
          {t('view_all')}
        </Button>
      </Stack>
      {!available ? (
        <Alert
          severity="info"
          action={
            user.ownsCompany ? (
              <Button
                component={Link}
                to={isCloudVersion ? '/app/subscription/plans' : '/app/account/company-profile'}
                color="inherit"
              >
                {t('upgrade_now')}
              </Button>
            ) : undefined
          }
        >
          {t('upgrade_create_meter')}
        </Alert>
      ) : loading ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : failed ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => setAttempt(attempt + 1)}>
              {t('asset_retry')}
            </Button>
          }
        >
          {t('an_error_occured')}
        </Alert>
      ) : meters.length ? (
        <Stack divider={<Divider />}>
          {meters.slice(0, 4).map((meter) => (
            <LatestReading key={meter.id} meter={meter} />
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary" sx={{ py: 3 }}>
          {t('asset_no_meters')}
        </Typography>
      )}
    </Card>
  );
}
