import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  List,
  Text,
  TextInput,
  useTheme
} from 'react-native-paper';
import useAuth from '../hooks/useAuth';
import { useDispatch, useSelector } from '../store';
import { activateLicense, getLicenseValidity } from '../slices/license';
import api, { getErrorMessage } from '../utils/api';
import { qpmLayoutTokens } from '../theme/tokens';

export default function LicenseScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const license = useSelector((state) => state.license.state);
  const [key, setKey] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const canActivate =
    user?.ownsCompany || user?.role?.roleType === 'ROLE_SUPER_ADMIN';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      await dispatch(getLicenseValidity());
      if (canActivate) {
        const result = await api.get<{ available: boolean }>(
          'license/activation-config'
        );
        setAvailable(result.available);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [canActivate, dispatch]);

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
      setError(
        err.message === 'conflict_error'
          ? t('license_conflict')
          : getErrorMessage(err)
      );
    } finally {
      setBusy(false);
    }
  };

  const statusText = license.valid
    ? t('license_active')
    : license.hasLicense
    ? t('license_invalid')
    : t('license_none');
  const statusBackground = license.valid
    ? theme.colors.primaryContainer
    : theme.colors.errorContainer;
  const statusColor = license.valid
    ? theme.colors.onPrimaryContainer
    : theme.colors.onErrorContainer;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel={t('loading')} />
        </View>
      ) : (
        <>
          <Card
            mode="outlined"
            style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
          >
            <Card.Content style={styles.header}>
              <Avatar.Icon
                size={54}
                icon="license"
                style={{ backgroundColor: statusBackground }}
                color={statusColor}
              />
              <View style={styles.headerText}>
                <Text
                  variant="titleLarge"
                  style={{ color: theme.colors.onSurface, fontWeight: '700' }}
                >
                  {t('company_license')}
                </Text>
                <Chip
                  compact
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: statusBackground
                  }}
                  textStyle={{ color: statusColor }}
                >
                  {statusText}
                </Chip>
              </View>
            </Card.Content>
            {license.hasLicense && (
              <>
                <Divider />
                <List.Item
                  title={t('license_plan')}
                  description={license.planName || '—'}
                />
                <List.Item
                  title={t('license_company')}
                  description={license.customerName || '—'}
                />
                <List.Item
                  title={t('license_full_seats')}
                  description={`${license.seatsFull ?? 0} · ${t(
                    'license_light_seats'
                  )}: ${license.seatsLight ?? 0}`}
                />
                <List.Item
                  title={t('license_expiration')}
                  description={
                    license.expirationDate
                      ? new Date(license.expirationDate).toLocaleDateString()
                      : t('never_expires')
                  }
                />
              </>
            )}
            {license.readOnly && (
              <Card.Content
                style={[
                  styles.readOnly,
                  { backgroundColor: theme.colors.surfaceVariant }
                ]}
              >
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('license_read_only')}
                </Text>
              </Card.Content>
            )}
          </Card>

          {error ? (
            <Card
              mode="outlined"
              style={[styles.card, { borderColor: theme.colors.error }]}
            >
              <Card.Content>
                <HelperText type="error" visible accessibilityRole="alert">
                  {error}
                </HelperText>
                <Button onPress={() => void load()}>{t('retry')}</Button>
              </Card.Content>
            </Card>
          ) : null}
          {success ? (
            <Text
              accessibilityRole="alert"
              style={[styles.success, { color: theme.colors.primary }]}
            >
              {t('license_activated')}
            </Text>
          ) : null}

          <Card
            mode="outlined"
            style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
          >
            <Card.Title
              title={t('license_activate')}
              left={(props) => <Avatar.Icon {...props} icon="key-outline" />}
            />
            <Card.Content>
              {canActivate ? (
                available === false ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {t('license_not_available')}
                  </Text>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.description,
                        { color: theme.colors.onSurfaceVariant }
                      ]}
                    >
                      {t('license_activation_description')}
                    </Text>
                    <TextInput
                      label={t('license_key')}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={key}
                      onChangeText={setKey}
                      maxLength={256}
                      disabled={busy || available !== true}
                      mode="outlined"
                    />
                    <Button
                      mode="contained"
                      style={styles.activateButton}
                      onPress={activate}
                      loading={busy}
                      disabled={busy || available !== true || !key.trim()}
                    >
                      {t('license_activate')}
                    </Button>
                  </>
                )
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('license_owner_only')}
                </Text>
              )}
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: {
    borderRadius: qpmLayoutTokens.radius.cardLarge,
    overflow: 'hidden'
  },
  loading: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18
  },
  headerText: { flex: 1, minWidth: 0, gap: 8 },
  readOnly: { padding: 14 },
  description: { marginBottom: 14 },
  activateButton: { marginTop: 14 },
  success: { textAlign: 'center', fontWeight: '600' }
});
