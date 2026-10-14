export interface FileUploadAccessRequirements {
  hasFilePermission: boolean;
  hasFileFeature: boolean;
  hasFileEntitlement: boolean;
}

export const canUploadFiles = ({
  hasFilePermission,
  hasFileFeature,
  hasFileEntitlement
}: FileUploadAccessRequirements): boolean =>
  hasFilePermission && hasFileFeature && hasFileEntitlement;
