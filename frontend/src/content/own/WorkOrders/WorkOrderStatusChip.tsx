import StatusBadge from '../components/StatusBadge';
import { qpmWorkOrderStatusTokens } from 'src/theme/tokens';

interface WorkOrderStatusChipProps {
  status: string;
}

export default function WorkOrderStatusChip({
  status
}: WorkOrderStatusChipProps) {
  return <StatusBadge status={status} tokens={qpmWorkOrderStatusTokens} />;
}
