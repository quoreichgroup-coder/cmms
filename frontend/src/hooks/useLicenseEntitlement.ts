import { useSelector } from '../store';
import {
  CATALOG_MODULE_ENTITLEMENTS,
  LicenseEntitlement,
  LicensingState
} from '../models/owns/license';

export const useLicenseEntitlement = (entitlement: LicenseEntitlement) => {
  const licensingState = useSelector((state) => state.license.state);

  return hasLicenseEntitlement(licensingState, entitlement);
};

/** Same rule as LicenseService.hasEntitlement on the API (the API stays the authority). */
export const hasLicenseEntitlement = (
  license: LicensingState | null | undefined,
  entitlement: LicenseEntitlement
) => {
  if (
    CATALOG_MODULE_ENTITLEMENTS.includes(entitlement) &&
    (!license?.hasLicense || (license?.catalogVersion ?? 1) < 2)
  ) {
    return true;
  }
  return Boolean(license?.valid && license.entitlements?.some((e) => e === entitlement));
};
