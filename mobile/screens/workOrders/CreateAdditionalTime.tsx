import { StyleSheet } from 'react-native';

import { View } from '../../components/Themed';
import { useTranslation } from 'react-i18next';
import { IField } from '../../models/form';
import * as Yup from 'yup';
import Form from '../../components/form';
import { formatSelect } from '../../utils/formatters';
import { RootStackScreenProps } from '../../types';
import { useDispatch } from '../../store';
import { createLabor } from '../../slices/labor';
import { getErrorMessage } from '../../utils/api';
import { useContext, useState } from 'react';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { createManualLaborDurationFields } from '../../utils/manualLaborDuration';

export default function CreateAdditionalTime({
  navigation,
  route
}: RootStackScreenProps<'AddAdditionalTime'>) {
  const { t } = useTranslation();
  const [isFormDirty, setIsFormDirty] = useState(false);
  const markFormClean = useUnsavedChanges(navigation, isFormDirty);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const dispatch = useDispatch();
  const fields: Array<IField> = [
    {
      name: 'assignedTo',
      type: 'select',
      label: t('assigned_to'),
      type2: 'user',
      midWidth: true
    },
    {
      name: 'hourlyRate',
      type: 'number',
      label: t('hourly_rate'),
      midWidth: true
    },
    {
      name: 'includeToTotalTime',
      type: 'switch',
      label: t('include_time'),
      helperText: t('include_time_description')
    },
    {
      name: 'startedAt',
      type: 'date',
      label: t('work_started_at')
    },
    {
      name: 'timeCategory',
      type: 'select',
      label: t('category'),
      type2: 'category',
      category: 'time-categories'
    },
    {
      name: 'duration',
      type: 'titleGroupField',
      label: t('duration')
    },
    {
      name: 'hours',
      type: 'number',
      label: t('hours'),
      midWidth: true,
      required: true
    },
    {
      name: 'minutes',
      type: 'number',
      label: t('minutes'),
      midWidth: true,
      required: true
    }
  ];
  const shape = {
    ...createManualLaborDurationFields(t),
    startedAt: Yup.date().required(t('required_field'))
  };
  return (
    <View style={{ flex: 1 }}>
      <Form
        fields={fields}
        navigation={navigation}
        validation={Yup.object().shape(shape)}
        submitText={t('add')}
        values={{ includeToTotalTime: true }}
        onChange={() => setIsFormDirty(true)}
        onSubmit={async (values) => {
          const formattedValues = { ...values };
          formattedValues.assignedTo = formatSelect(formattedValues.assignedTo);
          formattedValues.timeCategory = formatSelect(
            formattedValues.timeCategory
          );
          formattedValues.duration = values.hours * 3600 + values.minutes * 60;
          try {
            await dispatch(
              createLabor(route.params.workOrderId, formattedValues)
            );
            markFormClean();
            setIsFormDirty(false);
            navigation.goBack();
          } catch (err) {
            showSnackBar(getErrorMessage(err), 'error');
            throw err;
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({});
