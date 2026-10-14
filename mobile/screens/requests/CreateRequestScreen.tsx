import { RootStackScreenProps } from '../../types';
import Form from '../../components/form';
import { View } from '../../components/Themed';
import * as Yup from 'yup';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useContext, useState } from 'react';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { getImageAndFiles } from '../../utils/overall';
import { useDispatch, useSelector } from '../../store';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import { formatPartValues, formatRequestValues } from '../../utils/fields';
import { formatCustomFields } from '../../utils/formatters';
import useAuth from '../../hooks/useAuth';
import { addRequest } from '../../slices/request';
import {
  IField,
  getCustomFieldsIFields,
  getCustomFieldsRequiredShape
} from '../../models/form';
import { CustomFieldEntityType } from '../../models/customField';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { getErrorMessage } from '../../utils/api';
import { groupRequestFormFields } from '../../utils/requestFormLayout';

export default function CreateRequestScreen({
  navigation,
  route
}: RootStackScreenProps<'AddRequest'>) {
  const { t } = useTranslation();
  const { uploadFiles, getRequestFieldsAndShapes } = useContext(
    CompanySettingsContext
  );
  const { companySettings } = useAuth();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const dispatch = useDispatch();
  const { customFields } = useSelector((state) => state.customFields);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const markFormClean = useUnsavedChanges(navigation, isFormDirty);

  const onCreationSuccess = () => {
    showSnackBar(t('request_create_success'), 'success');
    navigation.goBack();
  };
  const onCreationFailure = (err) =>
    showSnackBar(getErrorMessage(err, t('request_create_failure')), 'error');

  const getFieldsAndShapes = (): [Array<IField>, { [key: string]: any }] => {
    const baseShape = getRequestFieldsAndShapes()[1];
    const customShape = getCustomFieldsRequiredShape(
      customFields,
      CustomFieldEntityType.WORK_ORDER,
      t
    );
    const customFieldsList = getCustomFieldsIFields(
      customFields,
      CustomFieldEntityType.WORK_ORDER
    );
    return [
      [...getRequestFieldsAndShapes()[0], ...customFieldsList],
      { ...baseShape, ...customShape }
    ];
  };
  const [fields, validationShape] = getFieldsAndShapes();

  return (
    <View style={styles.container}>
      <Form
        fields={groupRequestFormFields(fields, t)}
        validation={Yup.object().shape(validationShape)}
        navigation={navigation}
        submitText={t('save')}
        values={{ dueDate: null }}
        onChange={() => setIsFormDirty(true)}
        onSubmit={async (values) => {
          try {
            let formattedValues = formatRequestValues(values);
            formattedValues = formatCustomFields(formattedValues);
            const uploadedFiles = await uploadFiles(
              formattedValues.files,
              formattedValues.image
            );
            const imageAndFiles = getImageAndFiles(uploadedFiles);
            if (values.audioDescription) {
              const audioFiles = await uploadFiles(
                [values.audioDescription],
                []
              );
              const audioImageAndFiles = getImageAndFiles(audioFiles);
              formattedValues.audioDescription = audioImageAndFiles.files[0];
            }
            formattedValues = {
              ...formattedValues,
              image: imageAndFiles.image,
              files: imageAndFiles.files
            };
            await dispatch(addRequest(formattedValues));
            markFormClean();
            setIsFormDirty(false);
            onCreationSuccess();
          } catch (err) {
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
