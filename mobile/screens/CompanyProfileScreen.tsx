import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Divider, List, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import api, { getErrorMessage } from '../utils/api';

interface CompanyLegalProfile {
  legalName?: string;
  registrationCountry?: string;
  businessRegistrationNumber?: string;
  taxIdentificationNumber?: string;
  registeredAddress?: string;
}

interface CompanySite {
  id: number;
  name: string;
  code: string;
  timeZone?: string;
  documentLanguage?: string;
}

export default function CompanyProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { company } = useAuth();
  const [legal, setLegal] = useState<CompanyLegalProfile | null>(null);
  const [sites, setSites] = useState<CompanySite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    setError('');
    try {
      const [legalProfile, companySites] = await Promise.all([
        api.get<CompanyLegalProfile>(`companies/${company.id}/legal-profile`),
        api.get<CompanySite[]>('sites')
      ]);
      setLegal(legalProfile);
      setSites(companySites);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { void load(); }, [load]);

  const row = (title: string, value?: string | null) => (
    <List.Item title={title} description={value?.trim() || '—'} titleNumberOfLines={2} descriptionNumberOfLines={3} />
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { backgroundColor: theme.colors.background }]}
      accessibilityLabel={t('company_profile')}
    >
      {loading ? <View style={styles.center}><ActivityIndicator accessibilityLabel={t('loading')} /></View> : error ? (
        <Card accessible accessibilityRole="alert"><Card.Content>
          <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>{error}</Text>
          <Button accessibilityRole="button" onPress={() => void load()} style={styles.retry}>{t('retry')}</Button>
        </Card.Content></Card>
      ) : <>
        <Card mode="elevated" style={styles.card}>
          <Card.Content style={styles.identity}>
            {company?.logo?.url ? <Avatar.Image size={56} source={{ uri: company.logo.url }} /> :
              <Avatar.Icon size={56} icon="domain" />}
            <View style={styles.identityText}>
              <Text variant="titleLarge" accessibilityRole="header">{company?.name || '—'}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{t('company_profile')}</Text>
            </View>
          </Card.Content>
          <Divider />
          {row(t('address'), company?.address)}
          {row(t('city'), company?.city)}
          {row(t('state'), company?.state)}
          {row(t('zip_code'), company?.zipCode)}
          {row(t('phone'), company?.phone)}
          {row(t('email'), company?.email)}
          {row(t('website'), company?.website)}
        </Card>

        <Card mode="outlined" style={styles.card}>
          <Card.Title title={t('company_legal_information')} left={(props) => <Avatar.Icon {...props} icon="file-document-outline" />} />
          <Divider />
          {row(t('legal_name'), legal?.legalName)}
          {row(t('registration_country'), legal?.registrationCountry)}
          {row(t('business_registration_number'), legal?.businessRegistrationNumber)}
          {row(t('tax_identification_number'), legal?.taxIdentificationNumber)}
          {row(t('registered_address'), legal?.registeredAddress)}
        </Card>

        <Card mode="outlined" style={styles.card}>
          <Card.Title title={`${t('company_sites')} (${sites.length})`} left={(props) => <Avatar.Icon {...props} icon="map-marker-multiple-outline" />} />
          <Divider />
          {sites.length === 0 ? <Card.Content style={styles.empty}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{t('company_sites_empty')}</Text>
          </Card.Content> : sites.map((site) => (
            <List.Item
              key={site.id}
              title={site.name}
              description={[site.code, site.timeZone, site.documentLanguage].filter(Boolean).join(' · ')}
              left={(props) => <List.Icon {...props} icon="map-marker-outline" />}
            />
          ))}
        </Card>
        <Text variant="bodySmall" style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
          {t('company_profile_mobile_description')}
        </Text>
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  card: { borderRadius: 14, overflow: 'hidden' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18 },
  identityText: { flex: 1, minWidth: 0 },
  center: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  retry: { alignSelf: 'flex-start', marginTop: 12 },
  empty: { paddingVertical: 20 },
  note: { paddingHorizontal: 4 }
});
