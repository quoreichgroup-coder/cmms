export interface WorkloadScheduleDestination {
  userId: number;
  dateStr: string;
}

export function getWorkloadDestination(
  droppableId: string
): WorkloadScheduleDestination | null {
  const match = /^user-(\d+)-(\d{4}-\d{2}-\d{2})$/.exec(droppableId);
  if (!match) return null;

  const userId = Number(match[1]);
  const dateStr = match[2];
  const parsedDate = new Date(`${dateStr}T00:00:00.000Z`);
  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== dateStr
  ) {
    return null;
  }

  return { userId, dateStr };
}
