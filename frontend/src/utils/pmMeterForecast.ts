export interface DatedMeterReading {
  id: number;
  value: number;
  createdAt: string;
}

/**
 * Estimates when a future meter target may be reached using up to the five
 * latest readings. Returns no date when the history is insufficient,
 * inconsistent, or does not show positive usage.
 */
export const estimateMeterTargetDate = (
  readings: DatedMeterReading[],
  targetValue: number
): Date | undefined => {
  const ordered = readings
    .filter(
      (reading) =>
        Number.isFinite(Number(reading.value)) &&
        Number.isFinite(new Date(reading.createdAt).getTime())
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.id - b.id
    )
    .slice(-5);

  if (ordered.length < 2 || !Number.isFinite(targetValue)) return undefined;

  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const firstTime = new Date(first.createdAt).getTime();
  const lastTime = new Date(last.createdAt).getTime();
  const elapsed = lastTime - firstTime;
  const usage = Number(last.value) - Number(first.value);

  if (elapsed <= 0 || usage <= 0 || targetValue <= Number(last.value)) {
    return undefined;
  }

  // A decreasing counter or reset makes a linear projection unreliable.
  if (
    ordered.some(
      (reading, index) =>
        index > 0 && Number(reading.value) < Number(ordered[index - 1].value)
    )
  )
    return undefined;

  const usagePerMillisecond = usage / elapsed;
  const projectedTime =
    lastTime + (targetValue - Number(last.value)) / usagePerMillisecond;
  return Number.isFinite(projectedTime) ? new Date(projectedTime) : undefined;
};
