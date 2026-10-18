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
import { deleteLocation, getLocationDetails } from '../../../slices/location';
import LocationDetails from './LocationDetails';
import { TabBar, TabView } from 'react-native-tab-view';
import LocationWorkOrders from './LocationWorkOrders';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import LocationAssets from './LocationAssets';
import LocationFiles from './LocationFiles';
import AsyncStateFeedback from '../../../components/AsyncStateFeedback';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/role';

export default function LocationDetailsHome({
  navigation,
  route
}: RootStackScreenProps<'LocationDetails'>) {
  const { id, locationProp } = route.params;

  const { t, i18n } = useTranslation();
  const { locationInfos } = useSelector((state) => state.locations);
  const location = locationInfos[id]?.location ?? locationProp;
  const dispatch = useDispatch();
  const theme = useTheme();
  const layout = useWindowDimensions();
  const [tabIndex, setTabIndex] = useState(0);
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = React.useRef(false);
  const [loadingLocation, setLoadingLocation] = useState(!location);
  const [locationLoadError, setLocationLoadError] = useState(false);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { hasEditPermission, hasDeletePermission, hasCreatePermission } =
    useAuth();
  const canOpenLocationActions = Boolean(
    location &&
      (hasEditPermission(PermissionEntity.LOCATIONS, location) ||
        hasDeletePermission(PermissionEntity.LOCATIONS, location) ||
        hasCreatePermission(PermissionEntity.WORK_ORDERS) ||
        hasCreatePermission(PermissionEntity.ASSETS))
  );
  const tabs = React.useMemo(
    () => [
      { key: 'details', title: t('details') },
      { key: 'work-orders', title: t('work_orders') },
      { key: 'files', title: t('files') },
      { key: 'assets', title: t('assets') }
    ],
    [i18n.language, t]
  );
  const renderScene = ({ route, jumpTo }) => {
    switch (route.key) {
      case 'details':
        return <LocationDetails location={location} />;
      case 'work-orders':
        return (
          <LocationWorkOrders location={location} navigation={navigation} />
        );
      case 'assets':
        return <LocationAssets location={location} navigation={navigation} />;
      case 'files':
        return <LocationFiles location={location} />;
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

  const loadLocation = useCallback(async () => {
    setLoadingLocation(true);
    setLocationLoadError(false);
    try {
      await dispatch(getLocationDetails(id));
    } catch (_error) {
      setLocationLoadError(true);
    } finally {
      setLoadingLocation(false);
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!locationProp) void loadLocation();
  }, [locationProp, loadLocation]);
  useEffect(() => {
    navigation.setOptions({
      // Keep the compact location identifier in the app bar; the full name is
      // shown in the location details panel.
      title: location?.customId || t('location'),
      headerRight: () =>
        canOpenLocationActions && location ? (
          <IconButton
            icon="dots-vertical"
            accessibilityLabel={t('more_options')}
            onPress={() => {
              SheetManager.show('location-details-sheet', {
                payload: {
                  onEdit: () =>
                    navigation.navigate('EditLocation', { location }),
                  onDelete: () => setOpenDelete(true),
                  onCreateWorkOrder: () =>
                    navigation.push('AddWorkOrder', { location }),
                  onCreateAsset: () =>
                    navigation.push('AddAsset', { location }),
                  location
                }
              });
            }}
          />
        ) : null
    });
  }, [canOpenLocationActions, location, navigation, t]);

  const onDeleteSuccess = () => {
    showSnackBar(t('location_delete_success'), 'success');
    navigation.goBack();
  };
  const onDeleteFailure = (err) =>
    showSnackBar(t('location_delete_failure'), 'error');

  const handleDelete = async () => {
    if (deletingRef.current || !location) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await dispatch(deleteLocation(location.id));
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
            <Text variant="bodyMedium">{t('confirm_delete_location')}</Text>
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
  if (location)
    return (
      <View style={styles.container}>
        {renderConfirmDelete()}
        {locationLoadError && (
          <AsyncStateFeedback
            mode="banner"
            message={t('location_details_load_error')}
            onRetry={() => void loadLocation()}
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
  else if (loadingLocation)
    return <AsyncStateFeedback mode="loading" message={t('please_wait')} />;
  else
    return (
      <AsyncStateFeedback
        mode="error"
        message={t('location_details_load_error')}
        onRetry={() => void loadLocation()}
      />
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
