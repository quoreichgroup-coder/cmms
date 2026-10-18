import StatusBadge from '../components/StatusBadge';
import { qpmRequestStatusTokens } from 'src/theme/tokens';

interface RequestStatusChipProps {
  status: string;
  labelKey?: string;
}

export default function RequestStatusChip({
  status,
  labelKey
}: RequestStatusChipProps) {
  return (
    <StatusBadge
      status={status}
      labelKey={labelKey}
      tokens={qpmRequestStatusTokens}
    />
  );
}
