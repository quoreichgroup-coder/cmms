import {
  Alert,
  AppState,
  Linking,
  StyleSheet,
  useWindowDimensions
} from 'react-native';

import { View } from '../../components/Themed';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { Camera, CameraView } from 'expo-camera';
import { ensureScannerCameraPermission } from '../../utils/mediaPermissions';
import CameraPreviewError from '../../components/CameraPreviewError';
import CameraPermissionError from '../../components/CameraPermissionError';

export default function SelectBarcodeModal({
  navigation,
  route
}: RootStackScreenProps<'SelectBarcode'>) {
  const { onChange } = route.params;
  const { t } = useTranslation();
  const theme = useTheme();
  const scanHandledRef = useRef(false);
  const permissionRequestRef = useRef(false);
  const openedSettingsRef = useRef(false);
  const appIsActiveRef = useRef(AppState.currentState === 'active');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [cameraMountError, setCameraMountError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === 'active'
  );
  const layout = useWindowDimensions();

  useEffect(() => {
    let mounted = true;

    const requestPermission = async () => {
      console.warn(
        '[SelectBarcodeModal] Tap/screen open -> request camera permission'
      );
      const granted = await ensureScannerCameraPermission('SelectBarcodeModal');
      if (mounted) {
        setHasPermission(granted);
      }
    };

    requestPermission();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      hasPermission !== true ||
      cameraMountError ||
      cameraReady ||
      !isAppActive
    ) {
      return;
    }

    const timeout = setTimeout(() => setCameraMountError(true), 12000);
    return () => clearTimeout(timeout);
  }, [cameraMountError, cameraReady, hasPermission, isAppActive]);

  useEffect(() => {
    let mounted = true;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const isActive = nextState === 'active';
      appIsActiveRef.current = isActive;
      setIsAppActive(isActive);
      if (!isActive) {
        setCameraReady(false);
        return;
      }
      if (!openedSettingsRef.current) return;
      openedSettingsRef.current = false;
      void Camera.getCameraPermissionsAsync()
        .then((permission) => {
          if (!mounted) return;
          setHasPermission(permission.granted);
          if (permission.granted) {
            setCameraReady(false);
            setCameraMountError(false);
          }
        })
        .catch(() => {
          if (mounted) setHasPermission(false);
        });
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const handleBarCodeScanned = ({
    type,
    data
  }: {
    type: string;
    data: string;
  }) => {
    if (!appIsActiveRef.current || scanHandledRef.current) return;
    scanHandledRef.current = true;
    console.warn(
      '[SelectBarcodeModal] Barcode scanned',
      JSON.stringify({ type })
    );
    navigation.goBack();
    onChange(data);
  };

  if (hasPermission === null) {
    return (
      <View
        style={[
          styles.permissionState,
          {
            backgroundColor: theme.colors.background,
            alignItems: 'center',
            justifyContent: 'center'
          }
        ]}
        accessibilityRole="progressbar"
        accessibilityLabel={t('loading')}
      >
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
          {t('loading')}
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <CameraPermissionError
        retrying={isRequestingPermission}
        onRetry={async () => {
          if (permissionRequestRef.current) return;
          permissionRequestRef.current = true;
          setIsRequestingPermission(true);
          try {
            const granted = await ensureScannerCameraPermission(
              'SelectBarcodeModal'
            );
            setHasPermission(granted);
          } finally {
            permissionRequestRef.current = false;
            setIsRequestingPermission(false);
          }
        }}
        onOpenSettings={() => {
          openedSettingsRef.current = true;
          void Linking.openSettings().catch(() => {
            openedSettingsRef.current = false;
            Alert.alert(t('error'), t('camera_settings_error'));
          });
        }}
        onClose={() => navigation.goBack()}
      />
    );
  }

  if (cameraMountError) {
    return (
      <CameraPreviewError
        onRetry={() => {
          setCameraReady(false);
          setCameraMountError(false);
        }}
        onOpenSettings={() => {
          openedSettingsRef.current = true;
          void Linking.openSettings().catch(() => {
            openedSettingsRef.current = false;
            Alert.alert(t('error'), t('camera_settings_error'));
          });
        }}
        onClose={() => navigation.goBack()}
      />
    );
  }

  return (
    <View style={styles.container}>
      {isAppActive ? (
        <CameraView
          facing="back"
          mode="picture"
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr',
              'ean13',
              'ean8',
              'code128',
              'code39',
              'code93',
              'itf14',
              'codabar',
              'upc_a',
              'upc_e',
              'pdf417',
              'aztec',
              'datamatrix'
            ]
          }}
          onBarcodeScanned={handleBarCodeScanned}
          style={StyleSheet.absoluteFill}
          active={isAppActive}
          onCameraReady={() => {
            if (appIsActiveRef.current) setCameraReady(true);
          }}
          accessibilityLabel={`${t('barcode')}/QR code`}
          accessibilityHint={t('scanning')}
          onMountError={(event) => {
            if (!appIsActiveRef.current) return;
            console.error(
              '[SelectBarcodeModal] Camera preview mount failed',
              event.message
            );
            setCameraReady(false);
            setCameraMountError(true);
          }}
        />
      ) : (
        <View pointerEvents="none" style={styles.cameraPaused} />
      )}
      {!cameraReady ? (
        <View
          pointerEvents="none"
          style={styles.cameraStarting}
          accessibilityRole="progressbar"
          accessibilityLabel={t('camera_preview_loading')}
        >
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.scanHintText}>{t('camera_preview_loading')}</Text>
        </View>
      ) : (
        <View pointerEvents="none" style={styles.scanOverlay}>
          <View
            style={[
              styles.scanFrame,
              {
                width: Math.min(layout.width * 0.78, layout.height * 0.5, 320)
              }
            ]}
          />
          <View style={styles.scanHint}>
            <Text style={styles.scanHintText}>{t('scanning')}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  permissionState: {
    flex: 1,
    padding: 20
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cameraStarting: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(13,18,32,0.55)'
  },
  cameraPaused: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D1220'
  },
  scanFrame: {
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.94)',
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 4
  },
  scanHint: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(13,18,32,0.84)'
  },
  scanHintText: {
    color: '#FFFFFF'
  }
});
