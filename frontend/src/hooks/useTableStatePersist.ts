import { useCallback, useEffect, useRef } from 'react';
import {
  SortingState,
  ColumnOrderState,
  ColumnSizingState,
  VisibilityState,
  PaginationState
} from '@tanstack/react-table';
import {
  readBrowserPreference,
  writeBrowserPreference
} from '../utils/safeBrowserStorage';

interface TableState {
  sorting?: SortingState;
  columnOrder?: ColumnOrderState;
  columnSizing?: ColumnSizingState;
  columnVisibility?: VisibilityState;
  pagination?: PaginationState;
  pageSize?: number;
  pinnedColumns?: string[];
}

interface UseTableStatePersistProps {
  prefix: string;
  sorting?: SortingState;
  columnOrder?: ColumnOrderState;
  columnSizing?: ColumnSizingState;
  columnVisibility?: VisibilityState;
  pagination?: PaginationState;
  pinnedColumns?: string[];
  persistPageIndex?: boolean;
}

const useTableStatePersist = ({
  prefix,
  sorting,
  columnOrder,
  columnSizing,
  columnVisibility,
  pagination,
  pinnedColumns,
  persistPageIndex = false
}: UseTableStatePersistProps) => {
  const stateItem = `${prefix}TableState`;
  const isInitialMountRef = useRef(true);

  const saveSnapshot = useCallback(() => {
    const currentState: TableState = {};

    if (sorting !== undefined) {
      currentState.sorting = sorting;
    }
    if (columnOrder !== undefined) {
      currentState.columnOrder = columnOrder;
    }
    if (columnSizing !== undefined) {
      currentState.columnSizing = columnSizing;
    }
    if (columnVisibility !== undefined) {
      currentState.columnVisibility = columnVisibility;
    }
    if (pagination !== undefined) {
      // If persistPageIndex is false, only save pageSize, not pageIndex
      if (persistPageIndex) {
        currentState.pagination = pagination;
      } else {
        currentState.pageSize = pagination.pageSize;
      }
    }
    if (pinnedColumns !== undefined) {
      currentState.pinnedColumns = pinnedColumns;
    }

    writeBrowserPreference(stateItem, JSON.stringify(currentState));
  }, [
    stateItem,
    sorting,
    columnOrder,
    columnSizing,
    columnVisibility,
    pagination,
    pinnedColumns,
    persistPageIndex
  ]);

  // Save state whenever it changes (after initial mount)
  useEffect(() => {
    if (!isInitialMountRef.current) {
      saveSnapshot();
    }
  }, [saveSnapshot]);

  // Mark initial mount as complete
  useEffect(() => {
    isInitialMountRef.current = false;
  }, []);

  // Save state on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveSnapshot();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveSnapshot();
    };
  }, [saveSnapshot]);

  // Restore state from localStorage
  useEffect(() => {
    const savedState = readBrowserPreference(stateItem);
    if (!savedState) return;

    try {
      const state: TableState = JSON.parse(savedState);

      // Note: The actual state restoration is handled by the parent component
      // This hook primarily handles persistence
      console.log('Restored table state from localStorage:', {
        ...state,
        pinnedColumns: state.pinnedColumns || []
      });
    } catch (_error) {
      // A stale preference should not affect table rendering.
    }
  }, [stateItem]);

  return { saveSnapshot };
};

export default useTableStatePersist;
