type CopyableMaterial = { id?: number };

type CopyableOperation<TMaterial extends CopyableMaterial> = {
  id?: number;
  operationOrder: number;
  materials: TMaterial[];
};

type SearchablePart = { barcode?: string; name: string; description?: string };
type LaborWorkOperation = {
  duration: number | null;
  durationUnit: string;
  workers: number | null;
  workUnit: string;
};

export const nextOperationNumber = (
  existingNumbers: string[],
  start = 10,
  increment = 10
): string => {
  const used = new Set(existingNumbers.map((number) => number.trim().toLocaleLowerCase()));
  const numericNumbers = existingNumbers.filter((value) => /^\d+$/.test(value.trim())).map(Number)
    .filter((number) => Number.isFinite(number) && number >= 0);
  const safeIncrement = Number.isInteger(increment) && increment > 0 ? increment : 10;
  let candidate = numericNumbers.length ? Math.max(...numericNumbers) + safeIncrement : start;
  if (!Number.isInteger(candidate) || candidate < 1) candidate = 10;
  while (used.has(String(candidate).padStart(4, '0').toLocaleLowerCase())) candidate += safeIncrement;
  return String(candidate).padStart(4, '0');
};

export const supportsLaborWorkCalculation = (operation: LaborWorkOperation): boolean =>
  timeUnitInHours(operation.durationUnit) !== null
  && timeUnitInHours(operation.workUnit) !== null;

const timeUnitInHours = (unit: string): number | null => {
  switch (unit.trim().toLocaleUpperCase()) {
    case 'H':
    case 'HR':
    case 'HRS':
    case 'HOUR':
    case 'HOURS':
      return 1;
    case 'MIN':
    case 'MINS':
    case 'MINUTE':
    case 'MINUTES':
      return 1 / 60;
    case 'S':
    case 'SEC':
    case 'SECS':
    case 'SECOND':
    case 'SECONDS':
      return 1 / 3600;
    default:
      return null;
  }
};

export const calculateLaborWork = (operation: LaborWorkOperation): number | null => {
  if (!supportsLaborWorkCalculation(operation)
    || operation.duration === null || operation.workers === null
    || !Number.isFinite(operation.duration) || !Number.isFinite(operation.workers)
    || operation.duration <= 0 || operation.workers <= 0) return null;
  const durationInHours = timeUnitInHours(operation.durationUnit)!;
  const workUnitInHours = timeUnitInHours(operation.workUnit)!;
  return Number(((operation.duration * durationInHours / workUnitInHours) * operation.workers).toFixed(3));
};

export const filterPartsByQuery = <T extends SearchablePart>(parts: T[], searchTerm: string): T[] => {
  const query = searchTerm.trim().toLocaleLowerCase();
  if (!query) return parts;
  return parts.filter((part) => [part.barcode, part.name, part.description]
    .some((value) => (value ?? '').toLocaleLowerCase().includes(query)));
};

export const copyCounterOperations = <TMaterial extends CopyableMaterial, TOperation extends CopyableOperation<TMaterial>>(
  operations: TOperation[]
): TOperation[] => operations.map((operation, index) => ({
  ...operation,
  id: undefined,
  operationOrder: index,
  materials: operation.materials.map((material) => ({ ...material, id: undefined }))
}));
