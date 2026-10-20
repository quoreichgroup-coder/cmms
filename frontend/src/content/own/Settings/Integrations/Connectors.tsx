import {
  AccountTreeOutlined,
  ArrowForwardOutlined,
  BusinessOutlined,
  CalendarMonthOutlined,
  CampaignOutlined,
  HubOutlined,
  Inventory2Outlined,
  LockOutlined,
  VpnKeyOutlined,
  WebhookOutlined
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Grid,
  Stack,
  Typography
} from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import IntegrationSetupDialog, {
  IntegrationProvider
} from './IntegrationSetupDialog';
import {
  getWebhookEventLabelKey,
  WebhookEvent
} from '../../../../models/owns/webhookEndpoint';

const qpmTools = [
  {
    key: 'api-keys',
    titleKey: 'api_keys',
    descriptionKey: 'connector_api_keys_description',
    Icon: VpnKeyOutlined
  },
  {
    key: 'webhooks',
    titleKey: 'webhooks',
    descriptionKey: 'connector_webhooks_description',
    Icon: WebhookOutlined
  }
];

const providerCards: Array<{
  id: IntegrationProvider;
  titleKey: string;
  descriptionKey: string;
  Icon: typeof HubOutlined;
  available: boolean;
}> = [
  {
    id: 'power-automate',
    titleKey: 'integration_power_automate_title',
    descriptionKey: 'integration_power_automate_description',
    Icon: HubOutlined,
    available: true
  },
  {
    id: 'n8n',
    titleKey: 'integration_n8n_title',
    descriptionKey: 'integration_n8n_description',
    Icon: AccountTreeOutlined,
    available: true
  },
  {
    id: 'sap-eam',
    titleKey: 'integration_sap_title',
    descriptionKey: 'integration_sap_description',
    Icon: BusinessOutlined,
    available: false
  },
  {
    id: 'microsoft-calendar',
    titleKey: 'integration_calendar_title',
    descriptionKey: 'integration_calendar_description',
    Icon: CalendarMonthOutlined,
    available: false
  }
];

const workflowRecipes: Array<{
  id: string;
  titleKey: string;
  descriptionKey: string;
  events: WebhookEvent[];
  Icon: typeof CampaignOutlined;
}> = [
  {
    id: 'work-order-updates',
    titleKey: 'integration_recipe_work_orders_title',
    descriptionKey: 'integration_recipe_work_orders_description',
    events: ['NEW_WORK_ORDER', 'WORK_ORDER_STATUS_CHANGE'],
    Icon: CampaignOutlined
  },
  {
    id: 'request-triage',
    titleKey: 'integration_recipe_requests_title',
    descriptionKey: 'integration_recipe_requests_description',
    events: ['NEW_REQUEST', 'WORK_REQUEST_STATUS_CHANGE'],
    Icon: HubOutlined
  },
  {
    id: 'part-quantity',
    titleKey: 'integration_recipe_parts_title',
    descriptionKey: 'integration_recipe_parts_description',
    events: ['PART_QUANTITY_CHANGED', 'PART_CHANGE'],
    Icon: Inventory2Outlined
  }
];

function Connectors() {
  const { t }: { t: any } = useTranslation();
  const [selectedProvider, setSelectedProvider] =
    useState<IntegrationProvider | null>(null);

  return (
    <Box sx={{ py: { xs: 2.5, sm: 3.5 }, px: { xs: 0, sm: 1 } }}>
      <Stack spacing={0.75} sx={{ mb: 3, maxWidth: 820 }}>
        <Typography variant="h4" component="h1">
          {t('connectors')}
        </Typography>
        <Typography color="text.secondary">
          {t('integration_hub_description')}
        </Typography>
      </Stack>

      <Alert
        severity="info"
        icon={<LockOutlined />}
        sx={{ mb: 3, borderRadius: 2, alignItems: 'center' }}
      >
        {t('integration_hub_security_note')}
      </Alert>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="h5" component="h2">
            {t('integration_external_workflows')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('integration_external_workflows_description')}
          </Typography>
        </Box>
        <Chip
          size="small"
          variant="outlined"
          color="primary"
          label={t('integration_available_via_webhooks')}
        />
      </Stack>

      <Grid container spacing={1.5}>
        {providerCards.map(
          ({ id, titleKey, descriptionKey, Icon, available }) => (
            <Grid item xs={12} sm={6} lg={3} key={id}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderRadius: 2.5,
                  borderColor: 'divider',
                  transition: 'border-color 160ms ease, box-shadow 160ms ease',
                  '&:hover, &:focus-within': available
                    ? {
                        borderColor: 'primary.main',
                        boxShadow: 2
                      }
                    : undefined
                }}
              >
                <Stack spacing={1.5} sx={{ p: 2.25, height: '100%' }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box
                      aria-hidden="true"
                      sx={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 44,
                        height: 44,
                        color: available ? 'primary.main' : 'text.secondary',
                        bgcolor: available ? 'action.selected' : 'action.hover',
                        borderRadius: 1.5
                      }}
                    >
                      <Icon />
                    </Box>
                    <Chip
                      size="small"
                      color={available ? 'success' : 'default'}
                      variant={available ? 'outlined' : 'filled'}
                      label={
                        available
                          ? t('integration_recipe_available')
                          : t('integration_planned')
                      }
                    />
                  </Stack>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{ mb: 0.5, fontWeight: 700 }}
                    >
                      {t(titleKey)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t(descriptionKey)}
                    </Typography>
                  </Box>
                  {available ? (
                    <Button
                      variant="text"
                      color="primary"
                      endIcon={<ArrowForwardOutlined />}
                      onClick={() => setSelectedProvider(id)}
                      sx={{ alignSelf: 'flex-start', ml: -1 }}
                    >
                      {t('integration_open_setup')}
                    </Button>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {t('integration_backend_prerequisite')}
                    </Typography>
                  )}
                </Stack>
              </Card>
            </Grid>
          )
        )}
      </Grid>

      <Stack spacing={0.75} sx={{ mt: 4, mb: 1.5 }}>
        <Typography variant="h5" component="h2">
          {t('integration_recipes_title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('integration_recipes_description')}
        </Typography>
      </Stack>

      <Grid container spacing={1.5}>
        {workflowRecipes.map(
          ({ id, titleKey, descriptionKey, events, Icon }) => (
            <Grid item xs={12} md={6} xl={4} key={id}>
              <Card
                variant="outlined"
                sx={{ height: '100%', borderRadius: 2.5 }}
              >
                <Stack spacing={1.5} sx={{ p: 2.25, height: '100%' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      aria-hidden="true"
                      sx={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        color: 'primary.main',
                        bgcolor: 'action.selected'
                      }}
                    >
                      <Icon fontSize="small" />
                    </Box>
                    <Typography variant="h6" component="h3" fontWeight={700}>
                      {t(titleKey)}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ flex: 1 }}
                  >
                    {t(descriptionKey)}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {events.map((event) => (
                      <Chip
                        key={event}
                        size="small"
                        variant="outlined"
                        label={t(getWebhookEventLabelKey(event))}
                      />
                    ))}
                  </Stack>
                  <Button
                    component={Link}
                    to="/app/settings/integrations/webhooks"
                    variant="text"
                    endIcon={<ArrowForwardOutlined />}
                    sx={{ alignSelf: 'flex-start', ml: -1 }}
                  >
                    {t('integration_recipe_configure')}
                  </Button>
                </Stack>
              </Card>
            </Grid>
          )
        )}
      </Grid>

      <Alert severity="warning" sx={{ mt: 2.5, borderRadius: 2 }}>
        {t('integration_recipes_security_note')}
      </Alert>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mt: 4, mb: 1.5 }}
      >
        <Box>
          <Typography variant="h5" component="h2">
            {t('integration_qpm_tools_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('integration_qpm_tools_description')}
          </Typography>
        </Box>
        <Chip
          size="small"
          variant="outlined"
          label={t('integration_tools_not_provider_connections')}
        />
      </Stack>

      <Grid container spacing={1.5}>
        {qpmTools.map(({ key, titleKey, descriptionKey, Icon }) => (
          <Grid item xs={12} md={6} key={key}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderRadius: 2.5,
                borderColor: 'divider',
                transition: 'border-color 160ms ease, box-shadow 160ms ease',
                '&:hover, &:focus-within': {
                  borderColor: 'primary.main',
                  boxShadow: 2
                }
              }}
            >
              <CardActionArea
                component={Link}
                to={`/app/settings/integrations/${key}`}
                sx={{ height: '100%', p: { xs: 2, sm: 2.5 } }}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    aria-hidden="true"
                    sx={{
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 48px',
                      width: 48,
                      height: 48,
                      color: 'primary.main',
                      bgcolor: 'action.selected',
                      borderRadius: 1.5
                    }}
                  >
                    <Icon />
                  </Box>
                  <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{ fontWeight: 700 }}
                    >
                      {t(titleKey)}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {t(descriptionKey)}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      color="primary.main"
                      sx={{ pt: 0.25 }}
                    >
                      <Typography variant="button">
                        {t('manage_integration')}
                      </Typography>
                      <ArrowForwardOutlined
                        fontSize="small"
                        aria-hidden="true"
                      />
                    </Stack>
                  </Stack>
                </Stack>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <IntegrationSetupDialog
        provider={selectedProvider}
        onClose={() => setSelectedProvider(null)}
      />
    </Box>
  );
}

export default Connectors;
