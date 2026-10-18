import {
  FilterField,
  SearchCriteria,
  SearchOperator
} from '../models/owns/page';

export const buildFirstPageSearchCriteria = (
  criteria: SearchCriteria,
  query: string,
  fieldsToSearch: string[]
): SearchCriteria => {
  const [primaryField, ...alternativeFields] = fieldsToSearch;
  const filterFields: FilterField[] = criteria.filterFields.filter(
    (filterField) => !fieldsToSearch.includes(filterField.field)
  );

  if (query && primaryField) {
    filterFields.push({
      field: primaryField,
      value: query,
      operation: 'cn' as SearchOperator,
      alternatives: alternativeFields.map((field) => ({
        field,
        operation: 'cn' as SearchOperator,
        value: query
      }))
    });
  }

  return {
    ...criteria,
    filterFields,
    pageNum: 0
  };
};
