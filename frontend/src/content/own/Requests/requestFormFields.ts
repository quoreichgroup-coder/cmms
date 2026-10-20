import type { FieldConfiguration } from 'src/models/owns/fieldConfiguration';
import type { IField } from 'src/content/own/type';

export const findVisibleRequestFieldConfiguration = (
  fields: IField[],
  configurations: FieldConfiguration[] | undefined,
  fieldName: string
) => {
  const fieldIndex = fields.findIndex((field) => field.name === fieldName);
  if (fieldIndex < 0) return null;

  const configuration = configurations?.find(
    (fieldConfiguration) => fieldConfiguration.fieldName === fieldName
  );
  if (!configuration) return null;

  return { fieldIndex, field: fields[fieldIndex], configuration };
};
