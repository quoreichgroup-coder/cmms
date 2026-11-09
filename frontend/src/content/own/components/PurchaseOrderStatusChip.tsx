import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { qpmRequestStatusTokens } from '../../../theme/tokens';

const statusTokens: Record<string, { foreground: string; background: string }> = {
  APPROVED: qpmRequestStatusTokens.APPROVED,
  PENDING: qpmRequestStatusTokens.PENDING,
  REJECTED: qpmRequestStatusTokens.CANCELLED
};

/** Purchase order approval status with the shared semantic colours; closed orders are shown as such. */
export default function PurchaseOrderStatusChip({
  status,
  closed = false,
  size = 'small'
}: {
  status: string;
  closed?: boolean;
  size?: 'small' | 'medium';
}) {
  const { t } = useTranslation();
  const colors = closed
    ? qpmRequestStatusTokens.DEFAULT
    : statusTokens[status] ?? qpmRequestStatusTokens.DEFAULT;
  return (
    <Chip
      size={size}
      label={closed ? t('purchase_order_closed_label') : t(status)}
      sx={{
        color: colors.foreground,
        backgroundColor: colors.background,
        fontWeight: 600
      }}
    />
  );
}
