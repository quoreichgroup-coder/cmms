import { StyleSheet } from 'react-native';

import { View } from '../../components/Themed';
import { useTranslation } from 'react-i18next';
import { IField } from '../../models/form';
import * as Yup from 'yup';
import Form from '../../components/form';
import { formatSelect } from '../../utils/formatters';
import { createAdditionalCost } from '../../slices/additionalCost';
import { RootStackScreenProps } from '../../types';
import { useDispatch } from '../../store';
import { getErrorMessage } from '../../utils/api';
import { useContext, useState } from 'react';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

export default function CreateAdditionalCost({
  navigation,
  route
}: RootStackScreenProps<'AddAdditionalCost'>) {
  const { t } = useTranslation();
  const [isFormDirty, setIsFormDirty] = useState(false);
  const markFormClean = useUnsavedChanges(navigation, isFormDirty);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const dispatch = useDispatch();
  const fields: Array<IField> = [
    {
      name: 'description',
      type: 'text',
      label: t('cost_description'),
      required: true
    },
    {
      name: 'assignedTo',
      type: 'select',
      label: t('assigned_to'),
      type2: 'user',
      midWidth: true
    },
    {
      name: 'category',
      type: 'select',
      label: t('category'),
      type2: 'category',
      category: 'cost-categories',
      midWidth: true
    },
    {
      name: 'date',
      type: 'date',
      label: t('date'),
      midWidth: true
    },
    {
      name: 'cost',
      type: 'number',
      label: t('cost'),
      midWidth: true
    },
    {
      name: 'includeToTotalCost',
      type: 'switch',
      label: t('include_cost'),
      helperText: t('include_cost_description')
    }
  ];
  const shape = {
    description: Yup.string().required(t('required_cost_description')),
    cost: Yup.number().required(t('required_cost'))
  };
  return (
    <View style={{ flex: 1 }}>
      <Form
        fields={fields}
        navigation={navigation}
        validation={Yup.object().shape(shape)}
        submitText={t('add')}
        values={{ includeToTotalCost: true }}
        onChange={() => setIsFormDirty(true)}
        onSubmit={async (values) => {
          const formattedValues = { ...values };
          formattedValues.assignedTo = formatSelect(formattedValues.assignedTo);
          formattedValues.category = formatSelect(formattedValues.category);
          try {
            await dispatch(
              createAdditionalCost(route.params.workOrderId, formattedValues)
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
