export type MaintenanceTaskListOption = {
  id: number;
  groupCode: string;
  groupCounter: string;
  description: string;
  taskListType: string;
  assetId: number | null;
  locationId: number | null;
  status: string;
  validFrom?: string | null;
  validTo?: string | null;
};

export type MaintenancePlanTaskListTarget = {
  assetId: number | null;
  assetLocationId: number | null;
  locationId: number | null;
  today: string;
};

export function getCompatibleMaintenanceTaskLists(
  taskLists: MaintenanceTaskListOption[],
  target: MaintenancePlanTaskListTarget
): MaintenanceTaskListOption[] {
  return taskLists.filter((item) => {
    if (item.status !== 'ACTIVE') return false;
    if ((item.validFrom && item.validFrom > target.today)
      || (item.validTo && item.validTo < target.today)) return false;

    switch (item.taskListType?.toUpperCase()) {
      case 'GENERAL':
        return true;
      case 'EQUIPMENT':
        return Boolean(target.assetId && item.assetId === target.assetId);
      case 'FUNCTIONAL_LOCATION':
        return Boolean((target.locationId && item.locationId === target.locationId)
          || (target.assetLocationId && item.locationId === target.assetLocationId));
      default:
        return false;
    }
  });
}
