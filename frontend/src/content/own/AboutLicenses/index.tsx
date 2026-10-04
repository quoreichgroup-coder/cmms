import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useBrand } from '../../../hooks/useBrand';

const sourceRepository = 'https://github.com/quoreichgroup-coder/cmms';
const agplLicense = 'https://www.gnu.org/licenses/agpl-3.0.html';

export default function AboutLicenses() {
  const { t } = useTranslation();
  const { name } = useBrand();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Helmet>
        <title>{name} — {t('open_source_notices')}</title>
      </Helmet>
      <Paper sx={{ p: { xs: 2, sm: 4 } }}>
        <Stack spacing={2}>
          <Typography variant="h3">{t('open_source_notices')}</Typography>
          <Typography>{t('open_source_modified')}</Typography>
          <Typography>{t('open_source_upstream')}</Typography>
          <Typography>{t('open_source_license')}</Typography>
          <Typography>{t('open_source_no_warranty')}</Typography>
          <Typography>
            © QUOREICH GROUP, {new Date().getFullYear()} · QPM
          </Typography>
          <Box>
            <Button
              component="a"
              href={sourceRepository}
              target="_blank"
              rel="noreferrer"
              endIcon={<OpenInNewIcon />}
            >
              {t('open_source_source')}
            </Button>
            <Button
              component="a"
              href={agplLicense}
              target="_blank"
              rel="noreferrer"
              endIcon={<OpenInNewIcon />}
            >
              AGPL-3.0
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
