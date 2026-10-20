import { Alert, AppState, Platform, StyleSheet } from 'react-native';
import { View } from '../../components/Themed';
import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { RootStackScreenProps } from '../../types';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { getAssetScanNfcTechnologies } from '../../utils/nfc';

type NfcModule = typeof import('react-native-nfc-manager');

const nfcModule: NfcModule | null =
  Platform.OS === 'android' || Platform.OS === 'ios'
    ? (require('react-native-nfc-manager') as NfcModule)
    : null;

const NfcManager = nfcModule?.default;
const NfcTech = nfcModule?.NfcTech;

export default function SelectNfcModal({
  navigation,
  route
}: RootStackScreenProps<'SelectNfc'>) {
  const { onChange } = route.params;
  const { t } = useTranslation();
  const theme = useTheme();

  const readNdef = useCallback(async () => {
    try {
      await NfcManager.requestTechnology(
        getAssetScanNfcTechnologies(NfcTech, Platform.OS)
      );
      const tag = await NfcManager.getTag();
      return tag?.id || null;
    } finally {
      // Always clean up
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!NfcManager || !NfcTech) {
      Alert.alert(t('error'), t('no nfc support'), [
        { text: t('ok'), onPress: () => navigation.goBack() }
      ]);
      return;
    }

    let disposed = false;
    let isForeground = AppState.currentState === 'active';
    let scanInFlight = false;
    let isTerminal = false;
    let generation = 0;

    const scan = async (): Promise<void> => {
      if (disposed || !isForeground || scanInFlight || isTerminal) return;

      scanInFlight = true;
      const currentGeneration = ++generation;
      const isCurrent = () =>
        !disposed && isForeground && currentGeneration === generation;

      try {
        await NfcManager.start();
        if (!isCurrent()) return;

        const supported = await NfcManager.isSupported();
        if (!isCurrent()) return;
        if (!supported) {
          isTerminal = true;
          Alert.alert(t('error'), t('no nfc support'), [
            { text: t('ok'), onPress: () => navigation.goBack() }
          ]);
          return;
        }

        const enabled = await NfcManager.isEnabled();
        if (!isCurrent()) return;
        if (!enabled) {
          isTerminal = true;
          Alert.alert(t('error'), t('nfc_disabled'), [
            { text: t('ok'), onPress: () => navigation.goBack() }
          ]);
          return;
        }

        const tagId = await readNdef();
        if (!isCurrent()) return;
        if (tagId) {
          isTerminal = true;
          navigation.goBack();
          onChange(tagId);
        } else {
          isTerminal = true;
          Alert.alert(t('error'), t('tag_not_found'), [
            { text: t('ok'), onPress: () => navigation.goBack() }
          ]);
        }
      } catch (error) {
        console.warn('NFC Error:', error);
        if (!isCurrent()) return;
        isTerminal = true;
        Alert.alert(t('error'), t('an_error_occured'), [
          { text: t('ok'), onPress: () => navigation.goBack() }
        ]);
      } finally {
        scanInFlight = false;
        if (!disposed && isForeground && !isTerminal) void scan();
      }
    };

    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState !== 'active') {
          isForeground = false;
          generation += 1;
          NfcManager.cancelTechnologyRequest().catch(() => {});
          return;
        }

        isForeground = true;
        if (!scanInFlight) void scan();
      }
    );

    if (isForeground) void scan();

    return () => {
      disposed = true;
      isForeground = false;
      generation += 1;
      appStateSubscription.remove();
      NfcManager?.cancelTechnologyRequest().catch(() => {});
    };
  }, [navigation, onChange, readNdef, t]);

  return (
    <View style={styles.container}>
      <Text
        style={styles.title}
        variant="titleLarge"
        accessibilityRole="header"
      >
        {t('scanning')}
      </Text>
      <Text
        style={[styles.instruction, { color: theme.colors.onSurfaceVariant }]}
        variant="bodyMedium"
      >
        {t('nfc_hold_near_device')}
      </Text>
      <ActivityIndicator
        size="large"
        accessibilityRole="progressbar"
        accessibilityLabel={t('scanning')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28
  },
  title: {
    marginBottom: 10,
    textAlign: 'center'
  },
  instruction: {
    maxWidth: 300,
    marginBottom: 24,
    textAlign: 'center'
  }
});
