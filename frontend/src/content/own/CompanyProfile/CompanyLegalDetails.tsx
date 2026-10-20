import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import useAuth from '../../../hooks/useAuth';
import api, { getErrorMessage } from '../../../utils/api';
import { PermissionEntity } from '../../../models/owns/role';

interface CompanyLegalProfile {
  id?: number;
  legalName: string;
  registrationCountry: string;
  businessRegistrationNumber: string;
  taxIdentificationNumber: string;
  registeredAddress: string;
}

const emptyProfile: CompanyLegalProfile = {
  legalName: '',
  registrationCountry: '',
  businessRegistrationNumber: '',
  taxIdentificationNumber: '',
  registeredAddress: ''
};

export default function CompanyLegalDetails() {
  const { t }: { t: any } = useTranslation();
  const { company, user } = useAuth();
  const canEdit =
    user.ownsCompany ||
    (user.role?.viewPermissions?.includes(PermissionEntity.SETTINGS) &&
      user.role?.editOtherPermissions?.includes(PermissionEntity.SETTINGS));
  const [profile, setProfile] = useState<CompanyLegalProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<CompanyLegalProfile>(`companies/${company.id}/legal-profile`)
      .then((data) => active && setProfile({ ...emptyProfile, ...data }))
      .catch(
        (e) =>
          active && setError(getErrorMessage(e, t('company_legal_load_error')))
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [company.id, t]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const result = await api.patch<CompanyLegalProfile>(
        `companies/${company.id}/legal-profile`,
        profile
      );
      setProfile({ ...emptyProfile, ...result });
      setSaved(true);
    } catch (e) {
      setError(getErrorMessage(e, t('company_legal_save_error')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 3, pb: 2 }}
      >
        <GavelOutlinedIcon color="primary" />
        <Box>
          <Typography variant="h4">{t('company_legal_information')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('company_legal_information_description')}
          </Typography>
        </Box>
      </Box>
      <CardContent sx={{ pt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {saved && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('company_legal_saved')}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('legal_company_name')}
                  value={profile.legalName}
                  onChange={(e) =>
                    setProfile({ ...profile, legalName: e.target.value })
                  }
                  inputProps={{ maxLength: 160 }}
                  disabled={!canEdit || saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('registration_country')}
                  value={profile.registrationCountry}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      registrationCountry: e.target.value.toUpperCase()
                    })
                  }
                  inputProps={{ maxLength: 2, autoCapitalize: 'characters' }}
                  placeholder="BF"
                  helperText={t('registration_country_hint')}
                  disabled={!canEdit || saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('business_registration_number')}
                  value={profile.businessRegistrationNumber}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      businessRegistrationNumber: e.target.value
                    })
                  }
                  inputProps={{ maxLength: 120 }}
                  disabled={!canEdit || saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('tax_identification_number')}
                  value={profile.taxIdentificationNumber}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      taxIdentificationNumber: e.target.value
                    })
                  }
                  inputProps={{ maxLength: 120 }}
                  disabled={!canEdit || saving}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label={t('registered_address')}
                  value={profile.registeredAddress}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      registeredAddress: e.target.value
                    })
                  }
                  inputProps={{ maxLength: 500 }}
                  disabled={!canEdit || saving}
                />
              </Grid>
              {canEdit && (
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      t('save')
                    )}
                  </Button>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
