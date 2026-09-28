import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography
} from '@mui/material';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CompanySettingsContext } from '../../../../contexts/CompanySettingsContext';
import AssetDowntime from '../../../../models/owns/assetDowntime';
import api from '../../../../utils/api';
import { getHMSString } from '../../../../utils/formatters';

export default function AssetDowntimeSummary({ assetId }: { assetId: number }) {
  const { t } = useTranslation();
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const [downtimes, setDowntimes] = useState<AssetDowntime[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setDowntimes([]);
    api
      .get<AssetDowntime[]>(`asset-downtimes/asset/${assetId}`, {
        signal: controller.signal
      })
      .then((items) => {
        if (!controller.signal.aborted) setDowntimes(items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [assetId, attempt]);

  const { active, sorted, totalSeconds } = useMemo(() => {
    const ordered = [...downtimes].sort(
      (a, b) => new Date(b.startsOn).getTime() - new Date(a.startsOn).getTime()
    );
    const current = ordered.find(
      (item) =>
        new Date(item.startsOn).getTime() <= now &&
        new Date(item.startsOn).getTime() + item.duration * 1000 > now
    );
    return {
      active: current,
      sorted: ordered,
      totalSeconds: ordered.reduce(
        (sum, item) =>
          sum +
          Math.max(
            0,
            Math.min(
              item.duration,
              (now - new Date(item.startsOn).getTime()) / 1000
            )
          ),
        0
      )
    };
  }, [downtimes, now]);

  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1 }}
      >
        <Typography variant="h5">{t('asset_downtime_history')}</Typography>
        <Button component={Link} to={`/app/assets/${assetId}/downtimes`}>
          {t('view_all')}
        </Button>
      </Stack>
      {loading ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <CircularProgress
            size={28}
            aria-label={t('asset_downtime_history')}
          />
        </Box>
      ) : failed ? (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              onClick={() => setAttempt((value) => value + 1)}
            >
              {t('asset_retry')}
            </Button>
          }
        >
          {t('an_error_occured')}
        </Alert>
      ) : (
        <>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                {t('asset_current_downtime')}
              </Typography>
              <Chip
                size="small"
                color={active ? 'error' : 'success'}
                label={t(
                  active ? 'asset_downtime_active' : 'asset_no_active_downtime'
                )}
              />
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                {t('total_downtime_in_hours')}
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {(totalSeconds / 3600).toFixed(1)} h
              </Typography>
            </Box>
          </Stack>
          {sorted.length ? (
            <Stack divider={<Divider />}>
              {sorted.slice(0, 4).map((item) => {
                const ongoing = item === active;
                const elapsedSeconds = ongoing
                  ? Math.max(
                      0,
                      (Date.now() - new Date(item.startsOn).getTime()) / 1000
                    )
                  : item.duration;
                return (
                  <Box key={item.id} sx={{ py: 1.25 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1}
                    >
                      <Typography variant="body2">
                        {getFormattedDate(item.startsOn)}
                      </Typography>
                      {ongoing && (
                        <Chip
                          size="small"
                          color="error"
                          label={t('asset_downtime_active')}
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {getHMSString(elapsedSeconds)}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              {t('asset_no_downtime')}
            </Typography>
          )}
        </>
      )}
    </Card>
  );
}
