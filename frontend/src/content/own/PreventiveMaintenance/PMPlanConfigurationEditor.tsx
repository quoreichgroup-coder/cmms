import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useEffect, useMemo } from 'react';
import { getMetersMini } from '../../../slices/meter';
import { useDispatch, useSelector } from '../../../store';
import { validatePMPlanConfiguration } from '../../../utils/pmPlanConfiguration';

type PlanConfig = {
  mode: 'SINGLE' | 'STRATEGY' | 'MULTI_COUNTER';
  combination?: 'OR' | 'AND';
  packages?: Array<{
    code: string;
    name: string;
    everyBaseCycles: number;
    taskBaseIds: number[];
  }>;
  cycles?: Array<{
    code: string;
    name: string;
    dimension: 'METER';
    interval: number;
    meterId?: number;
    referenceValue: number;
    endValue?: number;
    taskBaseIds: number[];
  }>;
};

type Props = {
  values: any;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  t: (key: string, options?: any) => string;
  meterTriggerOption: { label: string; value: string };
};

const makeCode = (name: string, fallback: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || fallback;

const readConfiguration = (raw?: string): PlanConfig => {
  try {
    const value = JSON.parse(raw || '{"mode":"SINGLE"}');
    return {
      mode: ['SINGLE', 'STRATEGY', 'MULTI_COUNTER'].includes(value.mode) ? value.mode : 'SINGLE',
      combination: value.combination === 'AND' ? 'AND' : 'OR',
      packages: Array.isArray(value.packages) ? value.packages.map((item: any) => ({
        code: item.code ?? '',
        name: item.name ?? '',
        everyBaseCycles: Number(item.everyBaseCycles ?? 1),
        taskBaseIds: Array.isArray(item.taskBaseIds) ? item.taskBaseIds.map(Number) : []
      })) : [],
      cycles: Array.isArray(value.cycles) ? value.cycles.map((cycle: any) => ({
        code: cycle.code ?? '',
        name: cycle.name ?? '',
        dimension: 'METER' as const,
        interval: Number(cycle.interval ?? 100),
        meterId: Number(cycle.meterId) || undefined,
        referenceValue: Number(cycle.referenceValue ?? 0),
        endValue: cycle.endValue == null ? undefined : Number(cycle.endValue),
        taskBaseIds: Array.isArray(cycle.taskBaseIds) ? cycle.taskBaseIds.map(Number) : []
      })) : []
    };
  } catch {
    return { mode: 'SINGLE', packages: [], cycles: [] };
  }
};

const PMPlanConfigurationEditor = ({ values, setFieldValue, t, meterTriggerOption }: Props) => {
  const dispatch = useDispatch();
  const meters = useSelector((state) => state.meters.metersMini);
  const assetId = Number(values.asset?.value ?? values.asset?.id);
  const selectedTasks = useMemo(() => (values.tasks ?? [])
    .map((task: any) => ({
      id: Number(task.taskBase?.id ?? task.taskBaseId),
      label: task.taskBase?.label ?? task.label ?? t('task_without_name')
    }))
    .filter((task: { id: number; label: string }) => Number.isFinite(task.id) && task.id > 0),
  [values.tasks, t]);
  const availableMeters = useMemo(() => meters.filter((meter) =>
    assetId > 0 && Number(meter.assetId) === assetId
  ), [assetId, meters]);
  const configuration = useMemo(() => readConfiguration(values.planConfigurationJson),
    [values.planConfigurationJson]);
  const configurationError = validatePMPlanConfiguration(configuration);

  useEffect(() => {
    if (configuration.mode === 'MULTI_COUNTER' && !meters.length) dispatch(getMetersMini());
  }, [configuration.mode, dispatch, meters.length]);

  const commit = (next: PlanConfig) => {
    setFieldValue('planConfigurationJson', JSON.stringify(next, null, 2), false);
    if (next.mode === 'MULTI_COUNTER') {
      const firstCycle = next.cycles?.[0];
      const meter = availableMeters.find((item) => item.id === firstCycle?.meterId);
      setFieldValue('triggerType', meterTriggerOption, false);
      if (firstCycle && meter) {
        setFieldValue('meter', {
          label: `${meter.name}${meter.unit ? ` (${meter.unit})` : ''}`,
          value: meter.id,
          unit: meter.unit,
          assetId: meter.assetId
        }, false);
        setFieldValue('meterCycleInterval', firstCycle.interval, false);
        setFieldValue('meterReferenceValue', firstCycle.referenceValue, false);
        setFieldValue('meterEndValue', firstCycle.endValue ?? null, false);
      }
    }
  };

  const switchMode = (mode: PlanConfig['mode']) => {
    if (mode === 'SINGLE') return commit({ mode });
    if (mode === 'STRATEGY') {
      return commit({ mode, packages: [{ code: 'package-1', name: t('pm_package_default_name'), everyBaseCycles: 1, taskBaseIds: [] }] });
    }
    commit({
      mode,
      combination: 'OR',
      cycles: [1, 2].map((index) => ({
        code: `cycle-${index}`,
        name: t('pm_cycle_default_name', { number: index }),
        dimension: 'METER' as const,
        interval: 100,
        meterId: undefined,
        referenceValue: 0,
        taskBaseIds: []
      }))
    });
  };

  const updatePackage = (index: number, patch: Partial<NonNullable<PlanConfig['packages']>[number]>) => {
    const packages = [...(configuration.packages ?? [])];
    packages[index] = { ...packages[index], ...patch };
    commit({ ...configuration, packages });
  };
  const updateCycle = (index: number, patch: Partial<NonNullable<PlanConfig['cycles']>[number]>) => {
    const cycles = [...(configuration.cycles ?? [])];
    cycles[index] = { ...cycles[index], ...patch };
    commit({ ...configuration, cycles });
  };
  const toggleTask = (ids: number[], id: number, checked: boolean) =>
    checked ? [...new Set([...ids, id])] : ids.filter((taskId) => taskId !== id);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">{t('pm_plan_configuration')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('pm_plan_configuration_help')}</Typography>
        </Box>
        <FormControl fullWidth size="small">
          <FormHelperText sx={{ ml: 0, mt: 0 }}>{t('pm_plan_mode')}</FormHelperText>
          <Select value={configuration.mode} onChange={(event) => switchMode(event.target.value as PlanConfig['mode'])}>
            <MenuItem value="SINGLE">{t('pm_plan_mode_single')}</MenuItem>
            <MenuItem value="STRATEGY">{t('pm_plan_mode_strategy')}</MenuItem>
            <MenuItem value="MULTI_COUNTER">{t('pm_plan_mode_multi_counter')}</MenuItem>
          </Select>
        </FormControl>

        {configuration.mode === 'SINGLE' && <Typography variant="body2" color="text.secondary">{t('pm_plan_single_help')}</Typography>}
        {!!configurationError && <Alert severity="error">{t(configurationError)}</Alert>}

        {configuration.mode === 'STRATEGY' && (
          <Stack spacing={2}>
            <Alert severity="info">{t('pm_strategy_editor_help')}</Alert>
            {(configuration.packages ?? []).map((item, index) => (
              <Paper key={`${item.code}-${index}`} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2">{t('pm_strategy_package_number', { number: index + 1 })}</Typography>
                  <IconButton aria-label={t('remove')} onClick={() => commit({ ...configuration, packages: configuration.packages?.filter((_, itemIndex) => itemIndex !== index) })} disabled={(configuration.packages?.length ?? 0) <= 1}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={8}>
                    <TextField fullWidth size="small" label={t('name')} value={item.name} onChange={(event) => updatePackage(index, { name: event.target.value, code: makeCode(event.target.value, `package-${index + 1}`) })} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" type="number" inputProps={{ min: 1, step: 1 }} label={t('pm_every_base_cycles')} value={item.everyBaseCycles} onChange={(event) => updatePackage(index, { everyBaseCycles: Number(event.target.value) })} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>{t('pm_package_tasks')}</Typography>
                    {!selectedTasks.length && <FormHelperText error>{t('pm_select_tasks_before_packages')}</FormHelperText>}
                    <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" columnGap={2}>
                      {selectedTasks.map((task: { id: number; label: string }) => (
                        <FormControlLabel key={task.id} control={<Checkbox size="small" checked={item.taskBaseIds.includes(task.id)} onChange={(event) => updatePackage(index, { taskBaseIds: toggleTask(item.taskBaseIds, task.id, event.target.checked) })} />} label={`${task.label} (#${task.id})`} />
                      ))}
                    </Stack>
                    {!item.taskBaseIds.length && !!selectedTasks.length && <FormHelperText error>{t('pm_package_requires_task')}</FormHelperText>}
                  </Grid>
                </Grid>
              </Paper>
            ))}
            <Button startIcon={<AddIcon />} onClick={() => {
              const index = configuration.packages?.length ?? 0;
              commit({ ...configuration, packages: [...(configuration.packages ?? []), { code: `package-${index + 1}`, name: t('pm_package_default_name'), everyBaseCycles: 1, taskBaseIds: [] }] });
            }}>{t('pm_add_package')}</Button>
          </Stack>
        )}

        {configuration.mode === 'MULTI_COUNTER' && (
          <Stack spacing={2}>
            <Alert severity="info">{t('pm_multi_counter_editor_help')}</Alert>
            <FormControl fullWidth size="small">
              <FormHelperText sx={{ ml: 0, mt: 0 }}>{t('pm_combination_rule')}</FormHelperText>
              <Select value={configuration.combination ?? 'OR'} onChange={(event) => commit({ ...configuration, combination: event.target.value as 'OR' | 'AND' })}>
                <MenuItem value="OR">{t('pm_combination_or')}</MenuItem>
                <MenuItem value="AND">{t('pm_combination_and')}</MenuItem>
              </Select>
              <FormHelperText>{t(configuration.combination === 'AND' ? 'pm_combination_and_help' : 'pm_combination_or_help')}</FormHelperText>
            </FormControl>
            {(configuration.cycles ?? []).map((cycle, index) => (
              <Paper key={`${cycle.code}-${index}`} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2">{t('pm_counter_cycle_number', { number: index + 1 })}</Typography>
                  <IconButton aria-label={t('remove')} onClick={() => commit({ ...configuration, cycles: configuration.cycles?.filter((_, cycleIndex) => cycleIndex !== index) })} disabled={(configuration.cycles?.length ?? 0) <= 2}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
                <Grid container spacing={1.5}>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label={t('name')} value={cycle.name} onChange={(event) => updateCycle(index, { name: event.target.value, code: makeCode(event.target.value, `cycle-${index + 1}`) })} />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small" error={!cycle.meterId}>
                      <FormHelperText sx={{ ml: 0, mt: 0 }}>{t('pm_cycle_meter')}</FormHelperText>
                      <Select displayEmpty value={cycle.meterId ?? ''} onChange={(event) => {
                        const meterId = Number(event.target.value) || undefined;
                        updateCycle(index, { meterId });
                        if (index === 0) {
                          const meter = availableMeters.find((item) => item.id === meterId);
                          setFieldValue('triggerType', meterTriggerOption, false);
                          setFieldValue('meter', meter ? { label: `${meter.name}${meter.unit ? ` (${meter.unit})` : ''}`, value: meter.id, unit: meter.unit, assetId: meter.assetId } : null, false);
                        }
                      }}>
                        <MenuItem value="" disabled>{t(assetId ? 'pm_select_counter' : 'pm_select_asset_first')}</MenuItem>
                        {availableMeters.map((meter) => <MenuItem key={meter.id} value={meter.id}>{meter.name}{meter.unit ? ` (${meter.unit})` : ''}</MenuItem>)}
                      </Select>
                      {!assetId && <FormHelperText>{t('pm_select_asset_first')}</FormHelperText>}
                      {assetId > 0 && !availableMeters.length && <FormHelperText>{t('pm_asset_has_no_counters')}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" type="number" inputProps={{ min: 0, step: 'any' }} label={t('pm_meter_reference')} value={cycle.referenceValue} onChange={(event) => {
                      const referenceValue = event.target.value === '' ? 0 : Number(event.target.value);
                      updateCycle(index, { referenceValue });
                      if (index === 0) setFieldValue('meterReferenceValue', referenceValue, false);
                    }} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" type="number" inputProps={{ min: 0.000001, step: 'any' }} label={t('pm_cycle_interval')} value={cycle.interval} onChange={(event) => {
                      const interval = Number(event.target.value);
                      updateCycle(index, { interval });
                      if (index === 0) setFieldValue('meterCycleInterval', interval, false);
                    }} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" type="number" inputProps={{ min: 0, step: 'any' }} label={t('pm_meter_end_optional')} value={cycle.endValue ?? ''} onChange={(event) => {
                      const endValue = event.target.value === '' ? undefined : Number(event.target.value);
                      updateCycle(index, { endValue });
                      if (index === 0) setFieldValue('meterEndValue', endValue ?? null, false);
                    }} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>{t('pm_cycle_tasks')}</Typography>
                    {!selectedTasks.length && <FormHelperText error>{t('pm_select_tasks_before_cycles')}</FormHelperText>}
                    <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" columnGap={2}>
                      {selectedTasks.map((task: { id: number; label: string }) => (
                        <FormControlLabel key={task.id} control={<Checkbox size="small" checked={cycle.taskBaseIds.includes(task.id)} onChange={(event) => updateCycle(index, { taskBaseIds: toggleTask(cycle.taskBaseIds, task.id, event.target.checked) })} />} label={`${task.label} (#${task.id})`} />
                      ))}
                    </Stack>
                    {!cycle.taskBaseIds.length && !!selectedTasks.length && <FormHelperText error>{t('pm_cycle_requires_task')}</FormHelperText>}
                  </Grid>
                </Grid>
              </Paper>
            ))}
            <Button startIcon={<AddIcon />} onClick={() => {
              const index = configuration.cycles?.length ?? 0;
              commit({ ...configuration, cycles: [...(configuration.cycles ?? []), {
                code: `cycle-${index + 1}`, name: t('pm_cycle_default_name', { number: index + 1 }), dimension: 'METER',
                interval: 100, referenceValue: 0, taskBaseIds: []
              }] });
            }}>{t('pm_add_counter_cycle')}</Button>
            <Divider />
            <Typography variant="caption" color="text.secondary">{t('pm_multi_counter_date_limit')}</Typography>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default PMPlanConfigurationEditor;
