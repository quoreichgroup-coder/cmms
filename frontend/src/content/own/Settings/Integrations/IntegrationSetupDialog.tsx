import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link as MuiLink,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography
} from '@mui/material';
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined';
import VpnKeyOutlined from '@mui/icons-material/VpnKeyOutlined';
import WebhookOutlined from '@mui/icons-material/WebhookOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export type IntegrationProvider =
  | 'power-automate'
  | 'n8n'
  | 'sap-eam'
  | 'microsoft-calendar';

interface IntegrationSetupDialogProps {
  provider: IntegrationProvider | null;
  onClose: () => void;
}

const providerDocs: Partial<Record<IntegrationProvider, string>> = {
  'power-automate':
    'https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook',
  n8n: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/'
};

function IntegrationSetupDialog({
  provider,
  onClose
}: IntegrationSetupDialogProps) {
  const { t }: { t: any } = useTranslation();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (provider) setStep(0);
  }, [provider]);

  if (!provider) return null;

  const isN8n = provider === 'n8n';
  const docsUrl = providerDocs[provider];
  const steps = [
    t('integration_step_external'),
    t('integration_step_qpm'),
    t('integration_step_verify')
  ];

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="integration-setup-title"
    >
      <DialogTitle id="integration-setup-title">
        {t('integration_setup_title', {
          provider: t(
            isN8n ? 'integration_n8n_title' : 'integration_power_automate_title'
          )
        })}
      </DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3, mt: 1 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 && (
          <Stack spacing={2}>
            <Typography>{t('integration_step_external_desc')}</Typography>
            {isN8n && (
              <Alert severity="warning">
                {t('integration_step_external_n8n_note')}
              </Alert>
            )}
            <MuiLink
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
            >
              {t('integration_open_provider_docs')}{' '}
              <OpenInNewOutlined fontSize="small" />
            </MuiLink>
          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={2}>
            <Typography>{t('integration_step_qpm_desc')}</Typography>
            <Button
              component={RouterLink}
              to="/app/settings/integrations/webhooks"
              variant="contained"
              startIcon={<WebhookOutlined />}
              onClick={onClose}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('integration_create_webhook')}
            </Button>
            <Alert severity="info">{t('integration_step_qpm_note')}</Alert>
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={2}>
            <Typography>{t('integration_step_verify_desc')}</Typography>
            <Alert severity="info">{t('integration_step_verify_note')}</Alert>
            <Box sx={{ pt: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {t('integration_writeback_title')}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {t('integration_writeback_desc')}
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/app/settings/integrations/api-keys"
              variant="outlined"
              startIcon={<VpnKeyOutlined />}
              onClick={onClose}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('integration_create_api_key')}
            </Button>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>{t('cancel')}</Button>
        {step > 0 && (
          <Button onClick={() => setStep((current) => current - 1)}>
            {t('integration_previous')}
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setStep((current) => current + 1)}
          >
            {t('integration_continue')}
          </Button>
        ) : (
          <Button variant="contained" onClick={onClose}>
            {t('integration_done')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default IntegrationSetupDialog;
