import isEqual from 'lodash/isEqual';
import { FilterField } from '../models/page';

export type LoadedSearchCriteria = {
  filterFields: FilterField[];
  searchQuery: string;
};

/** True only when visible rows came from the current filters and search text. */
export const hasFreshSearchResults = (
  loaded: LoadedSearchCriteria | null,
  filterFields: FilterField[],
  searchQuery: string
): boolean =>
  loaded !== null &&
  isEqual(loaded.filterFields, filterFields) &&
  loaded.searchQuery === searchQuery;
