import {
  Linking,
  StyleSheet,
  useWindowDimensions
} from 'react-native';

import { View } from '../../components/Themed';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';
import { CameraView } from 'expo-camera';
import { ensureScannerCameraPermission } from '../../utils/mediaPermissions';

export default function SelectBarcodeModal({
  navigation,
  route
}: RootStackScreenProps<'SelectBarcode'>) {
  const { onChange } = route.params;
  const { t } = useTranslation();
  const theme = useTheme();
  const [scanned, setScanned] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
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

  const handleBarCodeScanned = ({
    type,
    data
  }: {
    type: string;
    data: string;
  }) => {
    if (!scanned) {
      console.warn(
        '[SelectBarcodeModal] Barcode scanned',
        JSON.stringify({ type })
      );
      setScanned(true);
      navigation.goBack();
      onChange(data);
    }
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
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.surface,
          padding: 20,
          borderRadius: 10,
          borderColor: theme.colors.outlineVariant,
          borderWidth: 1
        }}
      >
        <Text
          variant={'titleLarge'}
          style={{ color: theme.colors.onSurface }}
        >
          {t('no_access_to_camera')}
        </Text>
        <Button
          mode="contained-tonal"
          onPress={async () => {
            console.warn('[SelectBarcodeModal] Retry permission');
            const granted = await ensureScannerCameraPermission(
              'SelectBarcodeModal'
            );
            setHasPermission(granted);
          }}
        >
          {t('camera')}
        </Button>
        <Button
          mode="text"
          onPress={() => Linking.openSettings()}
        >
          {t('open_settings')}
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={handleBarCodeScanned}
        style={{ width: layout.width, height: layout.height }}
      />
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
  }
});
