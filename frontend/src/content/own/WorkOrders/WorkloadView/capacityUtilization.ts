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

export const getWorkdayWindow = (
  startTime: string,
  capacityMinutes: number
): { start: string; end: string; endsNextDay: boolean } | null => {
  const match = /^(?:([01]\d|2[0-3])):([0-5]\d)$/.exec(startTime);
  if (!match || !Number.isFinite(capacityMinutes) || capacityMinutes <= 0) {
    return null;
  }

  const startMinutes = Number(match[1]) * 60 + Number(match[2]);
  const absoluteEndMinutes = startMinutes + Math.round(capacityMinutes);
  const endMinutes = absoluteEndMinutes % (24 * 60);
  const formatTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
      minutes % 60
    ).padStart(2, '0')}`;

  return {
    start: formatTime(startMinutes),
    end: formatTime(endMinutes),
    endsNextDay: absoluteEndMinutes >= 24 * 60
  };
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
