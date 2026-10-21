import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useTranslation } from 'react-i18next';
import api, { getErrorMessage } from '../../../utils/api';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';

interface Site {
  id?: number;
  name: string;
  code: string;
  rootLocationId: number | null;
  timeZone: string;
  documentLanguage: string | null;
}
interface LocationOption {
  id: number;
  name: string;
  parentId?: number | null;
}
const emptySite: Site = {
  name: '',
  code: '',
  rootLocationId: null,
  timeZone: '',
  documentLanguage: null
};

export default function CompanySites() {
  const { t }: { t: any } = useTranslation();
  const { user } = useAuth();
  const canEdit =
    user.ownsCompany ||
    (user.role?.viewPermissions?.includes(PermissionEntity.SETTINGS) &&
      user.role?.editOtherPermissions?.includes(PermissionEntity.SETTINGS));
  const [sites, setSites] = useState<Site[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [editing, setEditing] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [loadedSites, loadedLocations] = await Promise.all([
        api.get<Site[]>('sites'),
        api.get<LocationOption[]>('locations/mini')
      ]);
      setSites(loadedSites);
      setLocations(loadedLocations);
    } catch (e) {
      setLoadError(getErrorMessage(e, t('sites_load_error')));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const body = { ...editing, code: editing.code.trim().toUpperCase() };
      const updated = editing.id
        ? await api.patch<Site>(`sites/${editing.id}`, body)
        : await api.post<Site>('sites', body);
      setSites((current) =>
        editing.id
          ? current.map((site) => (site.id === updated.id ? updated : site))
          : [...current, updated].sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditing(null);
    } catch (e) {
      setError(getErrorMessage(e, t('sites_save_error')));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (site: Site) => {
    if (
      !site.id ||
      !window.confirm(t('site_delete_confirm', { name: site.name }))
    )
      return;
    try {
      await api.deletes(`sites/${site.id}`);
      setSites((current) => current.filter((value) => value.id !== site.id));
    } catch (e) {
      setError(getErrorMessage(e, t('sites_delete_error')));
    }
  };

  const roots = locations.filter((location) => !location.parentId);
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 3,
          pb: 1
        }}
      >
        <Box>
          <Typography variant="h4">{t('company_sites')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('company_sites_description')}
          </Typography>
        </Box>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddLocationAltOutlinedIcon />}
            onClick={() => setEditing({ ...emptySite })}
          >
            {t('add_site')}
          </Button>
        )}
      </Box>
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loadError && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => void load()}>
                {t('retry')}
              </Button>
            }
          >
            {loadError}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : loadError && sites.length === 0 ? null : sites.length === 0 ? (
          <Typography color="text.secondary">
            {t('company_sites_empty')}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {sites.map((site) => (
              <Box
                key={site.id}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box>
                  <Typography fontWeight={600}>
                    {site.name}{' '}
                    <Typography component="span" color="text.secondary">
                      · {site.code}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {roots.find(
                      (location) => location.id === site.rootLocationId
                    )?.name || t('no_root_location')}
                    {site.timeZone ? ` · ${site.timeZone}` : ''}
                  </Typography>
                </Box>
                {canEdit && (
                  <Box>
                    <IconButton
                      aria-label={t('edit')}
                      onClick={() => setEditing({ ...site })}
                    >
                      <EditOutlinedIcon />
                    </IconButton>
                    <IconButton
                      aria-label={t('delete')}
                      onClick={() => remove(site)}
                    >
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
      <Dialog
        open={Boolean(editing)}
        onClose={() => !saving && setEditing(null)}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={save}>
          <DialogTitle>
            {editing?.id ? t('edit_site') : t('add_site')}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label={t('site_name')}
                  value={editing?.name ?? ''}
                  inputProps={{ maxLength: 120 }}
                  onChange={(e) =>
                    setEditing({ ...editing!, name: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label={t('site_code')}
                  value={editing?.code ?? ''}
                  inputProps={{ maxLength: 40 }}
                  onChange={(e) =>
                    setEditing({
                      ...editing!,
                      code: e.target.value.toUpperCase()
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('site_time_zone')}
                  placeholder="Africa/Ouagadougou"
                  value={editing?.timeZone ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing!, timeZone: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('site_root_location')}</InputLabel>
                  <Select
                    label={t('site_root_location')}
                    value={editing?.rootLocationId ?? ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing!,
                        rootLocationId: e.target.value
                          ? Number(e.target.value)
                          : null
                      })
                    }
                  >
                    <MenuItem value="">
                      <em>{t('no_root_location')}</em>
                    </MenuItem>
                    {roots.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('document_language')}</InputLabel>
                  <Select
                    label={t('document_language')}
                    value={editing?.documentLanguage ?? ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing!,
                        documentLanguage: e.target.value || null
                      })
                    }
                  >
                    <MenuItem value="">
                      <em>{t('inherit_company_preference')}</em>
                    </MenuItem>
                    <MenuItem value="EN">English</MenuItem>
                    <MenuItem value="FR">Français</MenuItem>
                    <MenuItem value="TR">Türkçe</MenuItem>
                    <MenuItem value="ES">Español</MenuItem>
                    <MenuItem value="PT_BR">Português (Brasil)</MenuItem>
                    <MenuItem value="PT">Português</MenuItem>
                    <MenuItem value="PL">Polski</MenuItem>
                    <MenuItem value="DE">Deutsch</MenuItem>
                    <MenuItem value="AR">العربية</MenuItem>
                    <MenuItem value="IT">Italiano</MenuItem>
                    <MenuItem value="SV">Svenska</MenuItem>
                    <MenuItem value="RU">Русский</MenuItem>
                    <MenuItem value="HU">Magyar</MenuItem>
                    <MenuItem value="NL">Nederlands</MenuItem>
                    <MenuItem value="ZH_CN">简体中文</MenuItem>
                    <MenuItem value="ZH">中文</MenuItem>
                    <MenuItem value="BA">Bosanski</MenuItem>
                    <MenuItem value="JA">日本語</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setEditing(null)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                saving || !editing?.name.trim() || !editing?.code.trim()
              }
            >
              {saving ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                t('save')
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Card>
  );
}
