import type WorkOrder from '../../../../models/owns/workOrder';

const HOURS_PER_UNIT: Record<string, number> = {
  H: 1,
  HR: 1,
  HOUR: 1,
  HOURS: 1,
  MIN: 1 / 60,
  MINUTE: 1 / 60,
  MINUTES: 1 / 60,
  S: 1 / 3600,
  SEC: 1 / 3600,
  SECOND: 1 / 3600,
  SECONDS: 1 / 3600
};

export const plannedLaborHours = (workOrder: WorkOrder): number | null => {
  const operations = workOrder.plannedOperations ?? [];
  if (!operations.length) return null;
  const converted = operations.map((operation) => {
    if (operation.plannedWork == null || !operation.workUnit) return null;
    const factor = HOURS_PER_UNIT[operation.workUnit.trim().toUpperCase()];
    return factor == null ? null : operation.plannedWork * factor;
  });
  return converted.every((value) => value !== null)
    ? converted.reduce<number>((total, value) => total + (value ?? 0), 0)
    : null;
};

/** Returns a complete material estimate only when every planned material has a unit cost. */
export const plannedMaterialCost = (workOrder: WorkOrder): number | null => {
  const materials = (workOrder.plannedOperations ?? [])
    .flatMap((operation) => operation.materials ?? []);
  if (!materials.length || materials.some((material) =>
    material.quantity == null || material.estimatedUnitCost == null
  )) return null;

  return materials.reduce(
    (total, material) => total + material.quantity! * material.estimatedUnitCost!,
    0
  );
};

export const workCenters = (workOrder: WorkOrder): string => Array.from(new Set(
  (workOrder.plannedOperations ?? []).map((operation) => operation.workCenter?.trim()).filter(Boolean)
)).join(', ');
