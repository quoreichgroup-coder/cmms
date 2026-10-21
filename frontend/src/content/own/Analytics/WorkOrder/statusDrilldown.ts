import { SearchCriteria } from '../../../../models/owns/page';

export const ANALYTICS_WORK_ORDER_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'ON_HOLD'
] as const;

export type AnalyticsWorkOrderStatus =
  typeof ANALYTICS_WORK_ORDER_STATUSES[number];

export const buildStatusWorkOrderCriteria = (
  status: string,
  start: Date,
  end: Date,
  pageNum: number,
  pageSize: number,
  companyId?: number
): SearchCriteria | null => {
  if (
    !ANALYTICS_WORK_ORDER_STATUSES.includes(
      status as AnalyticsWorkOrderStatus
    ) ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start > end ||
    !Number.isInteger(pageNum) ||
    pageNum < 0 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1
  ) {
    return null;
  }

  const filterFields: SearchCriteria['filterFields'] = [
    {
      field: 'status',
      operation: 'eq',
      value: status,
      enumName: 'STATUS'
    },
    {
      field: 'createdAt',
      operation: 'ge',
      value: start.toISOString(),
      enumName: 'JS_DATE'
    },
    {
      field: 'createdAt',
      operation: 'le',
      value: end.toISOString(),
      enumName: 'JS_DATE'
    }
  ];

  if (companyId !== undefined) {
    if (!Number.isInteger(companyId) || companyId <= 0) return null;
    filterFields.push({
      field: 'company',
      operation: 'inm',
      joinType: 'LEFT',
      value: '',
      values: [companyId]
    });
  }

  return {
    filterFields,
    pageNum,
    pageSize,
    direction: 'DESC',
    sortField: 'updatedAt'
  };
};
