import { useEffect, useMemo, useRef } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { useFormikContext } from 'formik';
import { useDispatch, useSelector } from '../../../store';
import { getReadings } from '../../../slices/reading';
import {
  getAutoMeterReferenceValue,
  getLatestMeterReadingValue
} from '../../../utils/pmMeterReference';
import { estimateMeterTargetDate } from '../../../utils/pmMeterForecast';

const MeterCycleForecast = ({
  values,
  t
}: {
  values: any;
  t: (key: string, options?: any) => string;
}) => {
  const dispatch = useDispatch();
  const meterId = values.meter?.value ?? values.meterId;
  const meterReadings = useSelector((state) =>
    meterId ? state.readings.readingsByMeter[meterId] : undefined
  );
  const readings = meterReadings ?? [];
  const { setFieldValue } = useFormikContext<any>();
  const previousAutoReference = useRef<{
    meterId: number;
    value: number;
  } | null>(null);

  useEffect(() => {
    if (meterId) dispatch(getReadings(Number(meterId)));
  }, [meterId, dispatch]);

  const latestValue = useMemo(() => {
    return getLatestMeterReadingValue(readings);
  }, [readings]);

  useEffect(() => {
    if (!meterId || meterReadings === undefined) return;
    const previousAutoValue = previousAutoReference.current?.value ?? null;
    const nextValue = getAutoMeterReferenceValue(
      values.meterReferenceValue,
      previousAutoValue,
      latestValue
    );
    if (nextValue === null) {
      previousAutoReference.current = null;
      return;
    }
    if (values.meterReferenceValue !== nextValue) {
      setFieldValue('meterReferenceValue', nextValue, false);
    }
    try {
      const plan = JSON.parse(
        values.planConfigurationJson || '{"mode":"SINGLE"}'
      );
      const firstCycle =
        plan.mode === 'MULTI_COUNTER' ? plan.cycles?.[0] : null;
      if (
        firstCycle &&
        Number(firstCycle.meterId) === Number(meterId) &&
        Number(firstCycle.referenceValue) ===
          Number(values.meterReferenceValue ?? 0) &&
        Number(firstCycle.referenceValue) !== nextValue
      ) {
        firstCycle.referenceValue = nextValue;
        setFieldValue(
          'planConfigurationJson',
          JSON.stringify(plan, null, 2),
          false
        );
      }
    } catch {
      /* The guided editor and form validation handle malformed input. */
    }
    previousAutoReference.current = {
      meterId: Number(meterId),
      value: nextValue
    };
  }, [
    meterId,
    meterReadings,
    latestValue,
    values.meterReferenceValue,
    setFieldValue
  ]);
  const interval = Number(values.meterCycleInterval);
  const reference = Number(values.meterReferenceValue);
  const end =
    values.meterEndValue === '' || values.meterEndValue == null
      ? undefined
      : Number(values.meterEndValue);
  const firstTarget = reference + interval;
  const targets =
    Number.isFinite(interval) &&
    interval > 0 &&
    Number.isFinite(reference) &&
    reference >= 0
      ? Array.from(
          { length: 8 },
          (_, index) => firstTarget + interval * index
        ).filter(
          (target) =>
            Number.isFinite(target) && (end === undefined || target <= end)
        )
      : [];
  const meter = values.meter?.label ?? t('pm_meter');
  let plan: any = { mode: 'SINGLE' };
  try {
    plan = JSON.parse(values.planConfigurationJson || '{"mode":"SINGLE"}');
  } catch {
    /* Form validation reports invalid JSON. */
  }
  const configuredCycles = Array.isArray(plan.cycles)
    ? plan.cycles.filter(
        (cycle: any) =>
          cycle.dimension === 'METER' &&
          Number(cycle.interval) > 0 &&
          Number(cycle.referenceValue) >= 0
      )
    : [];
  const multiCounterTargets = configuredCycles.flatMap((cycle: any) =>
    Array.from({ length: 4 }, (_, index) => ({
      code: cycle.code,
      name: cycle.name || cycle.code,
      meterId: cycle.meterId,
      value:
        Number(cycle.referenceValue) + Number(cycle.interval) * (index + 1),
      endValue: cycle.endValue == null ? undefined : Number(cycle.endValue)
    })).filter(
      (target) => target.endValue == null || target.value <= target.endValue
    )
  );
  const strategyTargets = targets
    .map((target, index) => ({
      target,
      estimatedDate: estimateMeterTargetDate(readings, target),
      packages: (plan.packages ?? []).filter(
        (item: any) =>
          Number(item.everyBaseCycles) > 0 &&
          (index + 1) % Number(item.everyBaseCycles) === 0
      )
    }))
    .filter((item) => plan.mode !== 'STRATEGY' || item.packages.length > 0);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
      <Typography variant="subtitle1" fontWeight="bold">
        {t('pm_schedule_forecast')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t('pm_meter_forecast_description')}
      </Typography>
      <Typography variant="body2">
        {t('pm_meter_current_reading')}:{' '}
        {latestValue ?? t('pm_meter_no_reading')} {values.meter?.unit ?? ''}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('pm_meter_reference_auto_hint')}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>
        {t('pm_meter_next_targets')} — {meter}
      </Typography>
      {plan.mode === 'MULTI_COUNTER' ? (
        <>
          <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
            {t('pm_multi_counter_forecast_note', {
              combination: plan.combination ?? 'OR'
            })}
          </Typography>
          {multiCounterTargets.map((item, index) => (
            <Typography variant="body2" key={`${item.code}-${index}`}>
              {item.name} · {t('pm_meter')} #{item.meterId}: {item.value}
            </Typography>
          ))}
        </>
      ) : strategyTargets.length ? (
        <Box component="ol" sx={{ m: 0, pl: 3 }}>
          {strategyTargets.map(({ target, packages, estimatedDate }, index) => (
            <li key={`${target}-${index}`}>
              <Typography variant="body2">
                {target} {values.meter?.unit ?? ''}
                {plan.mode === 'STRATEGY'
                  ? ` · ${packages
                      .map((item: any) => item.name || item.code)
                      .join(', ')}`
                  : ''}
                {estimatedDate && (
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                  >
                    {' '}
                    —{' '}
                    {t('pm_meter_estimated_date_from_usage', {
                      date: new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'medium',
                        timeZone: 'UTC'
                      }).format(estimatedDate)
                    })}
                  </Typography>
                )}
              </Typography>
            </li>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('pm_meter_complete_cycle_settings')}
        </Typography>
      )}
    </Paper>
  );
};

export default MeterCycleForecast;
