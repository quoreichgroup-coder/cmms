import { PermissionEntity, PermissionRoot } from '../models/owns/role';

const allPermissionEntities = Object.values(PermissionEntity);

const documentTemplatePermission = PermissionEntity.DOCUMENT_TEMPLATES;
const viewPermissionsExcluded = [
  PermissionEntity.SETTINGS,
  documentTemplatePermission
];
const editOtherPermissionsExcluded = [
  PermissionEntity.PEOPLE_AND_TEAMS,
  PermissionEntity.CATEGORIES,
  documentTemplatePermission
];
const createPermissionsExcluded = [
  PermissionEntity.PEOPLE_AND_TEAMS,
  PermissionEntity.CATEGORIES,
  documentTemplatePermission
];
const deleteOtherPermissionsExcluded = [
  PermissionEntity.WORK_ORDERS,
  PermissionEntity.PREVENTIVE_MAINTENANCES,
  PermissionEntity.LOCATIONS,
  PermissionEntity.ASSETS,
  PermissionEntity.PARTS_AND_MULTIPARTS,
  PermissionEntity.PURCHASE_ORDERS,
  PermissionEntity.METERS,
  PermissionEntity.VENDORS_AND_CUSTOMERS,
  PermissionEntity.CATEGORIES,
  PermissionEntity.FILES,
  PermissionEntity.PEOPLE_AND_TEAMS,
  documentTemplatePermission
];
const viewOtherPermissionsExcluded = [documentTemplatePermission];

export const defaultPermissions: Record<PermissionRoot, PermissionEntity[]> = {
  viewPermissions: allPermissionEntities.filter(
    (permission) => !viewPermissionsExcluded.includes(permission)
  ),
  editOtherPermissions: allPermissionEntities.filter(
    (permission) => !editOtherPermissionsExcluded.includes(permission)
  ),
  createPermissions: allPermissionEntities.filter(
    (permission) => !createPermissionsExcluded.includes(permission)
  ),
  viewOtherPermissions: allPermissionEntities.filter(
    (permission) => !viewOtherPermissionsExcluded.includes(permission)
  ),
  deleteOtherPermissions: allPermissionEntities.filter(
    (permission) => !deleteOtherPermissionsExcluded.includes(permission)
  )
};
