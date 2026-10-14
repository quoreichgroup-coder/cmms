import { Linking, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import * as React from 'react';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RootStackScreenProps } from '../../../types';
import { useDispatch, useSelector } from '../../../store';
import { View } from '../../../components/Themed';
import {
  Button,
  Dialog,
  Divider,
  IconButton,
  Portal,
  Text,
  useTheme
} from 'react-native-paper';
import LoadingDialog from '../../../components/LoadingDialog';
import { deleteCustomer, getCustomerDetails } from '../../../slices/customer';
import { SheetManager } from 'react-native-actions-sheet';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import BasicField from '../../../components/BasicField';
import { getCustomFieldValuesForDetails } from '../../../models/form';
import AsyncStateFeedback from '../../../components/AsyncStateFeedback';

export default function CustomerDetailsScreen({
  navigation,
  route
}: RootStackScreenProps<'CustomerDetails'>) {
  const { id, customerProp } = route.params;
  const { customerInfos } = useSelector((state) => state.customers);
  const customer = customerInfos[id]?.customer ?? customerProp;
  const theme = useTheme();
  const { getFormattedCurrency, getFormattedDate } = useContext(
    CompanySettingsContext
  );
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = React.useRef(false);
  const [loadError, setLoadError] = useState(false);

  const loadCustomer = useCallback(async () => {
    setLoadError(false);
    try {
      await dispatch(getCustomerDetails(id));
    } catch (_error) {
      setLoadError(true);
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!customerProp && !customer) void loadCustomer();
  }, [customer, customerProp, loadCustomer]);

  useEffect(() => {
    navigation.setOptions({
      title: customer?.name ?? t('loading'),
      headerRight: customer
        ? () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('more_options')}
              onPress={() => {
                SheetManager.show('customer-details-sheet', {
                  payload: {
                    onEdit: () =>
                      navigation.navigate('EditCustomer', { customer }),
                    onDelete: () => setOpenDelete(true),
                    customer
                  }
                });
              }}
            >
              <IconButton icon="dots-vertical" />
            </Pressable>
          )
        : undefined
    });
  }, [customer, navigation, t]);
  const fieldsToRender: { label: string; value: string; isLink?: boolean }[] = [
    {
      label: t('address'),
      value: customer?.address
    },
    {
      label: t('phone'),
      value: customer?.phone
    },
    {
      label: t('email'),
      value: customer?.email
    },
    {
      label: t('type'),
      value: customer?.customerType
    },
    {
      label: t('billing_currency'),
      value: customer?.billingCurrency?.name
    },
    {
      label: t('hourly_rate'),
      value: !!customer?.rate ? getFormattedCurrency(customer.rate) : null
    },
    ...getCustomFieldValuesForDetails(
      customer?.customFieldValues,
      getFormattedDate
    )
  ];

  const onDeleteSuccess = () => {
    showSnackBar(t('customer_delete_success'), 'success');
    navigation.goBack();
  };
  const onDeleteFailure = (err) =>
    showSnackBar(t('customer_delete_failure'), 'error');

  const handleDelete = async () => {
    if (deletingRef.current || !customer) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await dispatch(deleteCustomer(customer.id));
      setOpenDelete(false);
      onDeleteSuccess();
    } catch (err) {
      onDeleteFailure(err);
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };
  const renderConfirmDelete = () => {
    return (
      <Portal>
        <Dialog
          visible={openDelete}
          onDismiss={() => {
            if (!deleting) setOpenDelete(false);
          }}
        >
          <Dialog.Title>{t('confirmation')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('confirm_delete_customer')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={deleting} onPress={() => setOpenDelete(false)}>
              {t('cancel')}
            </Button>
            <Button
              loading={deleting}
              disabled={deleting}
              accessibilityState={{ disabled: deleting, busy: deleting }}
              onPress={handleDelete}
            >
              {t('to_delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };
  if (!customer)
    return loadError ? (
      <AsyncStateFeedback
        mode="error"
        message={t('directory_load_error')}
        onRetry={() => void loadCustomer()}
      />
    ) : (
      <LoadingDialog visible={true} />
    );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {renderConfirmDelete()}
      {fieldsToRender.map(
        ({ label, value, isLink }, index) =>
          value && (
            <BasicField
              key={label}
              label={label}
              value={value}
              isLink={isLink}
            />
          )
      )}
      {customer.website && (
        <View>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 20
            }}
          >
            <Text>{t('website')}</Text>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  customer.website.startsWith('https://')
                    ? customer.website
                    : 'https://' + customer.website
                )
              }
            >
              <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                {customer.website}
              </Text>
            </TouchableOpacity>
          </View>
          <Divider />
        </View>
      )}
    </ScrollView>
  );
}
