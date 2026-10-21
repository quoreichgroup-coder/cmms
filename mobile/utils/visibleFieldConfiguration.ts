type NamedField = { name: string };
type NamedConfiguration = { fieldName: string; fieldType: string };

const EMPTY_WORK_ORDER_FIELD_CONFIGURATIONS = Object.freeze(
  []
) as unknown as never[];

export const getWorkOrderFieldConfigurations = <TConfiguration>(
  configuration:
    | { workOrderFieldConfigurations?: TConfiguration[] | null }
    | null
    | undefined
): TConfiguration[] =>
  Array.isArray(configuration?.workOrderFieldConfigurations)
    ? configuration.workOrderFieldConfigurations
    : EMPTY_WORK_ORDER_FIELD_CONFIGURATIONS;

/** Resolve a business rule only when its field is still visible and configured. */
export const findVisibleFieldConfiguration = <
  TField extends NamedField,
  TConfig extends NamedConfiguration
>(
  fields: TField[],
  fieldName: string,
  configurations: TConfig[] | null | undefined,
  configurationFieldName = fieldName
): { fieldIndex: number; configuration: TConfig } | null => {
  if (!Array.isArray(configurations)) return null;

  const configuration = configurations.find(
    (item) => item.fieldName === configurationFieldName
  );
  if (!configuration) return null;

  const fieldIndex = fields.findIndex((field) => field.name === fieldName);
  if (fieldIndex < 0) return null;

  return { fieldIndex, configuration };
};
