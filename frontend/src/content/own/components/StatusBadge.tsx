import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface StatusBadgeTokens {
  foreground: string;
  background: string;
}

interface StatusBadgeProps {
  status: string;
  labelKey?: string;
  tokens: Record<string, StatusBadgeTokens>;
}

export default function StatusBadge({
  status,
  labelKey,
  tokens
}: StatusBadgeProps) {
  const { t } = useTranslation();
  const style = tokens[status] ?? tokens.DEFAULT;

  return (
    <Chip
      label={t(labelKey ?? status)}
      size="small"
      sx={{
        color: style.foreground,
        backgroundColor: style.background,
        border: '1px solid transparent',
        fontWeight: 600,
        maxWidth: '100%',
        '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
      }}
    />
  );
}
