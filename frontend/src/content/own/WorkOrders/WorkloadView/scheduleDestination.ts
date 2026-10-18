export interface WorkloadScheduleDestination {
  userId: number;
  dateStr: string;
}

export function getWorkloadDestination(
  droppableId: string
): WorkloadScheduleDestination | null {
  const match = /^user-(\d+)-(\d{4}-\d{2}-\d{2})$/.exec(droppableId);
  if (!match) return null;

  return { userId: Number(match[1]), dateStr: match[2] };
}
