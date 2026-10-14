import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useRef, useState } from 'react';
import { IField, IHash } from '../../models/form';
import * as Yup from 'yup';
import { ObjectSchema } from 'yup';
import {
  Button,
  HelperText,
  IconButton,
  Switch,
  Text,
  TextInput,
  useTheme
} from 'react-native-paper';
import { Formik, FormikProps } from 'formik';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types';
import { PartMiniDTO } from '../../models/part';
import { CustomerMiniDTO } from '../../models/customer';
import { VendorMiniDTO } from '../../models/vendor';
import { UserMiniDTO } from '../../models/user';
import { TeamMiniDTO } from '../../models/team';
import { AssetMiniDTO } from '../../models/asset';
import Category from '../../models/category';
import { LocationMiniDTO } from '../../models/location';
import FileUpload from '../FileUpload';
import CustomDateTimePicker from '../CustomDateTimePicker';
import PriorityPicker from './PriorityPicker';
import { isTask, Task } from '../../models/tasks';
import { getTaskTypes } from '../../utils/displayers';
import NumberInput from '../NumberInput';
import {
  getNumericFormErrors,
  normalizeNumericFormValues
} from '../../utils/numericInput';
import DateRangePicker from './DateRangePicker';
import AudioRecorder from './AudioRecorder';
import SignaturePad from './SignaturePad';
import { SheetManager } from 'react-native-actions-sheet';
import File, { IFile } from '../../models/file';
import mime from 'mime';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createAsyncActionLock } from '../../utils/asyncActionLock';
import {
  hasActiveAudioRecording,
  updateActiveAudioRecordingFields
} from '../../utils/formAudioRecording';
import { qpmLayoutTokens } from '../../theme/tokens';

interface OwnProps {
  fields: Array<IField>;
  values?: IHash<any>;
  onSubmit?: (values: IHash<any>) => Promise<any>;
  onCanceled?: () => void;
  onChange?: any;
  submitText?: string;
  validation?: ObjectSchema<any>;
  isLoading?: boolean;
  isButtonEnabled?: (values: IHash<any>, ...props: any[]) => boolean;
  navigation: any;
}

const getFieldLabel = (field: IField) =>
  field.required ? `${field.label} *` : field.label;

const getSelectedOptionLabel = (value: any): string | undefined => {
  if (!value) return undefined;
  if (isTask(value)) return value.taskBase?.label;
  if (value.value && isTask(value.value))
    return value.label || value.value.taskBase?.label;
  return value?.label;
};

export default function Form(props: OwnProps) {
  const { t } = useTranslation();
  const shape: IHash<any> = {};
  const theme = useTheme();
  const submitLock = useRef(createAsyncActionLock()).current;
  const [activeAudioRecordings, setActiveAudioRecordings] = useState<
    Record<string, boolean>
  >({});
  const activeAudioRecordingsRef = useRef<Record<string, boolean>>({});
  const onAudioRecordingChange = (field: string, recording: boolean) => {
    const next = updateActiveAudioRecordingFields(
      activeAudioRecordingsRef.current,
      field,
      recording
    );
    activeAudioRecordingsRef.current = next;
    setActiveAudioRecordings(next);
  };
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  // Disable NFC-related form inputs on iOS (barcode only).
  const isNfcEnabled = Platform.OS !== 'ios';
  props.fields.forEach((f) => {
    shape[f.name] = Yup.string();
    if (f.required) {
      shape[f.name] = shape[f.name].required();
    }
  });
  const handleChange = (
    formik: FormikProps<IHash<any>>,
    field,
    e:
      | (
          | { label: string; value: number }
          | { label: string; value: Task }
          | Task
        )[]
      | string
      | number
      | Date
      | boolean
      | { label: string; value: any }
      | [string, string]
  ) => {
    if (formik.isSubmitting) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    props.onChange && props.onChange({ field, e });
    if (props.fields.length == 1) {
      formik.setFieldTouched(field, true);
    }
    formik.setFieldValue(field, e);
    return formik.handleChange(field);
  };
  const handleDirectValueChange = (
    formik: FormikProps<IHash<any>>,
    field: string,
    value: any
  ) => {
    if (formik.isSubmitting) return;
    props.onChange && props.onChange({ field, e: value });
    formik.setFieldValue(field, value);
  };
  const validationSchema = Yup.object().shape(shape);
  const numericFieldNames = props.fields
    .filter((field) => field.type === 'number')
    .map((field) => field.name);

  const renderSelect = (formik, field: IField) => {
    let values:
      | (
          | { label: string; value: number }
          | { label: string; value: Task }
          | Task
        )[]
      | { label: string; value: number } = formik.values[field.name];
    const excluded = field.excluded;
    const selectedOptionLabels = (
      Array.isArray(values) ? values : values ? [values] : []
    )
      .map(getSelectedOptionLabel)
      .filter(Boolean);
    const selectorAccessibilityLabel = `${getFieldLabel(field)}: ${
      selectedOptionLabels.length
        ? selectedOptionLabels.join(', ')
        : field.placeholder ?? t('select')
    }`;
    let screenPath: keyof RootStackParamList;
    let onChange: (
      values: (
        | PartMiniDTO
        | CustomerMiniDTO
        | VendorMiniDTO
        | UserMiniDTO
        | TeamMiniDTO
        | AssetMiniDTO
        | Category
        | Task
      )[]
    ) => void;
    let additionalNavigationOptions = {};

    // Handle basic select type
    if (field.items) {
      const selectedValue = formik.values[field.name];
      const selectedItem = field.items.find(
        (item) => item.value === selectedValue
      );

      return (
        <TouchableOpacity
          disabled={formik.isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={`${getFieldLabel(field)}: ${
            selectedItem?.label ?? field.placeholder ?? t('select')
          }`}
          onPress={() => {
            SheetManager.show('basic-select-sheet', {
              payload: {
                items: field.items,
                onSelect: (item) => {
                  handleChange(formik, field.name, item.value);
                }
              }
            });
          }}
          style={{
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Text>{getFieldLabel(field)}</Text>
            <IconButton
              iconColor={theme.colors.primary}
              icon={selectedValue ? 'check-circle' : 'plus-circle'}
            />
          </View>
          {selectedValue && (
            <Text style={{ color: theme.colors.primary }}>
              {selectedItem ? selectedItem.label : selectedValue}
            </Text>
          )}
          {!selectedValue && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {field.placeholder ?? t('select')}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    switch (field.type2) {
      case 'priority':
        return (
          <View>
            <Text>{getFieldLabel(field)}</Text>
            <PriorityPicker
              value={formik.values[field.name]}
              disabled={formik.isSubmitting}
              onChange={(value) => handleChange(formik, field.name, value)}
            />
          </View>
        );
      case 'part':
        screenPath = 'SelectParts';
        onChange = (values: PartMiniDTO[]) => {
          const value = values.map((part) => ({
            label: part.name,
            value: part.id
          }));
          handleChange(formik, field.name, field.multiple ? value : value[0]);
        };
        break;
      case 'customer':
        screenPath = 'SelectCustomers';
        onChange = (values: CustomerMiniDTO[]) => {
          const value = values.map((customer) => ({
            label: customer.name,
            value: customer.id
          }));
          handleChange(formik, field.name, field.multiple ? value : value[0]);
        };
        break;
      case 'vendor':
        screenPath = 'SelectVendors';
        onChange = (values: VendorMiniDTO[]) => {
          const value = values.map((vendor) => ({
            label: vendor.companyName,
            value: vendor.id
          }));
          handleChange(formik, field.name, field.multiple ? value : value[0]);
        };
        break;
      case 'user':
        screenPath = 'SelectUsers';
        onChange = (values: UserMiniDTO[]) => {
          const value = values.map((user) => ({
            label: `${user.firstName} ${user.lastName}`,
            value: user.id
          }));
          handleChange(formik, field.name, field.multiple ? value : value[0]);
        };
        break;
      case 'team':
        screenPath = 'SelectTeams';
        onChange = (values: TeamMiniDTO[]) => {
          const value = values.map((team) => ({
            label: team.name,
            value: team.id
          }));
          handleChange(formik, field.name, field.multiple ? value : value[0]);
        };
        break;
      case 'location':
        screenPath = 'SelectLocations';
        onChange = (values: LocationMiniDTO[]) => {
          const value = values.map((location) => ({
            label: location.name,
            value: location.id
          }));
          handleChange(formik, field.name, field.multiple ? value : value[0]);
        };
        break;
      case 'parentLocation':
        screenPath = 'SelectLocations';
        onChange = (values: LocationMiniDTO[]) => {
          const value = values.map((location) => ({
            label: location.name,
            value: location.id
          }));
          handleChange(formik, field.name, field.multiple ? value : value[0]);
        };
        break;
      case 'asset':
        screenPath = 'SelectAssets';
        onChange = (values: AssetMiniDTO[]) => {
          const value = values.map((asset) => ({
            label: asset.name,
            value: asset.id
          }));
          handleChange(formik, field.name, field.multiple ? value : value[0]);
        };
        additionalNavigationOptions = {
          locationId: field.relatedFields
            ? formik.values[field.relatedFields[0].field]?.value ?? null
            : null
        };
        break;
      case 'category':
        screenPath = 'SelectCategories';
        onChange = (values: Category[]) => {
          const value = values.map((category) => ({
            label: category.name,
            value: category.id
          }));
          handleChange(formik, field.name, field.multiple ? value : value[0]);
        };
        additionalNavigationOptions = { type: field.category };
        break;
      case 'task':
        screenPath = 'SelectTasksOrChecklist';
        onChange = (values: Task[]) => {
          const value = values.map((task) => ({
            label: task.taskBase.label,
            value: task
          }));
          handleChange(formik, field.name, value);
        };
        break;
      default:
        return;
    }

    const navigationOptions: {
      selected: (number | Task)[];
      onChange: (value: PartMiniDTO[]) => void;
      multiple: boolean;
    } = {
      onChange,
      selected: Array.isArray(values)
        ? values.map((value) => {
            if (isTask(value)) {
              return value;
            } else {
              return value.value;
            }
          })
        : [],
      multiple: field.multiple,
      ...additionalNavigationOptions
    };
    const renderValue = (value: { value: number; label: string }) => {
      return (
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Text
            style={{
              color: formik.errors[field.name]
                ? theme.colors.error
                : theme.colors.primary
            }}
          >
            {value.label}
          </Text>
          <IconButton
            disabled={formik.isSubmitting}
            accessibilityLabel={t('remove_selected_value', {
              value: value.label
            })}
            onPress={() => {
              handleChange(
                formik,
                field.name,
                Array.isArray(values)
                  ? values.filter((item) => value.value !== item.value)
                  : undefined
              );
            }}
            icon={'close-circle'}
            iconColor={theme.colors.error}
          />
        </View>
      );
    };
    if (screenPath && field.type2 !== 'task') {
      // @ts-ignore
      return (
        <TouchableOpacity
          disabled={formik.isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={selectorAccessibilityLabel}
          onPress={() =>
            props.navigation.navigate(screenPath, navigationOptions)
          }
          style={{
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Text>{getFieldLabel(field)}</Text>
            {(!values || (Array.isArray(values) && values.length === 0)) && (
              <IconButton
                disabled={formik.isSubmitting}
                iconColor={theme.colors.primary}
                icon={'plus-circle'}
              />
            )}
          </View>
          {field.multiple ? (
            Array.isArray(values) && values.length > 0 ? (
              values.map((value: { label: string; value: number }) =>
                renderValue(value)
              )
            ) : (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {field.placeholder ?? t('select')}
              </Text>
            )
          ) : values ? (
            renderValue(values as { label: string; value: number })
          ) : (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {field.placeholder ?? t('select')}
            </Text>
          )}
        </TouchableOpacity>
      );
    } else if (field.type2 === 'task') {
      // @ts-ignore
      // @ts-ignore
      return (
        <TouchableOpacity
          disabled={formik.isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={selectorAccessibilityLabel}
          onPress={() =>
            props.navigation.navigate(screenPath, navigationOptions)
          }
          style={{
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Text>{getFieldLabel(field)}</Text>
            {(!values || (Array.isArray(values) && values.length === 0)) && (
              <IconButton
                disabled={formik.isSubmitting}
                iconColor={theme.colors.primary}
                icon={'plus-circle'}
              />
            )}
          </View>
          {/*@ts-ignore*/}
          {Array.isArray(values) && values.length === 0 && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {field.placeholder ?? t('select')}
            </Text>
          )}
          {values &&
            Array.isArray(values) &&
            values.map((object: { label: string; value: Task } | Task) => (
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                {/*@ts-ignore*/}
                <View>
                  <Text style={{ color: theme.colors.secondary }}>
                    {
                      getTaskTypes(t).find((type) => {
                        let taskType;
                        if (isTask(object)) {
                          taskType = object?.taskBase?.taskType;
                        } else {
                          taskType = object.value.taskBase.taskType;
                        }
                        return type.value === taskType;
                      })?.label
                    }
                  </Text>
                  <Text>
                    {isTask(object) ? object.taskBase.label : object.label}
                  </Text>
                </View>
                <IconButton
                  disabled={formik.isSubmitting}
                  accessibilityLabel={t('remove_selected_value', {
                    value: isTask(object)
                      ? object.taskBase.label
                      : object.label || object.value.taskBase.label
                  })}
                  onPress={() => {
                    if (Array.isArray(values))
                      handleChange(
                        formik,
                        field.name,
                        values.filter(
                          (item: Task | { label: string; value: Task }) => {
                            let id;
                            if (isTask(object)) {
                              id = object.id;
                            } else {
                              id = object.value.id;
                            }
                            return (
                              id !==
                              (isTask(object) && isTask(item)
                                ? item.id
                                : isTask(item.value)
                                ? item.value.id
                                : 0)
                            );
                          }
                        )
                      );
                  }}
                  icon={'close-circle'}
                  iconColor={theme.colors.error}
                />
              </View>
            ))}
        </TouchableOpacity>
      );
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.formContent,
          { paddingBottom: 24 + insets.bottom }
        ]}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      >
        <Formik<IHash<any>>
          validationSchema={props.validation || validationSchema}
          validate={(values) =>
            getNumericFormErrors(
              values,
              numericFieldNames,
              t('invalid_number_value')
            )
          }
          validateOnChange={true}
          validateOnBlur={true}
          initialValues={props.values || {}}
          onSubmit={(values, { setStatus }) => {
            if (hasActiveAudioRecording(activeAudioRecordingsRef.current))
              return;
            return submitLock(async () => {
              try {
                await props.onSubmit?.(
                  normalizeNumericFormValues(values, numericFieldNames)
                );
                setStatus({ success: true });
              } catch (_error) {
                // Screen-level handlers show the API error; keep the form usable
                // so the user can correct the input or retry the submission.
                setStatus({ success: false });
              }
            });
          }}
        >
          {(formik) => (
            <View>
              {props.fields.map((field, index) => {
                if (!isNfcEnabled && field.type === 'nfc') {
                  return null;
                }

                return (
                  <View
                    key={field.name}
                    style={[
                      styles.fieldCard,
                      field.type === 'titleGroupField'
                        ? styles.sectionHeadingCard
                        : {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.outlineVariant
                          }
                    ]}
                  >
                    {field.type === 'text' ? (
                      <TextInput
                        style={{ width: '100%' }}
                        mode="outlined"
                        error={!!formik.errors[field.name] || field.error}
                        label={getFieldLabel(field)}
                        placeholder={field.placeholder ?? field.label}
                        onBlur={formik.handleBlur(field.name)}
                        onChangeText={(text) =>
                          handleChange(formik, field.name, text)
                        }
                        value={formik.values[field.name]}
                        disabled={formik.isSubmitting}
                        multiline={field.multiple}
                      />
                    ) : field.type === 'number' ? (
                      <NumberInput
                        style={{ width: '100%' }}
                        mode="outlined"
                        error={!!formik.errors[field.name] || field.error}
                        label={getFieldLabel(field)}
                        defaultValue={formik.values[field.name]}
                        placeholder={field.placeholder ?? field.label}
                        onBlur={formik.handleBlur(field.name)}
                        onChangeText={(newValue) => {
                          handleChange(formik, field.name, newValue);
                        }}
                        disabled={formik.isSubmitting}
                        multiline={field.multiple}
                      />
                    ) : field.type === 'file' ? (
                      <FileUpload
                        multiple={field.multiple}
                        title={getFieldLabel(field)}
                        type={field.fileType || 'file'}
                        description={t('upload')}
                        disabled={formik.isSubmitting}
                        files={
                          (Array.isArray(formik.values[field.name])
                            ? formik.values[field.name]
                            : formik.values[field.name]
                            ? [formik.values[field.name]]
                            : []
                          ).map(
                            (file: File) =>
                              ({
                                uri: file.url,
                                type: mime.getType(file.name),
                                name: file.name
                              } as IFile)
                          ) ?? []
                        }
                        onChange={(files) => {
                          handleDirectValueChange(formik, field.name, files);
                        }}
                      />
                    ) : field.type === 'date' ? (
                      <CustomDateTimePicker
                        label={getFieldLabel(field)}
                        disabled={formik.isSubmitting}
                        onChange={(date) =>
                          handleChange(formik, field.name, date)
                        }
                        value={
                          formik.values[field.name]
                            ? new Date(formik.values[field.name])
                            : null
                        }
                      />
                    ) : field.type === 'switch' ? (
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Text>{getFieldLabel(field)}</Text>
                        <Switch
                          value={formik.values[field.name]}
                          disabled={formik.isSubmitting}
                          accessibilityLabel={getFieldLabel(field)}
                          accessibilityHint={field.helperText}
                          accessibilityState={{
                            checked: Boolean(formik.values[field.name]),
                            disabled: formik.isSubmitting
                          }}
                          onValueChange={(value) => {
                            handleChange(formik, field.name, value);
                          }}
                        />
                      </View>
                    ) : field.type === 'titleGroupField' ? (
                      <Text
                        accessibilityRole="header"
                        variant="titleMedium"
                        style={[
                          styles.sectionHeading,
                          { color: theme.colors.onSurface }
                        ]}
                      >
                        {field.label}
                      </Text>
                    ) : field.type === 'dateRange' ? (
                      <View style={{ opacity: formik.isSubmitting ? 0.55 : 1 }}>
                        <Text style={{ fontWeight: 'bold' }}>
                          {getFieldLabel(field)}
                        </Text>
                        <DateRangePicker
                          disabled={formik.isSubmitting}
                          value={formik.values[field.name] ?? [null, null]}
                          onChange={(newValue) => {
                            handleChange(formik, field.name, newValue);
                          }}
                        />
                      </View>
                    ) : field.type === 'nfc' ? (
                      <View style={{ opacity: formik.isSubmitting ? 0.55 : 1 }}>
                        <TouchableOpacity
                          disabled={formik.isSubmitting}
                          onPress={() =>
                            props.navigation.navigate('SelectNfc', {
                              onChange: (value) => {
                                handleChange(formik, field.name, value);
                                props.navigation.goBack();
                              }
                            })
                          }
                        >
                          <Text>{getFieldLabel(field)}</Text>
                        </TouchableOpacity>
                        <Text style={{ color: theme.colors.primary }}>
                          {formik.values[field.name]}
                        </Text>
                      </View>
                    ) : field.type === 'barcode' ? (
                      <View style={{ opacity: formik.isSubmitting ? 0.55 : 1 }}>
                        <TouchableOpacity
                          disabled={formik.isSubmitting}
                          onPress={() =>
                            props.navigation.navigate('SelectBarcode', {
                              onChange: (value) => {
                                handleChange(formik, field.name, value);
                                props.navigation.goBack();
                              }
                            })
                          }
                        >
                          <Text>{getFieldLabel(field)}</Text>
                        </TouchableOpacity>
                        <Text style={{ color: theme.colors.primary }}>
                          {formik.values[field.name]}
                        </Text>
                      </View>
                    ) : field.type === 'audio' ? (
                      <AudioRecorder
                        title={getFieldLabel(field)}
                        disabled={formik.isSubmitting}
                        onRecordingChange={(recording) =>
                          onAudioRecordingChange(field.name, recording)
                        }
                        onChange={(audio) => {
                          handleDirectValueChange(formik, field.name, audio);
                        }}
                      />
                    ) : field.type === 'signature' ? (
                      <SignaturePad
                        label={getFieldLabel(field)}
                        value={formik.values[field.name]}
                        disabled={formik.isSubmitting}
                        onChange={(signature) => {
                          handleDirectValueChange(
                            formik,
                            field.name,
                            signature
                          );
                        }}
                      />
                    ) : (
                      renderSelect(formik, field)
                    )}
                    {Boolean(formik.errors[field.name]) ? (
                      <HelperText type="error" accessibilityLiveRegion="polite">
                        {t(formik.errors[field.name]?.toString())}
                      </HelperText>
                    ) : field.helperText ? (
                      <HelperText type="info">{field.helperText}</HelperText>
                    ) : null}
                  </View>
                );
              })}
              <Button
                style={styles.submitButton}
                onPress={() => formik.handleSubmit()}
                mode="contained"
                loading={formik.isSubmitting}
                disabled={
                  Boolean(formik.errors.submit) ||
                  formik.isSubmitting ||
                  hasActiveAudioRecording(activeAudioRecordings)
                }
                accessibilityRole="button"
                accessibilityState={{
                  disabled:
                    Boolean(formik.errors.submit) ||
                    formik.isSubmitting ||
                    hasActiveAudioRecording(activeAudioRecordings),
                  busy: formik.isSubmitting
                }}
              >
                {t(props.submitText)}
              </Button>
              {hasActiveAudioRecording(activeAudioRecordings) && (
                <HelperText type="info" accessibilityLiveRegion="polite">
                  {t('stop_recording_before_saving')}
                </HelperText>
              )}
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  formContent: { paddingHorizontal: 12, paddingTop: 8 },
  fieldCard: {
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: qpmLayoutTokens.radius.card
  },
  sectionHeadingCard: {
    marginTop: 18,
    marginBottom: 0,
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderWidth: 0,
    backgroundColor: 'transparent'
  },
  sectionHeading: { fontWeight: '700' },
  submitButton: {
    minHeight: 50,
    justifyContent: 'center',
    marginHorizontal: 2,
    marginTop: 18,
    marginBottom: 8,
    borderRadius: qpmLayoutTokens.radius.control,
    zIndex: 10
  }
});
