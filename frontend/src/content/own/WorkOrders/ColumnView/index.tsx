import { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Pagination,
  Stack,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import WorkOrder from 'src/models/owns/workOrder';
import WorkOrderStatusChip from '../WorkOrderStatusChip';
import PriorityWrapper from '../../components/PriorityWrapper';

const WORK_ORDER_STATUSES = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETE'];

interface ColumnViewProps {
  workOrders: WorkOrder[];
  loading: boolean;
  error: string | null;
  totalRows: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (pageIndex: number) => void;
  onRetry: () => void;
  onOpenDetails: (id: number) => void;
}

function WorkOrderColumnView({
  workOrders,
  loading,
  error,
  totalRows,
  pageIndex,
  pageSize,
  onPageChange,
  onRetry,
  onOpenDetails
}: ColumnViewProps) {
  const { t, i18n } = useTranslation();
  const pageCount = Math.ceil(totalRows / pageSize);
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);
  const workOrdersByStatus = useMemo(
    () =>
      WORK_ORDER_STATUSES.map((status) => ({
        status,
        workOrders: workOrders.filter(
          (workOrder) => workOrder.status === status
        )
      })),
    [workOrders]
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {pageCount > 1 && (
        <Typography
          component="p"
          role="note"
          variant="caption"
          color="text.secondary"
          sx={{ mb: 1.5 }}
        >
          {t('column_view_page_scope', { from, to, count: totalRows })}
        </Typography>
      )}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={onRetry}>
              {t('retry')}
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress aria-label={t('loading')} />
        </Box>
      ) : error ? null : (
        <Grid container spacing={1.5} alignItems="stretch">
          {workOrdersByStatus.map(
            ({ status, workOrders: statusWorkOrders }) => (
              <Grid item xs={12} sm={6} lg={3} key={status}>
                <Box
                  sx={{
                    height: '100%',
                    minHeight: 240,
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    backgroundColor: 'action.hover'
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ mb: 1.5 }}
                  >
                    <WorkOrderStatusChip status={status} />
                    <Chip
                      size="small"
                      label={statusWorkOrders.length}
                      aria-label={`${t(status)}: ${statusWorkOrders.length}`}
                    />
                  </Stack>
                  <Stack spacing={1}>
                    {statusWorkOrders.length === 0 ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ py: 2, textAlign: 'center' }}
                      >
                        {t('no_results')}
                      </Typography>
                    ) : (
                      statusWorkOrders.map((workOrder) => (
                        <Card
                          key={workOrder.id}
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            backgroundColor: 'background.paper'
                          }}
                        >
                          <CardActionArea
                            onClick={() => onOpenDetails(workOrder.id)}
                            aria-label={`${
                              workOrder.customId || t('work_orders')
                            }: ${workOrder.title}`}
                          >
                            <CardContent
                              sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}
                            >
                              <Stack spacing={1}>
                                <Stack
                                  direction="row"
                                  alignItems="flex-start"
                                  justifyContent="space-between"
                                  spacing={1}
                                >
                                  <Box sx={{ minWidth: 0 }}>
                                    {workOrder.customId && (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        noWrap
                                      >
                                        {workOrder.customId}
                                      </Typography>
                                    )}
                                    <Typography
                                      variant="subtitle2"
                                      color="text.primary"
                                      sx={{ overflowWrap: 'anywhere' }}
                                    >
                                      {workOrder.title}
                                    </Typography>
                                  </Box>
                                  <PriorityWrapper
                                    priority={workOrder.priority}
                                  />
                                </Stack>
                                {(workOrder.asset?.name ||
                                  workOrder.location?.name) && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {workOrder.asset?.name ||
                                      workOrder.location?.name}
                                  </Typography>
                                )}
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  spacing={1}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {workOrder.dueDate
                                      ? new Date(
                                          workOrder.dueDate
                                        ).toLocaleDateString(i18n.language)
                                      : t('no_due_date')}
                                  </Typography>
                                  {workOrder.primaryUser && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      noWrap
                                    >
                                      {`${
                                        workOrder.primaryUser.firstName ?? ''
                                      } ${
                                        workOrder.primaryUser.lastName ?? ''
                                      }`.trim()}
                                    </Typography>
                                  )}
                                </Stack>
                              </Stack>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      ))
                    )}
                  </Stack>
                </Box>
              </Grid>
            )
          )}
        </Grid>
      )}

      {pageCount > 1 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mt: 2 }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('pagination_displayed_rows', { from, to, count: totalRows })}
          </Typography>
          <Pagination
            count={pageCount}
            page={pageIndex + 1}
            onChange={(_event, page) => onPageChange(page - 1)}
            disabled={loading || Boolean(error)}
            showFirstButton
            showLastButton
            size="small"
            aria-label={t('pagination')}
          />
        </Stack>
      )}
    </Box>
  );
}

export default WorkOrderColumnView;
