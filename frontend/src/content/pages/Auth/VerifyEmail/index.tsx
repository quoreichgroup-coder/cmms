import { Box, Card, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import AuthPageLayout from '../AuthPageLayout';

function VerifyEmail() {
  const { t }: { t: any } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t('verify_email_title')}</title>
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
          <Box>
            <Typography variant="h2" sx={{ mb: 1 }}>
              {t('verify_email_title')}
            </Typography>
            <Typography
              variant="h4"
              color="text.secondary"
              fontWeight="normal"
              sx={{ mb: 3 }}
            >
              {t('verify_email_description')}
            </Typography>
          </Box>
        </Card>
      </AuthPageLayout>
    </>
  );
}

export default VerifyEmail;
