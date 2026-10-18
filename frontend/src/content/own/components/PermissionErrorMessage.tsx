import { Card } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ContentState from './ContentState';

export default function PermissionErrorMessage({
  message
}: {
  message: string;
}) {
  const { t }: { t: any } = useTranslation();
  return (
    <Card
      variant="outlined"
      sx={{
        minHeight: { xs: 200, sm: 240 },
        mx: { xs: 1.5, sm: 3 },
        my: { xs: 1.5, sm: 3 },
        display: 'flex',
        alignItems: 'center',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderRadius: 2
      }}
    >
      <ContentState variant="denied" message={t(message)} minHeight={180} />
    </Card>
  );
}
