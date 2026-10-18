import { FilterField, SearchOperator } from '../models/page';

export type FilterFieldType = 'simple' | 'array' | 'date' | 'dateLessThan';

export const getEnumFilterStatuses = (
  filterFields: FilterField[],
  fieldName: string,
  options: string[]
): boolean[] => {
  const selectedValues =
    filterFields.find((filterField) => filterField.field === fieldName)
      ?.values ?? [];
  return options.map((option) => selectedValues.includes(option));
};

export const getLabelAndValue = <T extends { id: number }>(
  filterFields: FilterField[],
  minis: T[],
  fieldName: string,
  labelAccessor?: keyof T,
  formatter?: (value: T) => string
): { label: string; value: number }[] => {
  const selectedIds = filterFields.find(
    (filterField) => filterField.field === fieldName
  )?.values;
  if (!selectedIds?.length) return null;

  const optionsById = new Map(minis.map((mini) => [mini.id, mini]));
  return selectedIds.map((id) => {
    const option = optionsById.get(id);
    return {
      label: option
        ? formatter
          ? formatter(option)
          : option[labelAccessor].toString()
        : `#${id}`,
      value: id
    };
  });
};
export const getDateValue = (
  filterFields: FilterField[],
  fieldName: string
): [string, string] => {
  return [
    filterFields.find(
      (filterField) =>
        filterField.field === fieldName && filterField.operation === 'ge'
    )?.value ?? null,
    filterFields.find(
      (filterField) =>
        filterField.field === fieldName && filterField.operation === 'le'
    )?.value ?? null
  ];
};

export const filterSingleField = (
  filters: FilterField[],
  values: { [key: string]: { label: string; value: number }[] },
  accessor: string,
  fieldName: string,
  type: FilterFieldType,
  operator: SearchOperator = 'in'
): FilterField[] => {
  filters = filters.filter((filterField) => filterField.field !== fieldName);
  if (type === 'simple') {
    if (values[accessor] !== null)
      filters.push({
        field: fieldName,
        operation: 'eq',
        value: values[accessor]
      });
  } else if (type === 'array' && values[accessor]?.length) {
    const ids = values[accessor].map((element) => element.value);
    filters.push({
      field: fieldName,
      operation: operator,
      joinType: operator === 'inm' ? 'LEFT' : null,
      value: '',
      values: ids
    });
  } else if (type === 'date' && values[accessor]?.every((date) => !!date)) {
    const [start, end] = values[accessor];
    filters = [
      ...filters,
      {
        field: fieldName,
        operation: 'ge',
        value: start,
        enumName: 'JS_DATE'
      },
      { field: fieldName, operation: 'le', value: end, enumName: 'JS_DATE' }
    ];
  } else if (type === 'dateLessThan' && values[accessor]) {
    filters.push({
      field: fieldName,
      operation: 'le',
      value: values[accessor],
      enumName: 'JS_DATE'
    });
  }
  return filters;
};
