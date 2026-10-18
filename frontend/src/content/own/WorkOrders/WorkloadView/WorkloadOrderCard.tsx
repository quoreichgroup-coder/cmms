import type { KeyboardEvent } from 'react';
import { Card, Chip, Stack, Typography, useTheme } from '@mui/material';
import type {
  DraggableProvided,
  DraggableStateSnapshot
} from 'react-beautiful-dnd';
import { useTranslation } from 'react-i18next';
import { qpmWorkOrderStatusTokens } from 'src/theme/tokens';
import type { WorkloadWorkOrderDTO } from 'src/models/owns/workload';
import WorkOrderStatusChip from '../WorkOrderStatusChip';

interface WorkloadOrderCardProps {
  workOrder: WorkloadWorkOrderDTO;
  overdue: boolean;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  onOpen: () => void;
}

function WorkloadOrderCard({
  workOrder,
  overdue,
  provided,
  snapshot,
  onOpen
}: WorkloadOrderCardProps) {
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const statusToken =
    qpmWorkOrderStatusTokens[workOrder.status] ??
    qpmWorkOrderStatusTokens.DEFAULT;
  const workOrderLabel = workOrder.customId || `WO-${workOrder.id}`;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    onOpen();
  };

  return (
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      aria-label={t('workload_open_order_aria', {
        customId: workOrderLabel,
        title: workOrder.title
      })}
      onClick={onOpen}
      onKeyDownCapture={handleKeyDown}
      variant="outlined"
      sx={{
        width: '100%',
        minWidth: 0,
        maxWidth: 260,
        p: 0.75,
        borderRadius: 1.5,
        borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
        borderLeft: '3px solid',
        borderLeftColor: overdue ? 'error.main' : statusToken.foreground,
        bgcolor: 'background.paper',
        cursor: snapshot.isDragging ? 'grabbing' : 'grab',
        boxShadow: snapshot.isDragging ? 3 : 0,
        transition: 'box-shadow 120ms ease, border-color 120ms ease',
        '&:hover': { boxShadow: 1, borderColor: 'primary.main' },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2
        }
      }}
    >
      <Stack spacing={0.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={0.5}
          sx={{ minWidth: 0 }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ minWidth: 0, fontWeight: 700, textTransform: 'none' }}
          >
            {workOrderLabel}
          </Typography>
          {overdue ? (
            <Chip
              size="small"
              color="error"
              label={t('overdue')}
              sx={{
                height: 20,
                flexShrink: 0,
                '& .MuiChip-label': { px: 0.75, fontSize: 10, fontWeight: 700 }
              }}
            />
          ) : (
            <WorkOrderStatusChip status={workOrder.status} />
          )}
        </Stack>
        <Typography
          variant="body2"
          color="text.primary"
          sx={{
            fontWeight: 600,
            lineHeight: 1.3,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflowWrap: 'anywhere'
          }}
        >
          {workOrder.title}
        </Typography>
        {workOrder.estimatedDuration > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: 'none' }}
          >
            {workOrder.estimatedDuration.toLocaleString(undefined, {
              maximumFractionDigits: 1
            })}{' '}
            {t('hours_abbrev')}
          </Typography>
        )}
      </Stack>
    </Card>
  );
}

export default WorkloadOrderCard;
