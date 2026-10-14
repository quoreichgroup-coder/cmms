/** Do not expose cached work orders when the current role lacks WO view access. */
export function getVisibleAssetWorkOrders<T>(
  canViewWorkOrders: boolean,
  workOrders?: T[] | null
): T[] {
  return canViewWorkOrders ? workOrders ?? [] : [];
}
