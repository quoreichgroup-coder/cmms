import { Box, Button, Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import SettingsSection from '../../components/SettingsSection';

function ContractorsSettings() {
  const { t }: { t: any } = useTranslation();
  const navigate = useNavigate();

  return (
    <Grid item xs={12}>
      <Box p={4}>
        <SettingsSection title={t('customize_form')}>
          <Box display="flex" flexDirection="column" gap={2}>
            <Button
              variant="text"
              endIcon={<ChevronRightOutlinedIcon />}
              onClick={() =>
                navigate('/app/settings/features/contractors/custom-fields')
              }
              sx={{
                justifyContent: 'space-between',
                textTransform: 'none'
              }}
            >
              {t('custom_fields')}
            </Button>
          </Box>
        </SettingsSection>
      </Box>
    </Grid>
  );
}

export default ContractorsSettings;
