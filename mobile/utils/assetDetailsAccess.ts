export type AssetDetailsActionPermissions = {
  canEditAsset: boolean;
  canCreateWorkOrder: boolean;
  canCreateChildAsset: boolean;
  canDeleteAsset: boolean;
};

export const getAssetDetailsActionVisibility = (
  permissions: AssetDetailsActionPermissions
) => ({
  ...permissions,
  hasAnyAction: Object.values(permissions).some(Boolean)
});
