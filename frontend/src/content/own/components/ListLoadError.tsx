import { Alert, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

/** Shown above a list whose last load failed, so an empty grid is not mistaken for "no data". */
export default function ListLoadError({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Alert
      severity="error"
      sx={{ mb: 2 }}
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          {t('retry')}
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
