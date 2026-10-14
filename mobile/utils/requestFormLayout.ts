import { IField } from '../models/form';

type Translator = (key: string) => string;

const REQUEST_FIELD_SECTIONS = [
  {
    name: 'requestDetailsGroup',
    label: 'request_details',
    fields: ['title', 'description', 'audioDescription', 'priority', 'category']
  },
  {
    name: 'assetInformationGroup',
    label: 'asset_information',
    fields: ['location', 'asset']
  },
  {
    name: 'datesGroup',
    label: 'dates',
    fields: ['dueDate', 'estimatedStartDate', 'estimatedDuration']
  },
  {
    name: 'peopleGroup',
    label: 'people',
    fields: ['primaryUser', 'team']
  },
  {
    name: 'additionalInformationGroup',
    label: 'additional_information',
    fields: ['image', 'files']
  }
] as const;

/** Groups the configured request fields without restoring fields hidden by company settings. */
export const groupRequestFormFields = (
  fields: IField[],
  t: Translator
): IField[] => {
  const fieldsByName = new Map(fields.map((field) => [field.name, field]));
  const groupedFieldNames = new Set<string>();
  const result: IField[] = [];

  REQUEST_FIELD_SECTIONS.forEach((section) => {
    const sectionFields = section.fields
      .map((name) => fieldsByName.get(name))
      .filter((field): field is IField => Boolean(field));

    if (!sectionFields.length) return;

    result.push({
      name: section.name,
      type: 'titleGroupField',
      label: t(section.label)
    });
    result.push(...sectionFields);
    sectionFields.forEach((field) => groupedFieldNames.add(field.name));
  });

  const otherFields = fields.filter(
    (field) => !groupedFieldNames.has(field.name)
  );
  if (otherFields.length) {
    result.push({
      name: 'customFieldsGroup',
      type: 'titleGroupField',
      label: t('custom_fields')
    });
    result.push(...otherFields);
  }

  return result;
};
