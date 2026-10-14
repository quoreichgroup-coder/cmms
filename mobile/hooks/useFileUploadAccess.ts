import { PermissionEntity } from '../models/role';
import { PlanFeature } from '../models/subscriptionPlan';
import useAuth from './useAuth';
import { useLicenseEntitlement } from './useLicenseEntitlement';
import { canUploadFiles } from '../utils/fileUploadAccess';

export const useFileUploadAccess = () => {
  const { hasCreatePermission, hasFeature } = useAuth();
  const hasFilePermission = hasCreatePermission(PermissionEntity.FILES);
  const hasFileFeature = hasFeature(PlanFeature.FILE);
  const hasFileEntitlement = useLicenseEntitlement('FILE_ATTACHMENTS');

  return {
    canUpload: canUploadFiles({
      hasFilePermission,
      hasFileFeature,
      hasFileEntitlement
    }),
    hasFileEntitlement
  };
};
