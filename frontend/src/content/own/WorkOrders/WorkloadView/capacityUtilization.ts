export const getCapacityUtilizationPercent = (
  allocatedMinutes: number,
  capacityMinutes: number
): number | null => {
  if (
    !Number.isFinite(allocatedMinutes) ||
    !Number.isFinite(capacityMinutes) ||
    allocatedMinutes < 0 ||
    capacityMinutes <= 0
  ) {
    return null;
  }

  return Math.round((allocatedMinutes / capacityMinutes) * 100);
};
