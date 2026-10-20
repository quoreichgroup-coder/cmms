import { PaginationState } from '@tanstack/react-table';

interface PersistedTableState {
  pagination?: Partial<PaginationState>;
  pageSize?: unknown;
}

export interface RestoredTableState {
  sorting: { id: string; desc: boolean }[];
  pagination: PaginationState;
  columnOrder: string[];
  columnSizing: Record<string, number>;
  columnVisibility: Record<string, boolean>;
  pinnedColumns: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

export const restorePaginationState = (
  persistedState: unknown,
  initialPagination: PaginationState,
  persistPageIndex: boolean
): PaginationState => {
  const saved =
    persistedState && typeof persistedState === 'object'
      ? (persistedState as PersistedTableState)
      : {};
  const savedPagination =
    saved.pagination && typeof saved.pagination === 'object'
      ? saved.pagination
      : undefined;
  const savedPageSize = savedPagination?.pageSize ?? saved.pageSize;
  const savedPageIndex = savedPagination?.pageIndex;

  return {
    pageIndex:
      persistPageIndex && isNonNegativeInteger(savedPageIndex)
        ? savedPageIndex
        : initialPagination.pageIndex,
    pageSize: isPositiveInteger(savedPageSize)
      ? savedPageSize
      : initialPagination.pageSize
  };
};

export const restoreTableState = (
  persistedState: unknown,
  initialPagination: PaginationState,
  persistPageIndex: boolean
): RestoredTableState => {
  const state = isRecord(persistedState) ? persistedState : {};
  const sorting = Array.isArray(state.sorting)
    ? state.sorting.filter(
        (sort): sort is { id: string; desc: boolean } =>
          isRecord(sort) &&
          typeof sort.id === 'string' &&
          typeof sort.desc === 'boolean'
      )
    : [];
  const columnOrder = Array.isArray(state.columnOrder)
    ? state.columnOrder.filter((id): id is string => typeof id === 'string')
    : [];
  const columnSizing = isRecord(state.columnSizing)
    ? Object.fromEntries(
        Object.entries(state.columnSizing).filter(
          (entry): entry is [string, number] =>
            typeof entry[1] === 'number' &&
            Number.isFinite(entry[1]) &&
            entry[1] > 0
        )
      )
    : {};
  const columnVisibility = isRecord(state.columnVisibility)
    ? Object.fromEntries(
        Object.entries(state.columnVisibility).filter(
          (entry): entry is [string, boolean] => typeof entry[1] === 'boolean'
        )
      )
    : {};
  const pinnedColumns = Array.isArray(state.pinnedColumns)
    ? state.pinnedColumns.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    sorting,
    pagination: restorePaginationState(
      state,
      initialPagination,
      persistPageIndex
    ),
    columnOrder,
    columnSizing,
    columnVisibility,
    pinnedColumns
  };
};
