import React, { useContext, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  SafeAreaView,
  Linking
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import {
  ActivityIndicator,
  Button,
  IconButton,
  Text
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../custom-theme';
import { CustomSnackBarContext } from '../contexts/CustomSnackBarContext';

interface Props {
  visible: boolean;
  onCapture: (uri: string) => void | Promise<void>;
  onClose: () => void;
}

export default function InAppCamera({ visible, onCapture, onClose }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const captureInProgress = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { showSnackBar } = useContext(CustomSnackBarContext);

  const askForCameraPermission = async () => {
    setRequestingPermission(true);
    try {
      await requestPermission();
    } catch (_error) {
      showSnackBar(t('camera_permission_error'), 'error');
    } finally {
      setRequestingPermission(false);
    }
  };

  React.useEffect(() => {
    if (
      visible &&
      permission &&
      !permission.granted &&
      permission.canAskAgain
    ) {
      void askForCameraPermission();
    }
  }, [visible, permission?.granted]);

  const handleCapture = async () => {
    if (!cameraRef.current || captureInProgress.current) return;
    captureInProgress.current = true;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      if (photo?.uri) {
        await onCapture(photo.uri);
      } else {
        showSnackBar(t('camera_capture_error'), 'error');
      }
    } catch (_error) {
      showSnackBar(t('camera_capture_error'), 'error');
    } finally {
      captureInProgress.current = false;
      setCapturing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      {permission?.granted ? (
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <SafeAreaView style={styles.overlay}>
            <View style={styles.topBar}>
              <IconButton
                icon="close"
                iconColor="white"
                size={30}
                onPress={onClose}
                accessibilityLabel={t('go_back')}
              />
              <IconButton
                icon="camera-flip-outline"
                iconColor="white"
                size={30}
                onPress={() =>
                  setFacing((f) => (f === 'back' ? 'front' : 'back'))
                }
                accessibilityLabel={t('switch_camera')}
              />
            </View>
            <View style={styles.captureRow}>
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  capturing && styles.captureButtonBusy
                ]}
                onPress={handleCapture}
                disabled={capturing}
                accessibilityRole="button"
                accessibilityLabel={t('take_photo')}
                accessibilityState={{ busy: capturing, disabled: capturing }}
              >
                {capturing && (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                    accessibilityLabel={t('loading')}
                  />
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      ) : permission ? (
        <View
          style={[
            styles.noAccess,
            { backgroundColor: theme.colors.background }
          ]}
        >
          <Text
            variant="titleMedium"
            style={[styles.noAccessText, { color: theme.colors.onSurface }]}
          >
            {t('no_access_to_camera')}
          </Text>
          {permission.canAskAgain ? (
            <Button
              mode="contained"
              loading={requestingPermission}
              disabled={requestingPermission}
              onPress={() => void askForCameraPermission()}
              style={styles.permissionAction}
            >
              {t('allow')}
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={() =>
                void Linking.openSettings().catch(() =>
                  showSnackBar(t('camera_settings_error'), 'error')
                )
              }
              style={styles.permissionAction}
            >
              {t('open_settings')}
            </Button>
          )}
          <Button mode="text" onPress={onClose}>
            {t('go_back')}
          </Button>
        </View>
      ) : (
        <View
          style={[
            styles.noAccess,
            { backgroundColor: theme.colors.background }
          ]}
          accessibilityRole="progressbar"
          accessibilityLabel={t('loading')}
        >
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            {t('loading')}
          </Text>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'space-between'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  captureRow: {
    alignItems: 'center',
    paddingBottom: 50
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)'
  },
  captureButtonBusy: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  noAccess: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  noAccessText: { fontSize: 16, marginBottom: 12 },
  permissionAction: { marginBottom: 8 }
});
