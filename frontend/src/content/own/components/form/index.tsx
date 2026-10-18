import {
  Box,
  Alert,
  Button,
  CircularProgress,
  Grid,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import { Formik, FormikProps } from 'formik';
import { useFormikContext } from 'formik';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FormikErrorFocus from 'formik-error-focus';
import * as Yup from 'yup';
import { ObjectSchema } from 'yup';
import { IField, IHash } from '../../type';
import CheckBoxForm from './CheckBoxForm';
import Field from './Field';
import FileUpload from '../FileUpload';
import DateTimePicker from '@mui/lab/DateTimePicker';
import CustomSwitch from './CustomSwitch';
import SelectMapCoordinates from './SelectMapCoordinates';
import SelectPartQuantities from './SelectPartQuantities';
import useAuth from '../../../../hooks/useAuth';
import { CustomSelect } from './CustomSelect2';
import SignaturePad from './SignaturePad';
import DateRangePicker from './DateRangePicker';

interface PropsType {
  fields: Array<IField>;
  values?: IHash<any>;
  onSubmit?: (values: IHash<any>) => Promise<any>;
  onCanceled?: () => void;
  onChange?: any;
  submitText?: string;
  validation?: ObjectSchema<any>;
  isLoading?: boolean;
  isButtonEnabled?: (values: IHash<any>, ...props: any[]) => boolean;
  enableReinitialize?: boolean;
  stickyActions?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  nextToButton?: React.ReactNode;
  renderValues?: (
    values: IHash<any>,
    setFieldValue: (field: string, value: any) => void
  ) => React.ReactNode;
}

const flattenFormikErrors = (
  errors: unknown,
  path = ''
): Array<{ path: string; message: string }> => {
  if (typeof errors === 'string' || typeof errors === 'number') {
    return [{ path, message: String(errors) }];
  }
  if (Array.isArray(errors)) {
    return errors.flatMap((error, index) =>
      flattenFormikErrors(error, path ? `${path}[${index}]` : String(index))
    );
  }
  if (errors && typeof errors === 'object') {
    return Object.entries(errors).flatMap(([key, error]) =>
      flattenFormikErrors(error, path ? `${path}.${key}` : key)
    );
  }
  return [];
};

const FormikDirtyObserver = ({
  onDirtyChange
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) => {
  const { dirty } = useFormikContext();

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  return null;
};

export default (props: PropsType) => {
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const shape: IHash<any> = {};
  const {
    companySettings: { generalPreferences }
  } = useAuth();

  props.fields.forEach((f) => {
    shape[f.name] = Yup.string();
    if (f.required) {
      shape[f.name] = shape[f.name].required();
    }
  });

  const validationSchema = Yup.object().shape(shape);

  const handleChange = (formik: FormikProps<IHash<any>>, field: string, e) => {
    const isChangeEvent = Boolean(e && typeof e === 'object' && 'target' in e);
    const value = isChangeEvent
      ? e.target.type === 'checkbox'
        ? e.target.checked
        : e.target.value
      : e;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    props.onChange && props.onChange({ field, e: value });
    if (props.fields.length == 1) {
      formik.setFieldTouched(field, true);
    }
    if (isChangeEvent) {
      formik.handleChange(e);
      return;
    }
    formik.setFieldValue(field, value);
  };

  const handleKeyDown =
    (formik: FormikProps<IHash<any>>, multiple: boolean) =>
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !multiple) {
        e.preventDefault();
        formik.handleSubmit();
      }
    };

  const filterRelatedFields = (fields: IField[], formik): IField[] => {
    const fieldsClone = [...fields];
    const withRelatedFields = fields.filter(
      (field) => field.relatedFields?.length
    );
    withRelatedFields.forEach(({ relatedFields, name, type }) => {
      relatedFields.forEach((relatedField) => {
        if (
          formik.values[name] === relatedField.value ||
          formik.values[name]?.value === relatedField.value ||
          (type === 'switch' &&
            formik.values[name] &&
            (formik.values[name][0] === 'on') === relatedField.value) ||
          (formik.values[name] === undefined && !relatedField.value)
        ) {
          if (relatedField.hide) {
            const fieldToDeleteIndex = fieldsClone.findIndex(
              (field) => field.name === relatedField.field
            );
            fieldsClone.splice(fieldToDeleteIndex, 1);
          }
        }
      });
    });
    return fieldsClone;
  };
  return (
    <>
      <Formik<IHash<any>>
        validationSchema={props.validation || validationSchema}
        validateOnChange={false}
        validateOnBlur={false}
        initialValues={props.values || {}}
        enableReinitialize={props.enableReinitialize}
        onSubmit={(
          values,
          { resetForm, setErrors, setStatus, setSubmitting }
        ) => {
          setSubmitting(true);
          props.onSubmit(values).finally(() => {
            // resetForm();
            setStatus({ success: true });
            setSubmitting(false);
          });
        }}
      >
        {(formik) => (
          <Box component="form" noValidate onSubmit={formik.handleSubmit}>
            <FormikDirtyObserver onDirtyChange={props.onDirtyChange} />
            <Grid container spacing={2}>
              {filterRelatedFields(props.fields, formik).map((field, index) => {
                const needsContainerFocus = [
                  'file',
                  'coordinates',
                  'partQuantity',
                  'signature',
                  'groupCheckbox'
                ].includes(field.type);
                return (
                  <Grid
                    item
                    xs={12}
                    lg={field.midWidth ? 6 : 12}
                    key={field.name}
                    data-error-key={
                      needsContainerFocus ? field.name : undefined
                    }
                    tabIndex={needsContainerFocus ? -1 : undefined}
                    sx={
                      needsContainerFocus
                        ? {
                            '&:focus': {
                              outline: `2px solid ${theme.palette.primary.main}`,
                              outlineOffset: 2,
                              borderRadius: 1
                            }
                          }
                        : undefined
                    }
                  >
                    {field.type === 'select' ? (
                      <CustomSelect field={field} handleChange={handleChange} />
                    ) : field.type === 'checkbox' ? (
                      <CheckBoxForm
                        label={field.label}
                        name={field.name}
                        onChange={(e) => {
                          handleChange(formik, field.name, e.target.checked);
                        }}
                        checked={formik.values[field.name]}
                      />
                    ) : field.type === 'groupCheckbox' ? (
                      <CheckBoxForm
                        label={field.label}
                        type="groupCheckbox"
                        listCheckbox={field.items}
                        key={field.name}
                      />
                    ) : field.type === 'switch' ? (
                      <CustomSwitch
                        title={field.label}
                        description={field.helperText}
                        name={field.name}
                        handleChange={formik.handleChange}
                        checked={formik.values[field.name]}
                      />
                    ) : field.type === 'titleGroupField' ? (
                      <Typography variant="h3" sx={{ pb: 1 }}>
                        {t(`${field.label}`)}
                      </Typography>
                    ) : field.type === 'file' ? (
                      <Box>
                        <FileUpload
                          multiple={field.multiple}
                          title={field.label}
                          type={field.fileType || 'file'}
                          description={t('upload')}
                          files={
                            Array.isArray(formik.values[field.name])
                              ? formik.values[field.name]
                              : formik.values[field.name]
                              ? [formik.values[field.name]]
                              : []
                          }
                          onDrop={(files) => {
                            formik.setFieldValue(field.name, files);
                          }}
                          error={formik.errors[field.name] || field.error}
                        />
                      </Box>
                    ) : field.type === 'date' ? (
                      <Box>
                        <Box pb={1}>
                          <b>{field.label}:</b>
                        </Box>
                        <DateTimePicker
                          value={formik.values[field.name] ?? null}
                          onChange={(newValue) => {
                            handleChange(formik, field.name, newValue);
                          }}
                          inputFormat={
                            generalPreferences.dateFormat === 'MMDDYY'
                              ? 'MM/dd/yyyy HH:mm'
                              : 'dd/MM/yyyy HH:mm'
                          }
                          ampm={false}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              name={field.name}
                              fullWidth
                              placeholder={t('select_date')}
                              required={field?.required}
                              error={!!formik.errors[field.name] || field.error}
                              helperText={
                                typeof formik.errors[field.name] === 'string'
                                  ? (formik.errors[field.name] as string)
                                  : ''
                              }
                            />
                          )}
                        />
                      </Box>
                    ) : field.type === 'dateRange' ? (
                      <Box>
                        <Box pb={1}>
                          <b>{field.label}:</b>
                        </Box>
                        <DateRangePicker
                          value={formik.values[field.name]}
                          name={field.name}
                          onChange={(range) => {
                            handleChange(formik, field.name, range);
                          }}
                          fullWidth
                          placeholder={t('select_date_range')}
                          required={field?.required}
                          error={!!formik.errors[field.name] || field.error}
                          helperText={
                            typeof formik.errors[field.name] === 'string'
                              ? (formik.errors[field.name] as string)
                              : ''
                          }
                        />
                      </Box>
                    ) : field.type === 'coordinates' ? (
                      <SelectMapCoordinates
                        selected={formik.values[field.name]}
                        onChange={(coordinates) => {
                          handleChange(formik, field.name, coordinates);
                        }}
                      />
                    ) : field.type === 'partQuantity' ? (
                      <SelectPartQuantities
                        selected={formik.values[field.name] ?? []}
                        onChange={(newPartQuantities) => {
                          handleChange(formik, field.name, newPartQuantities);
                        }}
                      />
                    ) : field.type === 'signature' ? (
                      <SignaturePad
                        label={field.label}
                        value={formik.values[field.name]}
                        onChange={(signature) => {
                          formik.setFieldValue(field.name, signature);
                        }}
                      />
                    ) : (
                      <Field
                        key={index}
                        {...field}
                        isDisabled={formik.isSubmitting}
                        type={field.type}
                        label={field.label}
                        placeholder={field.placeholder}
                        value={formik.values[field.name]}
                        onBlur={formik.handleBlur}
                        // onChange={formik.handleChange}
                        onChange={(e) => handleChange(formik, field.name, e)}
                        onKeyDown={handleKeyDown(formik, field.multiple)}
                        error={!!formik.errors[field.name] || field.error}
                        errorMessage={formik.errors[field.name]}
                        fullWidth={field.fullWidth}
                      />
                    )}
                  </Grid>
                );
              })}

              {props.renderValues && (
                <Grid item xs={12}>
                  {props.renderValues(formik.values, formik.setFieldValue)}
                </Grid>
              )}

              {formik.submitCount > 0 && Object.keys(formik.errors).length > 0 && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    <Typography>
                      {t('form_validation_error_summary')}
                    </Typography>
                    <Box component="ul" sx={{ mb: 0, pl: 2 }}>
                      {flattenFormikErrors(formik.errors).map(
                        ({ path, message }) => {
                          const fieldName = path.split(/[.[\]]/)[0];
                          const field = props.fields.find(
                            (item) => item.name === fieldName
                          );
                          const label = field?.label
                            ? t(field.label)
                            : fieldName;

                          return (
                            <li key={path}>
                              <strong>{label || path}:</strong> {message}
                            </li>
                          );
                        }
                      )}
                    </Box>
                  </Alert>
                </Grid>
              )}

              <Grid
                item
                xs={12}
                sx={
                  props.stickyActions
                    ? {
                        [theme.breakpoints.down('sm')]: {
                          position: 'sticky',
                          bottom: 0,
                          zIndex: 1,
                          backgroundColor: theme.palette.background.paper,
                          borderTop: `1px solid ${theme.palette.divider}`,
                          py: 1.5,
                          '& .MuiButton-root': { minHeight: 48 }
                        }
                      }
                    : undefined
                }
              >
                <Button
                  type="submit"
                  sx={{
                    mt: { xs: 2, sm: 0 }
                  }}
                  variant="contained"
                  startIcon={
                    formik.isSubmitting ? (
                      <CircularProgress size="1rem" />
                    ) : null
                  }
                  disabled={
                    Boolean(formik.errors.submit) || formik.isSubmitting
                  }
                >
                  {t(props.submitText)}
                </Button>

                {props.onCanceled && (
                  <Button
                    sx={{
                      mt: { xs: 2, sm: 0 }
                    }}
                    onClick={() => props.onCanceled}
                    variant="outlined"
                    disabled
                  >
                    {t(props.submitText)}
                  </Button>
                )}
                {props.nextToButton}
              </Grid>
              <FormikErrorFocus
                // See scroll-to-element for configuration options: https://www.npmjs.com/package/scroll-to-element
                offset={0}
                align={'bottom'}
                focusDelay={200}
                ease={'linear'}
                duration={500}
                formik={formik}
              />
            </Grid>
          </Box>
        )}
      </Formik>
    </>
  );
};
