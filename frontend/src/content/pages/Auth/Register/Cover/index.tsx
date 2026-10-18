import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Box, Card, Link, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import JWTRegister from '../RegisterJWT';
import AuthPageLayout from '../../AuthPageLayout';

function RegisterCover() {
  const { t }: { t: any } = useTranslation();
  const [searchParams] = useSearchParams();

  return (
    <>
      <Helmet>
        <title>{t('register')}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AuthPageLayout>
        <Card
          sx={{
            p: { xs: 2.5, sm: 4 },
            my: { xs: 0, md: 3 },
            borderRadius: 3,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: 'none'
          }}
        >
          <Box textAlign="center">
            <Typography variant="h2" sx={{ mb: 1 }}>
              {t('create_account')}
            </Typography>
            <Typography
              variant="h4"
              color="text.secondary"
              fontWeight="normal"
              sx={{ mb: 3 }}
            >
              {t('signup_description')}
            </Typography>
          </Box>
          <JWTRegister
            email={searchParams.get('email')}
            role={Number(searchParams.get('role'))}
            subscriptionPlanId={searchParams.get('subscription-plan-id')}
          />
          <Box mt={4}>
            <Typography
              component="span"
              variant="subtitle2"
              color="text.primary"
              fontWeight="bold"
            >
              {t('account_already')}
            </Typography>{' '}
            <Box display={{ xs: 'block', md: 'inline-block' }}>
              <Link component={RouterLink} to="/account/login">
                <b>{t('signin_here')}</b>
              </Link>
            </Box>
          </Box>
          <Box mt={2} textAlign="center">
            <Link component={RouterLink} to="/open-source-notices">
              {t('open_source_notices')}
            </Link>
          </Box>
        </Card>
      </AuthPageLayout>
    </>
  );
}

export default RegisterCover;
