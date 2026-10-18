import { StyleSheet, useWindowDimensions } from 'react-native';

import { View } from '../../../components/Themed';
import { RootStackScreenProps } from '../../../types';
import { useDispatch, useSelector } from '../../../store';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { useCallback, useContext, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  IconButton,
  Portal,
  Text,
  useTheme
} from 'react-native-paper';
import { SheetManager } from 'react-native-actions-sheet';
import { deleteAsset, getAssetDetails } from '../../../slices/asset';
import AssetDetails from './AssetDetails';
import { TabBar, TabView } from 'react-native-tab-view';
import AssetWorkOrders from './AssetWorkOrders';
import AssetFiles from './AssetFiles';
import AssetParts from './AssetParts';
import AssetMaintenance from './AssetMaintenance';
import AssetInspections from './AssetInspections';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import AsyncStateFeedback from '../../../components/AsyncStateFeedback';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/role';
import { getAssetDetailsActionVisibility } from '../../../utils/assetDetailsAccess';

export default function AssetDetailsHome({
  navigation,
  route
}: RootStackScreenProps<'AssetDetails'>) {
  const { id, assetProp } = route.params;

  const { t, i18n } = useTranslation();
  const { assetInfos } = useSelector((state) => state.assets);
  const asset = assetInfos[id]?.asset ?? assetProp;
  const dispatch = useDispatch();
  const theme = useTheme();
  const layout = useWindowDimensions();
  const [tabIndex, setTabIndex] = useState(0);
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = React.useRef(false);
  const [loadingAsset, setLoadingAsset] = useState(!asset);
  const [assetLoadError, setAssetLoadError] = useState(false);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { hasEditPermission, hasDeletePermission, hasCreatePermission } =
    useAuth();
  const assetActionVisibility = getAssetDetailsActionVisibility({
    canEditAsset: !!asset && hasEditPermission(PermissionEntity.ASSETS, asset),
    canCreateWorkOrder: hasCreatePermission(PermissionEntity.WORK_ORDERS),
    canCreateChildAsset: hasCreatePermission(PermissionEntity.ASSETS),
    canDeleteAsset:
      !!asset && hasDeletePermission(PermissionEntity.ASSETS, asset)
  });
  const tabs = React.useMemo(
    () => [
      { key: 'details', title: t('details') },
      { key: 'work-orders', title: t('work_orders') },
      { key: 'inspections', title: t('asset_inspections') },
      { key: 'maintenance', title: t('asset_maintenance') },
      { key: 'files', title: t('files') },
      { key: 'parts', title: t('parts') }
    ],
    [i18n.language, t]
  );
  const renderScene = ({ route, jumpTo }) => {
    switch (route.key) {
      case 'details':
        return <AssetDetails asset={asset} navigation={navigation} />;
      case 'work-orders':
        return <AssetWorkOrders asset={asset} navigation={navigation} />;
      case 'inspections':
        return <AssetInspections asset={asset} navigation={navigation} />;
      case 'maintenance':
        return <AssetMaintenance asset={asset} navigation={navigation} />;
      case 'files':
        return <AssetFiles asset={asset} />;
      case 'parts':
        return <AssetParts asset={asset} navigation={navigation} />;
    }
  };
  const renderTabBar = (props) => (
    <TabBar
      {...props}
      scrollEnabled
      activeColor={theme.colors.primary}
      inactiveColor={theme.colors.onSurfaceVariant}
      indicatorStyle={{ backgroundColor: theme.colors.primary, height: 3 }}
      labelStyle={{ fontSize: 14, fontWeight: '600', textTransform: 'none' }}
      pressColor={theme.colors.primaryContainer}
      style={{ backgroundColor: theme.colors.surface, elevation: 0 }}
      tabStyle={{ minWidth: 80, paddingHorizontal: 8 }}
    />
  );

  const loadAsset = useCallback(async () => {
    setLoadingAsset(true);
    setAssetLoadError(false);
    try {
      await dispatch(getAssetDetails(id));
    } catch (_error) {
      setAssetLoadError(true);
    } finally {
      setLoadingAsset(false);
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!assetProp) void loadAsset();
  }, [assetProp, loadAsset]);
  useEffect(() => {
    navigation.setOptions({
      // Keep the compact equipment identifier in the app bar; the full name is
      // already shown prominently in the first details card below the tabs.
      title: asset?.customId || t('asset'),
      headerRight: () =>
        asset && assetActionVisibility.hasAnyAction ? (
          <IconButton
            icon="dots-vertical"
            accessibilityLabel={t('more_options')}
            onPress={() => {
              SheetManager.show('asset-details-sheet', {
                payload: {
                  onEdit: () => navigation.navigate('EditAsset', { asset }),
                  onDelete: () => setOpenDelete(true),
                  onCreateWorkOrder: () =>
                    navigation.push('AddWorkOrder', { asset }),
                  onCreateChildAsset: () =>
                    navigation.push('AddAsset', { parentAsset: asset }),
                  asset
                }
              });
            }}
          />
        ) : null
    });
  }, [asset, assetActionVisibility.hasAnyAction, navigation, t]);

  const onDeleteSuccess = () => {
    showSnackBar(t('asset_remove_success'), 'success');
    navigation.goBack();
  };
  const onDeleteFailure = (err) =>
    showSnackBar(t('asset_remove_failure'), 'error');

  const handleDelete = async () => {
    if (deletingRef.current || !asset) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await dispatch(deleteAsset(asset.id));
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
            <Text variant="bodyMedium">{t('confirm_delete_asset')}</Text>
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
  if (asset)
    return (
      <View style={styles.container}>
        {renderConfirmDelete()}
        {assetLoadError && (
          <AsyncStateFeedback
            mode="banner"
            message={t('asset_details_load_error')}
            onRetry={() => void loadAsset()}
          />
        )}
        <TabView
          renderTabBar={renderTabBar}
          navigationState={{ index: tabIndex, routes: tabs }}
          renderScene={renderScene}
          onIndexChange={setTabIndex}
          initialLayout={{ width: layout.width }}
        />
      </View>
    );
  else if (loadingAsset)
    return <AsyncStateFeedback mode="loading" message={t('please_wait')} />;
  else
    return (
      <AsyncStateFeedback
        mode="error"
        message={t('asset_details_load_error')}
        onRetry={() => void loadAsset()}
      />
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
