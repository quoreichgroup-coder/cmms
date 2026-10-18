import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, Link, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import JWTLogin from '../LoginJWT';

import { useTranslation } from 'react-i18next';
import { ldapEnabled } from '../../../../../config';
import AuthPageLayout from '../../AuthPageLayout';

function LoginCover() {
  const { t }: { t: any } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('Login')}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AuthPageLayout>
        <Card
          sx={{
            p: { xs: 2.5, sm: 4 },
            borderRadius: 3,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: 'none'
          }}
        >
          <Box textAlign="center">
            <Typography variant="h2" sx={{ mb: 1 }}>
              {t('login')}
            </Typography>
            <Typography
              variant="h4"
              color="text.secondary"
              fontWeight="normal"
              sx={{ mb: 3 }}
            >
              {t('login_description')}
            </Typography>
          </Box>
          <JWTLogin />
          {!ldapEnabled && (
            <Box my={4}>
              <Typography
                component="span"
                variant="subtitle2"
                color="text.primary"
                fontWeight="bold"
              >
                {t('no_account_yet')}
              </Typography>{' '}
              <Box display={{ xs: 'block', md: 'inline-block' }}>
                <Link component={RouterLink} to="/account/register">
                  <b>{t('signup_here')}</b>
                </Link>
              </Box>
            </Box>
          )}
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

export default LoginCover;
