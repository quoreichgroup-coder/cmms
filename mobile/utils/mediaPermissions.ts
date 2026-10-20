import { logSafeError } from './safeErrorLog';
import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import i18n from '../i18n/i18n';
import {
  getImageLibraryOptions,
  shouldRequestPhotoLibraryPermission
} from './mediaPickerPlatform';

type PermissionResponseLike = {
  granted: boolean;
  canAskAgain: boolean;
  status?: string;
};

interface PermissionFlowOptions {
  flow: string;
  permissionNameKey: 'camera' | 'media_library';
  requestPermission: () => Promise<PermissionResponseLike>;
  getPermission: () => Promise<PermissionResponseLike>;
  presentAlerts?: boolean;
}

export const ensurePermission = async ({
  permissionNameKey,
  requestPermission,
  getPermission,
  presentAlerts = true
}: PermissionFlowOptions): Promise<boolean> => {
  const permissionName = i18n.t(permissionNameKey);

  try {
    const result = await requestPermission();

    if (result.granted) {
      return true;
    }

    const latest = await getPermission();

    if (!presentAlerts) {
      return false;
    }

    if (!latest.canAskAgain) {
      Alert.alert(
        i18n.t('permission_required_title'),
        i18n.t('permission_required_message', { permission: permissionName }),
        [
          { text: i18n.t('cancel'), style: 'cancel' },
          {
            text: i18n.t('open_settings'),
            onPress: () => Linking.openSettings()
          }
        ]
      );
    } else {
      Alert.alert(
        i18n.t('permission_denied_title'),
        i18n.t('permission_denied_message', { permission: permissionName }),
        [{ text: i18n.t('ok') }]
      );
    }

    return false;
  } catch (error) {
    logSafeError('Mobile operation failed', error);
    if (presentAlerts) {
      Alert.alert(
        i18n.t('error'),
        i18n.t('unable_to_request_permission', { permission: permissionName })
      );
    }
    return false;
  }
};

export const openCameraWithPermission = async (
  flow: string,
  options: ImagePicker.ImagePickerOptions
): Promise<ImagePicker.ImagePickerResult | null> => {
  const hasPermission = await ensurePermission({
    flow,
    permissionNameKey: 'camera',
    requestPermission: ImagePicker.requestCameraPermissionsAsync,
    getPermission: ImagePicker.getCameraPermissionsAsync
  });

  if (!hasPermission) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync(options);
  return result;
};

export const openLibraryWithPermission = async (
  flow: string,
  options: ImagePicker.ImagePickerOptions
): Promise<ImagePicker.ImagePickerResult | null> => {
  const hasPermission = shouldRequestPhotoLibraryPermission(Platform.OS)
    ? await ensurePermission({
        flow,
        permissionNameKey: 'media_library',
        requestPermission: ImagePicker.requestMediaLibraryPermissionsAsync,
        getPermission: ImagePicker.getMediaLibraryPermissionsAsync
      })
    : true;

  if (!hasPermission) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync(
    getImageLibraryOptions(Platform.OS, options)
  );
  return result;
};

export const ensureScannerCameraPermission = async (
  flow: string
): Promise<boolean> => {
  return ensurePermission({
    flow,
    permissionNameKey: 'camera',
    requestPermission: Camera.requestCameraPermissionsAsync,
    getPermission: Camera.getCameraPermissionsAsync,
    // SelectBarcodeModal owns the scanner-specific recovery UI.
    presentAlerts: false
  });
};
