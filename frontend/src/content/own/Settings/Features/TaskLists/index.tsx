import { useContext, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useTranslation } from 'react-i18next';
import { TitleContext } from '../../../../../contexts/TitleContext';
import { CustomSnackBarContext } from '../../../../../contexts/CustomSnackBarContext';
import SettingsSection from '../../components/SettingsSection';
import api, { getErrorMessage } from '../../../../../utils/api';

type TaskListConfiguration = {
  operationNumberStart: number;
  operationNumberIncrement: number;
  defaultWorkers: number;
  defaultWorkUnit: string;
  defaultDurationUnit: string;
  workCenterCatalog: string;
  controlKeyCatalog: string;
};

const initialConfiguration: TaskListConfiguration = {
  operationNumberStart: 10,
  operationNumberIncrement: 10,
  defaultWorkers: 1,
  defaultWorkUnit: 'H',
  defaultDurationUnit: 'H',
  workCenterCatalog: '',
  controlKeyCatalog: ''
};

function TaskListSettings() {
  const { t } = useTranslation();
  const { setTitle } = useContext(TitleContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [values, setValues] = useState(initialConfiguration);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('task_list_settings_load_error');
  const [retry, setRetry] = useState(0);
  const valid = Number.isInteger(values.operationNumberStart)
    && values.operationNumberStart >= 1 && values.operationNumberStart <= 999999
    && Number.isInteger(values.operationNumberIncrement)
    && values.operationNumberIncrement >= 1 && values.operationNumberIncrement <= 999999
    && Number.isFinite(values.defaultWorkers)
    && values.defaultWorkers >= 0.01 && values.defaultWorkers <= 999999;

  useEffect(() => setTitle(t('task_list_settings_title')), [setTitle, t]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    setLoadErrorMessage('task_list_settings_load_error');
    api.get<TaskListConfiguration>('maintenance-task-lists/configuration')
      .then((result) => { if (active) setValues({ ...initialConfiguration, ...result }); })
      .catch((error) => {
        if (active) {
          setLoadError(true);
          setLoadErrorMessage(getErrorMessage(error, 'task_list_settings_load_error'));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const update = (field: keyof TaskListConfiguration, value: number | string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api.put<TaskListConfiguration>(
        'maintenance-task-lists/configuration', values
      );
      setValues({ ...initialConfiguration, ...saved });
      showSnackBar(t('task_list_settings_saved'), 'success');
    } catch (error) {
      showSnackBar(t(getErrorMessage(error, 'task_list_settings_save_error')), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box p={4} display="flex" justifyContent="center"><CircularProgress size={28} /></Box>;
  }

  return (
    <Box p={{ xs: 2, sm: 4 }}>
      {loadError ? (
        <Alert severity="error" action={<Button color="inherit" onClick={() => setRetry((value) => value + 1)}>{t('retry')}</Button>}>
          {t(loadErrorMessage)}
        </Alert>
      ) : (
        <Stack spacing={2}>
          <SettingsSection title={t('task_list_operation_defaults')}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('task_list_operation_defaults_help')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number"
label={t('task_list_default_workers')} value={values.defaultWorkers}
                  inputProps={{ min: 0.01, max: 999999, step: 0.25 }}
                  onChange={(event) => update('defaultWorkers', event.target.value === '' ? 1 : Number(event.target.value))} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth select
label={t('task_list_default_work_unit')} value={values.defaultWorkUnit}
                  onChange={(event) => update('defaultWorkUnit', event.target.value)}>
                  <MenuItem value="H">{t('hours_abbreviation')}</MenuItem>
                  <MenuItem value="MIN">{t('minutes_abbreviation')}</MenuItem>
                  <MenuItem value="S">{t('seconds_abbreviation')}</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth select
label={t('task_list_default_duration_unit')} value={values.defaultDurationUnit}
                  onChange={(event) => update('defaultDurationUnit', event.target.value)}>
                  <MenuItem value="H">{t('hours_abbreviation')}</MenuItem>
                  <MenuItem value="MIN">{t('minutes_abbreviation')}</MenuItem>
                  <MenuItem value="S">{t('seconds_abbreviation')}</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </SettingsSection>

          <SettingsSection title={t('task_list_reference_catalogs')}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('task_list_reference_catalogs_help')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth multiline minRows={5} maxRows={12}
                  label={t('task_list_work_center_catalog')} value={values.workCenterCatalog}
                  helperText={t('task_list_catalog_one_per_line')}
                  onChange={(event) => update('workCenterCatalog', event.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth multiline minRows={5} maxRows={12}
                  label={t('task_list_control_key_catalog')} value={values.controlKeyCatalog}
                  helperText={t('task_list_catalog_one_per_line')}
                  onChange={(event) => update('controlKeyCatalog', event.target.value)} />
              </Grid>
            </Grid>
          </SettingsSection>

          <SettingsSection title={t('task_list_operation_numbering')}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('task_list_operation_numbering_help')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="number"
label={t('task_list_operation_number_start')} value={values.operationNumberStart}
                  inputProps={{ min: 1, max: 999999, step: 1 }}
                  onChange={(event) => update('operationNumberStart', event.target.value === '' ? 1 : Number(event.target.value))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="number"
label={t('task_list_operation_number_increment')} value={values.operationNumberIncrement}
                  inputProps={{ min: 1, max: 999999, step: 1 }}
                  onChange={(event) => update('operationNumberIncrement', event.target.value === '' ? 1 : Number(event.target.value))} />
              </Grid>
            </Grid>
          </SettingsSection>
          {!valid && <Alert severity="error">{t('task_list_settings_invalid')}</Alert>}
          <Box display="flex" justifyContent={{ xs: 'stretch', sm: 'flex-end' }}>
            <Button fullWidth sx={{ width: { xs: '100%', sm: 'auto' } }}
variant="contained" startIcon={<SaveOutlinedIcon />}
              disabled={saving || !valid}
              onClick={() => void save()}>
              {saving ? t('saving') : t('save')}
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  );
}

export default TaskListSettings;
