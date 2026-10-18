import { Linking, ScrollView, TouchableOpacity } from 'react-native';
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
import { deleteVendor, getVendorDetails } from '../../../slices/vendor';
import { SheetManager } from 'react-native-actions-sheet';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import BasicField from '../../../components/BasicField';
import { getCustomFieldValuesForDetails } from '../../../models/form';
import AsyncStateFeedback from '../../../components/AsyncStateFeedback';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/role';

export default function VendorDetailsScreen({
  navigation,
  route
}: RootStackScreenProps<'VendorDetails'>) {
  const { id, vendorProp } = route.params;
  const { vendorInfos } = useSelector((state) => state.vendors);
  const vendor = vendorInfos[id]?.vendor ?? vendorProp;
  const theme = useTheme();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { getFormattedCurrency, getFormattedDate } = useContext(
    CompanySettingsContext
  );
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = React.useRef(false);
  const [loadError, setLoadError] = useState(false);
  const { hasEditPermission, hasDeletePermission } = useAuth();
  const canOpenVendorActions = Boolean(
    vendor &&
      (hasEditPermission(PermissionEntity.VENDORS_AND_CUSTOMERS, vendor) ||
        hasDeletePermission(PermissionEntity.VENDORS_AND_CUSTOMERS, vendor))
  );

  const loadVendor = useCallback(async () => {
    setLoadError(false);
    try {
      await dispatch(getVendorDetails(id));
    } catch (_error) {
      setLoadError(true);
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!vendorProp && !vendor) void loadVendor();
  }, [loadVendor, vendor, vendorProp]);

  useEffect(() => {
    navigation.setOptions({
      title: vendor?.name ?? t('loading'),
      headerRight: () =>
        canOpenVendorActions && vendor ? (
          <IconButton
            icon="dots-vertical"
            accessibilityLabel={t('more_options')}
            onPress={() => {
              SheetManager.show('vendor-details-sheet', {
                payload: {
                  onEdit: () => navigation.navigate('EditVendor', { vendor }),
                  onDelete: () => setOpenDelete(true),
                  vendor
                }
              });
            }}
          />
        ) : null
    });
  }, [canOpenVendorActions, navigation, t, vendor]);
  const fieldsToRender: { label: string; value: string; isLink?: boolean }[] = [
    {
      label: t('address'),
      value: vendor?.address
    },
    {
      label: t('phone'),
      value: vendor?.phone
    },
    {
      label: t('email'),
      value: vendor?.email
    },
    {
      label: t('type'),
      value: vendor?.vendorType
    },
    {
      label: t('hourly_rate'),
      value: !!vendor?.rate ? getFormattedCurrency(vendor.rate) : null
    },
    ...getCustomFieldValuesForDetails(
      vendor?.customFieldValues,
      getFormattedDate
    )
  ];

  const onDeleteSuccess = () => {
    showSnackBar(t('vendor_delete_success'), 'success');
    navigation.goBack();
  };
  const onDeleteFailure = (err) =>
    showSnackBar(t('vendor_delete_failure'), 'error');

  const handleDelete = async () => {
    if (deletingRef.current || !vendor) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await dispatch(deleteVendor(vendor.id));
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
            <Text variant="bodyMedium">{t('confirm_delete_vendor')}</Text>
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
  if (!vendor)
    return loadError ? (
      <AsyncStateFeedback
        mode="error"
        message={t('directory_load_error')}
        onRetry={() => void loadVendor()}
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
      {vendor.website && (
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
                  vendor.website.startsWith('https://')
                    ? vendor.website
                    : 'https://' + vendor.website
                )
              }
            >
              <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                {vendor.website}
              </Text>
            </TouchableOpacity>
          </View>
          <Divider />
        </View>
      )}
    </ScrollView>
  );
}
