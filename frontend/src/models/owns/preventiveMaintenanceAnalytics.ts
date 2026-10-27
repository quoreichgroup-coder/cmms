export interface PreventiveMaintenanceCallAnalyticsDTO {
  status: string;
  callType: 'CALENDAR' | 'METER';
  count: number;
}

export const preventiveMaintenanceCallStatuses = [
  'PLANNED',
  'DUE',
  'RESCHEDULED',
  'GENERATED',
  'COMPLETED',
  'IGNORED'
] as const;

export const toPreventiveMaintenanceCallChartRows = (
  items: PreventiveMaintenanceCallAnalyticsDTO[]
) =>
  preventiveMaintenanceCallStatuses.map((status) => {
    const matching = items.filter((item) => item.status === status);
    return {
      status,
      CALENDAR: matching
        .filter((item) => item.callType === 'CALENDAR')
        .reduce((sum, item) => sum + item.count, 0),
      METER: matching
        .filter((item) => item.callType === 'METER')
        .reduce((sum, item) => sum + item.count, 0)
    };
  });
