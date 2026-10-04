import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import useAuth from '../hooks/useAuth';
import { useDispatch, useSelector } from '../store';
import { activateLicense, getLicenseValidity } from '../slices/license';
import api, { getErrorMessage } from '../utils/api';

export default function LicenseScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const license = useSelector((state) => state.license.state);
  const [key, setKey] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const canActivate = user?.ownsCompany || user?.role?.roleType === 'ROLE_SUPER_ADMIN';

  const load = async () => {
    setError('');
    try {
      await dispatch(getLicenseValidity());
      if (canActivate) {
        const result = await api.get<{ available: boolean }>('license/activation-config');
        setAvailable(result.available);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };
  useEffect(() => { void load(); }, [canActivate, dispatch]);

  const activate = async () => {
    if (!canActivate || !available || !key.trim() || busy) return;
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      await dispatch(activateLicense(key.trim()));
      setKey('');
      setSuccess(true);
    } catch (err) {
      setError(err.message === 'conflict_error'
        ? t('license_conflict')
        : getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return <ScrollView contentContainerStyle={{ padding: 16 }}>
    <Card><Card.Content>
      <Text variant="titleLarge">{t('company_license')}</Text>
      <Text style={{ marginVertical: 16 }}>
        {license.valid ? t('license_active') : license.hasLicense ? t('license_invalid') : t('license_none')}
      </Text>
      {license.hasLicense && <>
        <Text>{t('license_plan')}: {license.planName || '—'}</Text>
        <Text>{t('license_company')}: {license.customerName || '—'}</Text>
        <Text>{t('license_full_seats')}: {license.seatsFull ?? 0} · {t('license_light_seats')}: {license.seatsLight ?? 0}</Text>
        <Text>{t('license_expiration')}: {license.expirationDate ? new Date(license.expirationDate).toLocaleDateString() : t('never_expires')}</Text>
      </>}
      {license.readOnly && <Text>{t('license_read_only')}</Text>}
      {error && <>
        <HelperText type="error" accessibilityRole="alert">{error}</HelperText>
        <Button onPress={load}>{t('retry')}</Button>
      </>}
      {success && <Text accessibilityRole="alert">{t('license_activated')}</Text>}
      {canActivate ? available === false ? <Text>{t('license_not_available')}</Text> : <>
        <Text style={{ marginVertical: 16 }}>{t('license_activation_description')}</Text>
        <TextInput label={t('license_key')} secureTextEntry autoCapitalize="none" autoCorrect={false}
          value={key} onChangeText={setKey} maxLength={256} disabled={busy || available !== true} />
        <Button mode="contained" style={{ marginTop: 16 }} onPress={activate}
          loading={busy} disabled={busy || available !== true || !key.trim()}>{t('license_activate')}</Button>
      </> : <Text>{t('license_owner_only')}</Text>}
    </Card.Content></Card>
  </ScrollView>;
}
