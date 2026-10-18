import { FC } from 'react';
import { Typography, Button, Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PropTypes from 'prop-types';

interface PageHeaderProps {
  handleCreateEvent?: () => void;
}

const PageHeader: FC<PageHeaderProps> = ({ handleCreateEvent }) => {
  const { t }: { t: any } = useTranslation();

  return (
    <Grid container justifyContent="space-between" alignItems="center">
      <Grid item>
        <Typography variant="h3" component="h3" gutterBottom>
          {t('Events')}
        </Typography>
        <Typography variant="subtitle2">
          {t('Check out the latest events and meetings in your calendar')}
        </Typography>
      </Grid>
      <Grid item>
        <Button
          sx={{
            mt: { xs: 2, md: 0 }
          }}
          onClick={handleCreateEvent}
          variant="contained"
          color="primary"
          startIcon={<EventOutlinedIcon fontSize="small" />}
        >
          {t('Add meeting')}
        </Button>
      </Grid>
    </Grid>
  );
};

PageHeader.propTypes = {
  handleCreateEvent: PropTypes.func
};

PageHeader.defaultProps = {
  handleCreateEvent: () => {}
};

export default PageHeader;
