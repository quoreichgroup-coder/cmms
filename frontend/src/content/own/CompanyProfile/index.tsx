import { useContext, useEffect, useState } from 'react';

import { Helmet } from 'react-helmet-async';

import { Box, Grid, Tab, Tabs } from '@mui/material';
import CompanyCover from './CompanyCover';
import CompanyDetails from './CompanyDetails';
import CompanyPlan from './CompanyPlan';
import CompanyLicense from './CompanyLicense';
import CompanyLegalDetails from './CompanyLegalDetails';
import CompanySites from './CompanySites';
import CompanyConfigurationHistory from './CompanyConfigurationHistory';
import { TitleContext } from '../../../contexts/TitleContext';
import { useTranslation } from 'react-i18next';
import useAuth from '../../../hooks/useAuth';
import { isCloudVersion } from '../../../config';
import { PermissionEntity } from '../../../models/owns/role';

function CompanyProfile() {
  const { t }: { t: any } = useTranslation();
  const { company, user } = useAuth();
  const canViewSettings = user.ownsCompany || user.role?.viewPermissions?.includes(PermissionEntity.SETTINGS);
  const canEditSettings = Boolean(user.ownsCompany || (user.role?.viewPermissions?.includes(PermissionEntity.SETTINGS)
    && user.role?.editOtherPermissions?.includes(PermissionEntity.SETTINGS)));
  const [section, setSection] = useState(0);
  const { setTitle } = useContext(TitleContext);

  useEffect(() => {
    setTitle(t('company'));
  }, []);
  if (!company) {
    return null;
  }
  return (
    <>
      <Helmet>
        <title>{`${company.name || 'QPM'} - Company Details`}</title>
      </Helmet>
      <Box
        sx={{
          mt: 3
        }}
      >
        <Grid
          sx={{
            px: 4
          }}
          container
          direction="row"
          justifyContent="center"
          alignItems="stretch"
          spacing={1}
        >
          <Grid item xs={12}>
            <CompanyCover image={company.logo?.url} canEdit={canEditSettings} />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={section} onChange={(_event, value) => setSection(value)} variant="scrollable" scrollButtons="auto" aria-label={t('company_settings_sections')}>
                <Tab label={t('company_details')} />
                {canViewSettings && <Tab label={t('company_legal_information')} />}
                {canViewSettings && <Tab label={t('company_sites')} />}
                {canViewSettings && <Tab label={t('configuration_history')} />}
                <Tab label={t('company_license')} />
                {user.ownsCompany && company.subscription?.subscriptionPlan && <Tab label={t('subscription_plan')} />}
              </Tabs>
            </Box>
            {section === 0 && <CompanyDetails company={company} />}
            {canViewSettings && section === 1 && <CompanyLegalDetails />}
            {canViewSettings && section === 2 && <CompanySites />}
            {canViewSettings && section === 3 && <CompanyConfigurationHistory />}
            {section === (canViewSettings ? 4 : 1) && <CompanyLicense />}
            {user.ownsCompany && company.subscription?.subscriptionPlan && section === (canViewSettings ? 5 : 2) && (
              <CompanyPlan plan={company.subscription.subscriptionPlan} />
            )}
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

export default CompanyProfile;
