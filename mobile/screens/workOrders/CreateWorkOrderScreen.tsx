import { RootStackScreenProps } from '../../types';
import Form from '../../components/form';
import * as Yup from 'yup';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  getCustomFieldsIFields,
  getCustomFieldsRequiredShape,
  IField
} from '../../models/form';
import { useContext, useState } from 'react';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { getImageAndFiles } from '../../utils/overall';
import { useDispatch, useSelector } from '../../store';
import { addWorkOrder } from '../../slices/workOrder';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import { formatWorkOrderValues, getWorkOrderFields } from '../../utils/fields';
import { formatCustomFields } from '../../utils/formatters';
import { assetStatuses } from '../../models/asset';
import { useAppTheme } from '../../custom-theme';
import { getErrorMessage } from '../../utils/api';
import { CustomFieldEntityType } from '../../models/customField';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { isWorkOrderTasksCreationError } from '../../utils/workOrderCreation';

export default function CreateWorkOrderScreen({
  navigation,
  route
}: RootStackScreenProps<'AddWorkOrder'>) {
  const { t } = useTranslation();
  const [isFormDirty, setIsFormDirty] = useState(false);
  const theme = useAppTheme();
  const { uploadFiles, getWOFieldsAndShapes } = useContext(
    CompanySettingsContext
  );
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const dispatch = useDispatch();
  const { customFields } = useSelector((state) => state.customFields);

  const markFormClean = useUnsavedChanges(navigation, isFormDirty);

  const defaultShape: { [key: string]: any } = {
    title: Yup.string().required(t('required_wo_title')),
    ...getCustomFieldsRequiredShape(
      customFields,
      CustomFieldEntityType.WORK_ORDER,
      t
    )
  };

  const onCreationSuccess = () => {
    showSnackBar(t('wo_create_success'), 'success');
    navigation.goBack();
  };
  const onCreationFailure = (err) =>
    showSnackBar(getErrorMessage(err, t('wo_create_failure')), 'error');
  const getFieldsAndShapes = (): [Array<IField>, { [key: string]: any }] => {
    const fields = [
      ...getWorkOrderFields(t),
      ...getCustomFieldsIFields(customFields, CustomFieldEntityType.WORK_ORDER)
    ];
    return getWOFieldsAndShapes(fields, defaultShape);
  };
  const [configuredFields, validationShape] = getFieldsAndShapes();
  const assetStatusField: IField = {
    name: 'assetStatus',
    type: 'select',
    label: t('asset_status'),
    placeholder: t('select_asset_status'),
    items: assetStatuses.map((assetStatus) => ({
      label: t(assetStatus.status),
      value: assetStatus.status,
      color: assetStatus.color(theme)
    }))
  };
  const fieldsByName = new Map([
    ...configuredFields.map((field) => [field.name, field] as const),
    [assetStatusField.name, assetStatusField] as const
  ]);
  const knownFields = new Set([
    'title',
    'description',
    'priority',
    'category',
    'tasks',
    'image',
    'location',
    'asset',
    'assetStatus',
    'dueDate',
    'estimatedStartDate',
    'estimatedDuration',
    'primaryUser',
    'assignedTo',
    'team',
    'customers',
    'files',
    'requiredSignature'
  ]);
  const section = (
    name: string,
    label: string,
    fieldNames: string[]
  ): IField[] => {
    const sectionFields = fieldNames
      .map((fieldName) => fieldsByName.get(fieldName))
      .filter((field): field is IField => Boolean(field));
    return sectionFields.length
      ? [
          { name, type: 'titleGroupField' as const, label: t(label) },
          ...sectionFields
        ]
      : [];
  };
  const extraFields = configuredFields.filter(
    (field) => !knownFields.has(field.name)
  );
  const formFields: IField[] = [
    ...section('workDetailsSection', 'work_order', [
      'title',
      'description',
      'priority',
      'category',
      'tasks',
      'image'
    ]),
    ...section('assetSection', 'asset_information', [
      'location',
      'asset',
      'assetStatus'
    ]),
    ...section('planningSection', 'dates', [
      'dueDate',
      'estimatedStartDate',
      'estimatedDuration'
    ]),
    ...section('peopleSection', 'people', [
      'primaryUser',
      'assignedTo',
      'team',
      'customers'
    ]),
    ...section('additionalSection', 'additional_information', [
      'files',
      'requiredSignature'
    ]),
    ...(extraFields.length
      ? [
          {
            name: 'customFieldsSection',
            type: 'titleGroupField' as const,
            label: t('custom_fields')
          },
          ...extraFields
        ]
      : [])
  ];
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Form
        fields={formFields}
        validation={Yup.object().shape(validationShape)}
        navigation={navigation}
        submitText={t('save')}
        values={{
          requiredSignature: false,
          dueDate: null,
          location: route.params?.location
            ? {
                label: route.params.location.name,
                value: route.params.location.id.toString()
              }
            : null,
          asset: route.params?.asset
            ? {
                label: route.params.asset.name,
                value: route.params.asset.id.toString()
              }
            : null,
          estimatedDuration: 1
        }}
        onChange={() => setIsFormDirty(true)}
        onSubmit={async (values) => {
          let formattedValues = formatWorkOrderValues(values);
          formattedValues = formatCustomFields(formattedValues);
          try {
            const uploadedFiles = await uploadFiles(
              formattedValues.files,
              formattedValues.image
            );
            const imageAndFiles = getImageAndFiles(uploadedFiles);
            formattedValues = {
              ...formattedValues,
              image: imageAndFiles.image,
              files: imageAndFiles.files
            };
            await dispatch(addWorkOrder(formattedValues));
            markFormClean();
            setIsFormDirty(false);
            onCreationSuccess();
          } catch (err) {
            if (isWorkOrderTasksCreationError(err)) {
              markFormClean();
              setIsFormDirty(false);
              showSnackBar(t('wo_created_tasks_save_error'), 'error');
              navigation.replace('WODetails', { id: err.workOrderId });
              return;
            }
            onCreationFailure(err);
            throw err;
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
