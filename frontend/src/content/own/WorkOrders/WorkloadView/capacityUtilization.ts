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

  return (allocatedMinutes / capacityMinutes) * 100;
};

export type CapacityBalance =
  | { kind: 'unavailable' }
  | { kind: 'remaining' | 'over'; hours: number; minutes: number };

export const getCapacityBalance = (
  allocatedMinutes: number,
  capacityMinutes: number
): CapacityBalance => {
  if (
    !Number.isFinite(allocatedMinutes) ||
    !Number.isFinite(capacityMinutes) ||
    allocatedMinutes < 0 ||
    capacityMinutes <= 0
  ) {
    return { kind: 'unavailable' };
  }

  const difference = Math.round(Math.abs(capacityMinutes - allocatedMinutes));
  return {
    kind: allocatedMinutes > capacityMinutes ? 'over' : 'remaining',
    hours: Math.floor(difference / 60),
    minutes: difference % 60
  };
};
