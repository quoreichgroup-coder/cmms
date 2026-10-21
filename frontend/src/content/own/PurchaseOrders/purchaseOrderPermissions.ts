import { PermissionEntity, Role } from '../../../models/owns/role';

/** Mirrors the purchase-order response endpoint's authorization predicate. */
export function canRespondToPurchaseOrders(role?: Role | null): boolean {
  return (
    role?.roleType === 'ROLE_CLIENT' &&
    role.editOtherPermissions.includes(PermissionEntity.PURCHASE_ORDERS)
  );
}
