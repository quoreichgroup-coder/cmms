import * as Yup from 'yup';

type Translate = (key: string) => string;

/** Keep manual hours/minutes aligned with the whole-minute precision accepted by labor records. */
export const createManualLaborDurationFields = (t: Translate) => ({
  hours: Yup.number()
    .transform((value, originalValue) =>
      originalValue === '' ? undefined : value
    )
    .typeError(t('invalid_number_value'))
    .integer(t('whole_non_negative_number'))
    .min(0, t('whole_non_negative_number'))
    .required(t('required_hours')),
  minutes: Yup.number()
    .transform((value, originalValue) =>
      originalValue === '' ? undefined : value
    )
    .typeError(t('invalid_number_value'))
    .integer(t('whole_non_negative_number'))
    .min(0, t('whole_non_negative_number'))
    .required(t('required_minutes'))
});
