import { PermissionEntity } from '../models/role';

interface ReopenAccessContext {
  status?: string;
  roleType?: string;
  superAccountRelationCount?: number;
  editOtherPermissions?: PermissionEntity[];
}

/** UI affordance only; the API remains authoritative for reopening access. */
export const canReopenCompletedWorkOrder = ({
  status,
  roleType,
  superAccountRelationCount,
  editOtherPermissions
}: ReopenAccessContext): boolean =>
  status === 'COMPLETE' &&
  roleType === 'ROLE_CLIENT' &&
  superAccountRelationCount === 0 &&
  Boolean(editOtherPermissions?.includes(PermissionEntity.REOPEN_WORK_ORDERS));
