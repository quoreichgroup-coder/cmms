import { StyleSheet } from 'react-native';
import * as Yup from 'yup';
import { Text, useTheme } from 'react-native-paper';
import { View } from '../../components/Themed';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import { useContext, useState } from 'react';
import { CompanySettingsContext } from '../../contexts/CompanySettingsContext';
import { IField } from '../../models/form';
import Form from '../../components/form';
import { getErrorMessage } from '../../utils/api';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { qpmLayoutTokens } from '../../custom-theme';

export default function CompleteWorkOrderModal({
  navigation,
  route
}: RootStackScreenProps<'CompleteWorkOrder'>) {
  const { onComplete, fieldsConfig, workOrderContext } = route.params;
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  const [isFormDirty, setIsFormDirty] = useState(false);
  const markFormClean = useUnsavedChanges(navigation, isFormDirty);
  const { uploadFiles } = useContext(CompanySettingsContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);

  const getFieldsAndShape = (): [Array<IField>, { [key: string]: any }] => {
    let fields: IField[] = [];
    let shape = {};
    if (fieldsConfig.feedback) {
      fields.push({
        name: 'feedback',
        type: 'text',
        label: t('feedback'),
        placeholder: t('feedback_description'),
        multiple: true
      });
      shape = { feedback: Yup.string().required(t('required_feedback')) };
    }
    if (fieldsConfig.signature) {
      fields.push({
        name: 'signature',
        type: 'signature',
        label: t('signature')
      });
      shape = {
        ...shape,
        signature: Yup.string().required(t('required_signature'))
      };
    }
    return [fields, shape];
  };
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.workOrderContext,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant
          }
        ]}
      >
        <Text
          variant="labelLarge"
          style={{ color: theme.colors.primary }}
          accessibilityLabel={`${t('work_order')} ${
            workOrderContext.identifier
          }`}
        >
          {t('work_order')} · {workOrderContext.identifier}
        </Text>
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurface, marginTop: 4 }}
          accessibilityRole="header"
        >
          {workOrderContext.title}
        </Text>
        {workOrderContext.assetName ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
          >
            {t('asset')}: {workOrderContext.assetName}
          </Text>
        ) : null}
      </View>
      <Text
        variant="bodySmall"
        style={{
          color: theme.colors.onSurfaceVariant,
          marginHorizontal: 16,
          marginTop: 8
        }}
      >
        {t('work_order_completion_read_only_notice')}
      </Text>
      <Form
        fields={getFieldsAndShape()[0]}
        validation={Yup.object().shape(getFieldsAndShape()[1])}
        submitText={t('complete_work_order')}
        values={{}}
        navigation={navigation}
        onChange={() => setIsFormDirty(true)}
        onSubmit={async (values) => {
          // The successful callback navigates out of this modal. Clear the
          // guard before invoking it, then restore it if completion fails.
          markFormClean();
          let completed: boolean;
          try {
            completed = await onComplete(values.signature, values.feedback);
          } catch (err) {
            setIsFormDirty(true);
            showSnackBar(getErrorMessage(err), 'error');
            // Keep the form submission unsuccessful so it remains available
            // for retry when the API rejects the completion.
            throw err;
          }
          if (!completed) {
            setIsFormDirty(true);
            showSnackBar(t('an_error_occured'), 'error');
            throw new Error('Work order completion was not accepted.');
          }
          setIsFormDirty(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 'auto'
  },
  workOrderContext: {
    marginHorizontal: qpmLayoutTokens.space.md,
    marginTop: qpmLayoutTokens.space.md,
    padding: qpmLayoutTokens.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: qpmLayoutTokens.radius.card
  }
});
