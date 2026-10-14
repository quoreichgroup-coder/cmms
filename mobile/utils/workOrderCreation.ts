export interface WorkOrderWithTasks {
  id: number;
  tasks?: Array<{
    taskBase: {
      options: Array<{ label: string }>;
      [key: string]: unknown;
    };
  }>;
}

export class WorkOrderTasksCreationError extends Error {
  readonly workOrderId: number;
  readonly originalError: unknown;

  constructor(workOrderId: number, originalError: unknown) {
    super('Work order was created, but its tasks could not be saved.');
    this.name = 'WorkOrderTasksCreationError';
    this.workOrderId = workOrderId;
    this.originalError = originalError;
  }
}

export const isWorkOrderTasksCreationError = (
  error: unknown
): error is WorkOrderTasksCreationError =>
  error instanceof WorkOrderTasksCreationError;

/** Creates a WO once, then attaches its optional task templates. */
export async function createWorkOrderWithTasks<T extends WorkOrderWithTasks>(
  workOrder: T,
  createWorkOrder: (payload: T) => Promise<T>,
  createTasks: (
    workOrderId: number,
    taskBases: Array<Record<string, unknown>>
  ) => Promise<unknown>
): Promise<T> {
  const createdWorkOrder = await createWorkOrder(workOrder);
  const taskBases =
    workOrder.tasks?.map(({ taskBase }) => ({
      ...taskBase,
      options: taskBase.options.map(({ label }) => label)
    })) ?? [];

  if (!taskBases.length) return createdWorkOrder;

  try {
    await createTasks(createdWorkOrder.id, taskBases);
  } catch (error) {
    throw new WorkOrderTasksCreationError(createdWorkOrder.id, error);
  }

  return createdWorkOrder;
}
