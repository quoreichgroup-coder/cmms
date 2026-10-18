import { PaginationState } from '@tanstack/react-table';

interface PersistedTableState {
  pagination?: Partial<PaginationState>;
  pageSize?: unknown;
}

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
