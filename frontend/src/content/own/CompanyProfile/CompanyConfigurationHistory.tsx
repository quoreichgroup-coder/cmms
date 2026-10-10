import { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import HistoryTwoToneIcon from '@mui/icons-material/HistoryTwoTone';
import { useTranslation } from 'react-i18next';
import useAuth from '../../../hooks/useAuth';
import api, { getErrorMessage } from '../../../utils/api';

interface ConfigurationEvent {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  changedFields: string;
  actorId: number;
  occurredAt: string;
}

export default function CompanyConfigurationHistory() {
  const { t } = useTranslation();
  const { company } = useAuth();
  const [events, setEvents] = useState<ConfigurationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<ConfigurationEvent[]>(`companies/${company.id}/configuration-audit`)
      .then((result) => active && setEvents(result))
      .catch((e) => active && setError(getErrorMessage(e, t('configuration_audit_load_error'))))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [company.id, t]);

  const formatFields = (json: string) => {
    try {
      const fields = JSON.parse(json) as string[];
      return fields.map((field) => t(`configuration_field.${field}`, { defaultValue: field })).join(', ');
    } catch {
      return t('configuration_audit_fields_unavailable');
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 3, pb: 1 }}>
        <HistoryTwoToneIcon color="primary" />
        <Box>
          <Typography variant="h4">{t('configuration_audit_title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('configuration_audit_description')}</Typography>
        </Box>
      </Box>
      <CardContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box> :
          events.length === 0 ? <Typography color="text.secondary">{t('configuration_audit_empty')}</Typography> :
            <Stack divider={<Divider flexItem />} spacing={0}>
              {events.map((event) => (
                <Box key={event.id} sx={{ py: 1.75 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Typography fontWeight={600}>
                      {t(`configuration_entity.${event.entityType}`, { defaultValue: event.entityType })}
                      {' · '}{t(`configuration_action.${event.action}`, { defaultValue: event.action })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {event.occurredAt ? new Date(event.occurredAt).toLocaleString() : '—'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {t('configuration_audit_actor', { id: event.actorId })} · {formatFields(event.changedFields)}
                  </Typography>
                </Box>
              ))}
            </Stack>}
      </CardContent>
    </Card>
  );
}
