/**
 * Prefills a meter PM reference from its latest reading while preserving values
 * that were saved previously or manually changed by the user.
 */
export const getAutoMeterReferenceValue = (
  currentValue: number | string | null | undefined,
  previousAutoValue: number | null,
  latestReading: number | undefined
): number | null => {
  const isBlank = currentValue === null || currentValue === undefined || currentValue === '';
  const isUnchangedAutoValue =
    previousAutoValue !== null && Number(currentValue) === previousAutoValue;

  return isBlank || isUnchangedAutoValue ? latestReading ?? 0 : null;
};

export const getLatestMeterReadingValue = (
  readings: Array<{ id: number; createdAt: string; value: number }>
): number | undefined => {
  const latest = [...readings].sort((a, b) => {
    const newestFirst =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return newestFirst || b.id - a.id;
  })[0];
  return latest?.value;
};
