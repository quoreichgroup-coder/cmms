import { Box, Card, Container, styled, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';

import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import { useTranslation } from 'react-i18next';
import Logo from 'src/components/LogoSign';

const MainContent = styled(Box)(
  () => `
    height: 100%;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`
);

function AccountDeleted() {
  const { t }: { t: any } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t('account_deleted')}</title>
      </Helmet>
      <MainContent>
        <Container maxWidth="sm">
          <Logo />
          <Card
            sx={{
              mt: 3,
              p: 4,
              textAlign: 'center'
            }}
          >
            <Box>
              <CheckCircleIcon
                sx={{
                  fontSize: 72,
                  color: 'success.main',
                  mb: 2
                }}
              />
              <Typography
                variant="h2"
                sx={{
                  mb: 1
                }}
              >
                {t('account_deleted')}
              </Typography>
              <Typography
                variant="h4"
                color="text.secondary"
                fontWeight="normal"
              >
                {t('account_deleted_description')}
              </Typography>
            </Box>
          </Card>
        </Container>
      </MainContent>
    </>
  );
}

export default AccountDeleted;
