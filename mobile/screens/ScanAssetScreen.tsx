import { Alert, Platform, StyleSheet } from 'react-native';
import { View } from '../components/Themed';
import { Divider, List, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { RootStackScreenProps } from '../types';
import { getAssetByBarcode, getAssetByNfc } from '../slices/asset';
import { useDispatch } from '../store';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getLicenseValidity } from '../slices/license';
import { useLicenseEntitlement } from '../hooks/useLicenseEntitlement';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';
import { AssetDTO, AssetMiniDTO } from '../models/asset';
import useAuth from '../hooks/useAuth';
import { PermissionEntity } from '../models/role';
import { getErrorMessage } from '../utils/api';
import AsyncStateFeedback from '../components/AsyncStateFeedback';
import { isNfcSupportedOnPlatform } from '../utils/nfc';
import { shouldOfferAssetCreationAfterScan } from '../utils/assetScan';

export default function ScanAssetScreen({
  navigation,
  route
}: RootStackScreenProps<'ScanAsset'>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { onChange } = route.params || {};
  const [isResolving, setIsResolving] = useState(false);
  const resolvingRef = useRef(false);
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  const [licenseLoadError, setLicenseLoadError] = useState(false);
  const licenseCheckRef = useRef(false);
  const { hasCreatePermission } = useAuth();
  const hasBarcodeNfcEntitlement = useLicenseEntitlement('NFC_BARCODE');
  // NFC requires native support; keep barcode available on every platform.
  const isNfcEnabled = isNfcSupportedOnPlatform(Platform.OS);
  const { showSnackBar } = useContext(CustomSnackBarContext);

  const loadLicense = useCallback(async () => {
    if (licenseCheckRef.current) return;
    licenseCheckRef.current = true;
    setIsCheckingLicense(true);
    setLicenseLoadError(false);
    try {
      await dispatch(getLicenseValidity());
    } catch (_error) {
      setLicenseLoadError(true);
    } finally {
      licenseCheckRef.current = false;
      setIsCheckingLicense(false);
    }
  }, [dispatch]);

  const showLicenseError = () => {
    showSnackBar(t('you_need_a_license'), 'error');
  };

  const handleAssetFound = (asset: AssetMiniDTO) => {
    if (onChange) {
      onChange(asset);
      navigation.goBack();
    } else {
      navigation.replace('AssetDetails', { id: asset.id });
    }
  };

  const getCreateAssetParams = (identifier: {
    nfcId?: string;
    barCode?: string;
  }) => ({
    ...identifier,
    openedFromSelector: !!onChange,
    onSuccess: onChange
  });

  const handleLookupFailure = (
    error: any,
    identifier: { nfcId?: string; barCode?: string },
    missingMessage: string
  ) => {
    // A create prompt is valid only when the server confirms the identifier is
    // unknown. Network, license, and authorization failures must not be treated
    // as evidence that the scanned equipment does not exist.
    if (
      shouldOfferAssetCreationAfterScan(
        error?.status,
        hasCreatePermission(PermissionEntity.ASSETS)
      )
    ) {
      Alert.alert(t('error'), missingMessage, [
        { text: t('no'), onPress: () => navigation.goBack() },
        {
          text: t('yes'),
          onPress: () =>
            navigation.replace('AddAsset', getCreateAssetParams(identifier))
        }
      ]);
      return;
    }

    const message =
      error?.status === 404
        ? t('asset_not_found')
        : getErrorMessage(error, t('an_error_occured'));
    Alert.alert(t('error'), message);
  };

  const resolveScannedIdentifier = async (
    identifier: { nfcId?: string; barCode?: string },
    lookup: () => Promise<AssetMiniDTO>,
    missingMessage: string
  ) => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    setIsResolving(true);
    try {
      const asset = await lookup();
      handleAssetFound(asset);
    } catch (error) {
      handleLookupFailure(error, identifier, missingMessage);
    } finally {
      resolvingRef.current = false;
      setIsResolving(false);
    }
  };

  useEffect(() => {
    void loadLicense();
  }, [loadLicense]);

  if (isCheckingLicense)
    return <AsyncStateFeedback mode="loading" message={t('loading')} />;

  if (licenseLoadError)
    return (
      <AsyncStateFeedback
        mode="error"
        message={t('license_load_error')}
        onRetry={() => void loadLicense()}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {isResolving ? (
        <AsyncStateFeedback mode="loading" message={t('looking_up_asset')} />
      ) : (
        <View>
          {isNfcEnabled && (
            <>
              <List.Item
                title={t('NFC')}
                description={t('nfc_hold_near_device')}
                left={(props) => <List.Icon {...props} icon="nfc" />}
                accessibilityRole="button"
                accessibilityLabel={t('NFC')}
                accessibilityHint={t('nfc_hold_near_device')}
                onPress={() => {
                  if (hasBarcodeNfcEntitlement)
                    navigation.navigate('SelectNfc', {
                      onChange: (nfcId) =>
                        resolveScannedIdentifier(
                          { nfcId },
                          () => dispatch(getAssetByNfc(nfcId)),
                          t('no_asset_found_nfc')
                        )
                    });
                  else showLicenseError();
                }}
              />
              <Divider />
            </>
          )}
          <List.Item
            title={t('barcode') + '/QR code'}
            description={t('scan_barcode_hint')}
            left={(props) => <List.Icon {...props} icon="barcode-scan" />}
            accessibilityRole="button"
            accessibilityLabel={t('barcode') + '/QR code'}
            accessibilityHint={t('scan_barcode_hint')}
            onPress={() => {
              if (hasBarcodeNfcEntitlement)
                navigation.navigate('SelectBarcode', {
                  onChange: (barCode) => {
                    resolveScannedIdentifier(
                      { barCode },
                      () => dispatch(getAssetByBarcode(barCode)),
                      t('no_asset_found_barcode')
                    );
                  }
                });
              else showLicenseError();
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({});
