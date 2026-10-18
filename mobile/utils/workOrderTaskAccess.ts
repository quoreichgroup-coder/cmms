import WorkOrder from '../models/workOrder';

/** Task execution is read-only when a WO is closed or the user cannot edit it. */
export const isWorkOrderTaskExecutionReadOnly = (
  workOrder: Pick<WorkOrder, 'status'> | null | undefined,
  canEditWorkOrder: boolean
): boolean =>
  !workOrder || workOrder.status === 'COMPLETE' || !canEditWorkOrder;
