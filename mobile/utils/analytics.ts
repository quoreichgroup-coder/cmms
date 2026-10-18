/** Default to all recorded history, matching the existing mobile reports. */
export const getReportDateRange = () => ({
  start: new Date(0).toISOString(),
  end: new Date().toISOString(),
  filterFields: []
});

/** Avoid presenting the API's empty-period fallback (1.0) as a real 100% rate. */
export const formatComplianceRateDisplay = (
  rate: number,
  completedWorkOrderCount: number
) => {
  if (
    completedWorkOrderCount <= 0 ||
    !Number.isFinite(completedWorkOrderCount) ||
    !Number.isFinite(rate)
  ) {
    return '—';
  }

  return `${(rate * 100).toFixed(2)}%`;
};

/** Keep dashboard work-order analytics inside the user's existing view scope. */
export const getDashboardWorkOrderScope = (
  canViewWorkOrders: boolean,
  canViewOtherWorkOrders: boolean,
  assignedPreference?: boolean | null
): boolean | null => {
  if (!canViewWorkOrders) return null;
  if (!canViewOtherWorkOrders) return true;
  if (assignedPreference == null) return null;
  return Boolean(assignedPreference);
};

/** Only open dashboard work-order cards when their list filter is safe to build. */
export const canNavigateDashboardWorkOrders = (
  assignedToMe: boolean | null,
  userId?: number | string | null
): boolean => assignedToMe !== null && (!assignedToMe || userId != null);

export const withDashboardWorkOrderScope = <Filter extends object>(
  filters: Filter[],
  assignedToMe: boolean,
  userId?: number | string | null
): Filter[] => {
  if (!assignedToMe || userId == null) return filters;
  return [
    ...filters,
    {
      field: 'assignedToUser',
      operation: 'eq',
      value: userId
    } as Filter
  ];
};
