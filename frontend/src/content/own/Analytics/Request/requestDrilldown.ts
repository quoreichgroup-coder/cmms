import { SearchCriteria } from '../../../../models/owns/page';
import { Filter } from './WOModal';

const SUPPORTED_FILTERS = new Set(['status', 'priority', 'category', 'range']);
const REQUEST_STATUSES = new Set(['PENDING', 'APPROVED', 'CANCELLED']);
const REQUEST_PRIORITIES = new Set(['NONE', 'LOW', 'MEDIUM', 'HIGH']);
const REQUEST_PRIORITY_SEARCH_VALUES: Record<string, string> = {
  NONE: 'None',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High'
};

export const buildRequestAnalyticsCriteria = (
  filters: Filter[],
  start: Date,
  end: Date,
  pageNum: number,
  pageSize: number,
  companyId?: number
): SearchCriteria | null => {
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start > end ||
    !Number.isInteger(pageNum) ||
    pageNum < 0 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    (companyId !== undefined &&
      (!Number.isInteger(companyId) || companyId <= 0))
  ) {
    return null;
  }

  const selected = filters.filter((filter) =>
    SUPPORTED_FILTERS.has(filter.key)
  );
  if (selected.length !== filters.length || selected.length === 0) return null;

  const filterFields: SearchCriteria['filterFields'] = [
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

  for (const filter of selected) {
    if (filter.key === 'status') {
      if (
        typeof filter.value !== 'string' ||
        !REQUEST_STATUSES.has(filter.value)
      )
        return null;
      filterFields.push({
        field: 'status',
        operation: 'in',
        value: '',
        values: [filter.value]
      });
    } else if (filter.key === 'priority') {
      if (
        typeof filter.value !== 'string' ||
        !REQUEST_PRIORITIES.has(filter.value)
      )
        return null;
      filterFields.push({
        field: 'priority',
        operation: 'in',
        value: '',
        values: [REQUEST_PRIORITY_SEARCH_VALUES[filter.value]],
        enumName: 'PRIORITY'
      });
    } else if (filter.key === 'category') {
      const categoryId = Number(filter.value);
      if (!Number.isInteger(categoryId) || categoryId <= 0) return null;
      filterFields.push({
        field: 'category',
        operation: 'eq',
        value: categoryId
      });
    } else if (filter.key === 'range') {
      if (typeof filter.value !== 'string') return null;
      const rangeStart = new Date(filter.value);
      if (!Number.isFinite(rangeStart.getTime())) return null;
      rangeStart.setUTCHours(0, 0, 0, 0);
      const rangeEnd = new Date(rangeStart);
      rangeEnd.setUTCHours(23, 59, 59, 999);
      filterFields.push(
        {
          field: 'createdAt',
          operation: 'ge',
          value: rangeStart.toISOString(),
          enumName: 'JS_DATE'
        },
        {
          field: 'createdAt',
          operation: 'le',
          value: rangeEnd.toISOString(),
          enumName: 'JS_DATE'
        }
      );
    }
  }

  if (companyId !== undefined) {
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
    sortField: 'createdAt'
  };
};
