/**
 * A failed identifier lookup is not evidence that an asset is absent unless
 * the API explicitly returned 404. Creation is still gated by the caller's
 * existing asset-create permission.
 */
export const shouldOfferAssetCreationAfterScan = (
  status: unknown,
  hasCreatePermission: boolean
): boolean => status === 404 && hasCreatePermission;
