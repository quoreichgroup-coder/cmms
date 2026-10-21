import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink } from 'react-router-dom';
import { PermissionEntity } from '../../../models/owns/role';
import useAuth from '../../../hooks/useAuth';
import { useBrand } from '../../../hooks/useBrand';
import { normalizeHelpSearch } from './normalizeHelpSearch';

type Guide = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  permission?: PermissionEntity;
  href?: string;
};

export default function HelpCenter() {
  const { t } = useTranslation();
  const { name } = useBrand();
  const { hasViewPermission } = useAuth();
  const [query, setQuery] = useState('');

  const guides: Guide[] = useMemo(
    () => [
      {
        id: 'work-orders',
        title: t('help_work_orders_title'),
        summary: t('help_work_orders_summary'),
        steps: [
          t('help_work_orders_step_1'),
          t('help_work_orders_step_2'),
          t('help_work_orders_step_3'),
          t('help_work_orders_step_4')
        ],
        permission: PermissionEntity.WORK_ORDERS,
        href: '/app/work-orders'
      },
      {
        id: 'requests',
        title: t('help_requests_title'),
        summary: t('help_requests_summary'),
        steps: [
          t('help_requests_step_1'),
          t('help_requests_step_2'),
          t('help_requests_step_3')
        ],
        permission: PermissionEntity.REQUESTS,
        href: '/app/requests'
      },
      {
        id: 'equipment',
        title: t('help_equipment_title'),
        summary: t('help_equipment_summary'),
        steps: [
          t('help_equipment_step_1'),
          t('help_equipment_step_2'),
          t('help_equipment_step_3')
        ],
        permission: PermissionEntity.ASSETS,
        href: '/app/assets'
      },
      {
        id: 'inventory',
        title: t('help_inventory_title'),
        summary: t('help_inventory_summary'),
        steps: [
          t('help_inventory_step_1'),
          t('help_inventory_step_2'),
          t('help_inventory_step_3')
        ],
        permission: PermissionEntity.PARTS_AND_MULTIPARTS,
        href: '/app/inventory/parts'
      },
      {
        id: 'planning',
        title: t('help_planning_title'),
        summary: t('help_planning_summary'),
        steps: [
          t('help_planning_step_1'),
          t('help_planning_step_2'),
          t('help_planning_step_3')
        ],
        permission: PermissionEntity.WORK_ORDERS,
        href: '/app/work-orders?view=calendar'
      },
      {
        id: 'account',
        title: t('help_account_title'),
        summary: t('help_account_summary'),
        steps: [
          t('help_account_step_1'),
          t('help_account_step_2'),
          t('help_account_step_3')
        ],
        href: '/app/account/profile'
      },
      {
        id: 'settings',
        title: t('help_settings_title'),
        summary: t('help_settings_summary'),
        steps: [
          t('help_settings_step_1'),
          t('help_settings_step_2'),
          t('help_settings_step_3')
        ],
        permission: PermissionEntity.SETTINGS,
        href: '/app/settings'
      }
    ],
    [t]
  );

  const visibleGuides = guides.filter((guide) => {
    if (guide.permission && !hasViewPermission(guide.permission)) return false;
    const searchable = `${guide.title} ${guide.summary} ${guide.steps.join(
      ' '
    )}`;
    return normalizeHelpSearch(searchable).includes(
      normalizeHelpSearch(query.trim())
    );
  });

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Helmet>
        <title>{`${name} — ${t('help_center_title')}`}</title>
      </Helmet>
      <Stack spacing={3}>
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <HelpOutlineOutlinedIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h3" component="h1">
                    {t('help_center_title')}
                  </Typography>
                  <Typography color="text.secondary">
                    {t('help_center_intro')}
                  </Typography>
                </Box>
              </Stack>
              <TextField
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('help_search_placeholder')}
                fullWidth
                inputProps={{ 'aria-label': t('help_search_placeholder') }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon />
                    </InputAdornment>
                  )
                }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {t(
                  visibleGuides.length === 1
                    ? 'help_results_count_singular'
                    : 'help_results_count_plural',
                  { count: visibleGuides.length }
                )}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Alert severity="info">{t('help_permissions_note')}</Alert>

        {visibleGuides.length ? (
          visibleGuides.map((guide, index) => (
            <Accordion
              key={guide.id}
              defaultExpanded={index === 0}
              disableGutters
            >
              <AccordionSummary
                expandIcon={<ExpandMoreOutlinedIcon />}
                aria-controls={`${guide.id}-content`}
                id={`${guide.id}-header`}
              >
                <Stack spacing={0.5} sx={{ py: 0.5, pr: 1 }}>
                  <Typography fontWeight={600}>{guide.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {guide.summary}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails id={`${guide.id}-content`}>
                <Stack spacing={1.5}>
                  <Box
                    component="ol"
                    sx={{
                      m: 0,
                      pl: 3,
                      '& > li + li': { mt: 1.5 },
                      '& > li::marker': {
                        color: 'primary.main',
                        fontWeight: 700
                      }
                    }}
                  >
                    {guide.steps.map((step, stepIndex) => (
                      <Box component="li" key={`${guide.id}-${stepIndex}`}>
                        <Typography component="span">{step}</Typography>
                      </Box>
                    ))}
                  </Box>
                  {guide.href && (
                    <Box>
                      <Button
                        component={RouterLink}
                        to={guide.href}
                        startIcon={
                          guide.id === 'inventory' ||
                          guide.id === 'equipment' ? (
                            <Inventory2OutlinedIcon />
                          ) : guide.id === 'settings' ? (
                            <SettingsOutlinedIcon />
                          ) : (
                            <AssignmentOutlinedIcon />
                          )
                        }
                        sx={{ mt: 1 }}
                      >
                        {t('help_open_module')}
                      </Button>
                    </Box>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))
        ) : (
          <Card variant="outlined">
            <CardContent>
              <Typography>{t('help_no_results')}</Typography>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
