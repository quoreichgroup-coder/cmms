import { IField } from '../../type';

export const removeRelatedFieldIfPresent = (
  fields: IField[],
  fieldName: string
): IField[] => {
  const fieldIndex = fields.findIndex((field) => field.name === fieldName);
  return fieldIndex < 0
    ? fields
    : fields.filter((_, index) => index !== fieldIndex);
};
